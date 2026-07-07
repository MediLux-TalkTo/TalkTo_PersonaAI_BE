import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type {
  AiAnalysisTranscriptionMode,
  AiAnalysisTranscriptionRequest,
  AiAnalysisTranscriptionResponse,
  AiIntakeContext,
} from '../ai/ai-analysis-transcription.types';
import { AiClientService } from '../ai/ai-client.service';
import { AiServerHttpError } from '../ai/ai-server-http.error';
import { ConsentFeature } from '../common/enums/consent.enums';
import { Recording } from '../recordings/recording.entity';
import { AudioStorageService } from '../storage/audio-storage.service';
import { Subject } from '../subjects/subject.entity';
import { PersonaIntake } from '../voice-persona/persona-intake.entity';
import { TargetVoiceSample } from '../voice-persona/target-voice-sample.entity';
import { VoicePersonaApplication } from '../voice-persona/voice-persona-application.entity';
import {
  aiFailureMessage,
  canRetryWithFreshAudioUrl,
  normalizedAiFailureCode,
} from './analysis-ai-failure';
import { AnalysisJob } from './analysis-job.entity';
import { AnalysisWorkerTransitionsService } from './analysis-worker-transitions.service';
import {
  buildGlossaryTerms,
  buildSubjectContext,
  mapIntakeContext,
} from './analysis-transcription-context';

const ANALYSIS_AUDIO_URL_MIN_TTL_SECONDS = 30 * 60;
const DEFAULT_TRANSCRIPTION_LANGUAGE = 'ko';
const BACKEND_AI_WORKER_ID = 'backend-ai-transcription';

type AnalysisTranscriptionContext = {
  readonly job: AnalysisJob;
  readonly recording: Recording;
  readonly subject: Subject;
  readonly glossaryTerms: readonly string[];
  readonly intakeContext: AiIntakeContext | null;
};

@Injectable()
export class AnalysisAiTranscriptionService {
  constructor(
    @InjectRepository(AnalysisJob)
    private readonly jobsRepository: Repository<AnalysisJob>,
    @InjectRepository(Recording)
    private readonly recordingsRepository: Repository<Recording>,
    @InjectRepository(Subject)
    private readonly subjectsRepository: Repository<Subject>,
    @InjectRepository(VoicePersonaApplication)
    private readonly applicationsRepository: Repository<VoicePersonaApplication>,
    @InjectRepository(PersonaIntake)
    private readonly intakesRepository: Repository<PersonaIntake>,
    @InjectRepository(TargetVoiceSample)
    private readonly samplesRepository: Repository<TargetVoiceSample>,
    private readonly audioStorageService: AudioStorageService,
    private readonly aiClientService: AiClientService,
    private readonly workerTransitionsService: AnalysisWorkerTransitionsService,
  ) {}

  async buildTranscriptionRequest(
    jobId: string,
    mode: AiAnalysisTranscriptionMode = 'full',
  ): Promise<AiAnalysisTranscriptionRequest> {
    const context = await this.loadContext(jobId);
    return this.buildRequestFromContext(context, mode);
  }

  async requestTranscription(
    jobId: string,
    mode: AiAnalysisTranscriptionMode = 'full',
  ): Promise<AiAnalysisTranscriptionResponse> {
    const context = await this.loadContext(jobId);
    const firstRequest = await this.buildRequestFromContext(context, mode);

    try {
      return await this.sendRequest(firstRequest, context);
    } catch (error) {
      if (canRetryWithFreshAudioUrl(error)) {
        const retryRequest = await this.buildRequestFromContext(context, mode);
        return this.sendRequest(retryRequest, context);
      }
      throw error;
    }
  }

  async requestAndPersistTranscription(
    jobId: string,
    mode: AiAnalysisTranscriptionMode = 'full',
  ): Promise<AnalysisJob> {
    await this.workerTransitionsService.markPreprocessing(jobId, {
      workerId: BACKEND_AI_WORKER_ID,
    });

    try {
      const response = await this.requestTranscription(jobId, mode);
      return this.workerTransitionsService.markStt(jobId, {
        segments: response.segments.map((segment, index) => ({
          segmentIndex: segment.segmentIndex ?? index,
          startMs: segment.startMs,
          endMs: segment.endMs,
          speakerLabel: segment.speakerLabel,
          transcriptText: this.transcriptText(segment),
          correctedText: segment.correctedText ?? null,
          needsReview: segment.needsReview ?? false,
          confidence: segment.confidence,
        })),
      });
    } catch (error) {
      if (error instanceof AiServerHttpError) {
        return this.markAiFailure(jobId, error);
      }
      throw error;
    }
  }

  private async sendRequest(
    request: AiAnalysisTranscriptionRequest,
    context: AnalysisTranscriptionContext,
  ): Promise<AiAnalysisTranscriptionResponse> {
    const response = await this.aiClientService.requestAnalysisTranscription(request, {
      ownerUserId: context.job.ownerUserId,
      subjectId: context.job.subjectId,
      feature: ConsentFeature.MEMORIES,
    });
    if (!response) {
      throw new ServiceUnavailableException({
        code: 'ai_server_not_configured',
        message: 'AI_SERVER_URL is required to run analysis transcription.',
      });
    }
    return response;
  }

  private async buildRequestFromContext(
    context: AnalysisTranscriptionContext,
    mode: AiAnalysisTranscriptionMode,
  ): Promise<AiAnalysisTranscriptionRequest> {
    if (!context.recording.storageKey) {
      throw new BadRequestException({
        code: 'recording_audio_missing',
        message: 'Recording storage key is required for AI transcription.',
      });
    }

    const playback = await this.audioStorageService.createPlaybackUrl(
      context.recording.storageKey,
      ANALYSIS_AUDIO_URL_MIN_TTL_SECONDS,
    );

    return {
      jobId: context.job.id,
      recordingId: context.recording.id,
      audioUrl: playback.playbackUrl,
      audioMimeType: context.recording.mimeType,
      mode,
      language: context.subject.localeHint ?? DEFAULT_TRANSCRIPTION_LANGUAGE,
      speakerDiarization: true,
      glossary: context.glossaryTerms,
      subjectContext: buildSubjectContext(context),
      intakeContext: context.intakeContext,
    };
  }

  private async loadContext(jobId: string): Promise<AnalysisTranscriptionContext> {
    const job = await this.jobsRepository.findOne({ where: { id: jobId } });
    if (!job) {
      throw new BadRequestException({
        code: 'analysis_job_not_found',
        message: 'Analysis job not found.',
      });
    }

    const recording = await this.recordingsRepository.findOne({
      where: { id: job.recordingId, ownerUserId: job.ownerUserId },
    });
    if (!recording) {
      throw new BadRequestException({
        code: 'recording_not_found',
        message: 'Recording not found for analysis job.',
      });
    }

    const subject = await this.subjectsRepository.findOne({
      where: { id: job.subjectId, ownerUserId: job.ownerUserId },
      relations: ['glossaryTerms'],
    });
    if (!subject) {
      throw new BadRequestException({
        code: 'subject_not_found',
        message: 'Subject not found for analysis job.',
      });
    }

    const glossaryTerms = buildGlossaryTerms(subject.glossaryTerms ?? []);
    return {
      job,
      recording,
      subject,
      glossaryTerms,
      intakeContext: await this.buildIntakeContext(job, glossaryTerms, subject.displayName),
    };
  }

  private async buildIntakeContext(
    job: AnalysisJob,
    glossaryTerms: readonly string[],
    subjectName: string,
  ): Promise<AiIntakeContext | null> {
    const application = await this.applicationsRepository.findOne({
      where: {
        ownerUserId: job.ownerUserId,
        subjectId: job.subjectId,
        intakeStatus: 'submitted',
      },
      order: { submittedAt: 'DESC', createdAt: 'DESC' },
    });
    if (!application) {
      return null;
    }

    const intake = await this.intakesRepository.findOne({
      where: { applicationId: application.id, status: 'submitted' },
    });
    if (!intake) {
      return null;
    }

    const sample = await this.samplesRepository.findOne({
      where: { applicationId: application.id },
      order: { createdAt: 'DESC' },
    });
    return mapIntakeContext({ intake, glossaryTerms, subjectName, sample });
  }

  private transcriptText(segment: {
    readonly transcriptText?: string;
    readonly text?: string;
  }): string {
    const text = segment.transcriptText ?? segment.text;
    if (!text) {
      throw new BadRequestException({
        code: 'ai_transcription_segment_text_missing',
        message: 'AI transcription segment is missing transcript text.',
      });
    }
    return text;
  }

  private markAiFailure(jobId: string, error: AiServerHttpError): Promise<AnalysisJob> {
    return this.workerTransitionsService.markFailed(jobId, {
      failureCode: normalizedAiFailureCode(error.code),
      failureMessage: aiFailureMessage(error.code),
    });
  }
}
