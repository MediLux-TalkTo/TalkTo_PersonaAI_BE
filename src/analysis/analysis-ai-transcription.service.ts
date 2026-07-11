import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type {
  AiAnalysisTranscriptionMode,
  AiAnalysisTranscriptionRequest,
  AiAnalysisTranscriptionResponse,
  AiIntakeContext,
  AiRecordingAnalysisResponse,
} from '../ai/ai-analysis-transcription.types';
import { AiClientService } from '../ai/ai-client.service';
import { AiServerHttpError } from '../ai/ai-server-http.error';
import { ConsentFeature } from '../common/enums/consent.enums';
import { Recording } from '../recordings/recording.entity';
import { AudioStorageService } from '../storage/audio-storage.service';
import { Subject } from '../subjects/subject.entity';
import { PersonaIntake } from '../voice-persona/persona-intake.entity';
import { PersonaBible } from '../voice-persona/persona-bible.entity';
import { PersonaReflection } from '../voice-persona/persona-reflection.entity';
import { TargetVoiceSample } from '../voice-persona/target-voice-sample.entity';
import { VoicePersonaReviewStatus } from '../voice-persona/voice-persona.constants';
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
import { MemorySegment } from './memory-segment.entity';
import { TranscriptSegment } from './transcript-segment.entity';

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
    @InjectRepository(TranscriptSegment)
    private readonly transcriptSegmentsRepository: Repository<TranscriptSegment>,
    @InjectRepository(MemorySegment)
    private readonly memorySegmentsRepository: Repository<MemorySegment>,
    @InjectRepository(PersonaReflection)
    private readonly reflectionsRepository: Repository<PersonaReflection>,
    @InjectRepository(PersonaBible)
    private readonly personaBiblesRepository: Repository<PersonaBible>,
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
      const sttJob = await this.workerTransitionsService.markStt(jobId, {
        subjectSpeakerLabel: response.subjectSpeakerLabel ?? null,
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
      if (mode === 'preview') {
        return sttJob;
      }
      await this.requestAndPersistRecordingAnalysis(
        jobId,
        response.subjectSpeakerLabel ?? sttJob.subjectSpeakerLabel ?? null,
      );
      return this.workerTransitionsService.markCompleted(jobId);
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
    const referenceVoiceSampleUrl = await this.referenceVoiceSampleUrl(context.job);

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
      ...(referenceVoiceSampleUrl ? { referenceVoiceSampleUrl } : {}),
    };
  }

  private async requestAndPersistRecordingAnalysis(
    jobId: string,
    subjectSpeakerLabel: string | null,
  ): Promise<void> {
    const context = await this.loadContext(jobId);
    const transcriptSegments = await this.transcriptSegmentsRepository.find({
      where: { jobId },
      order: { segmentIndex: 'ASC' },
    });
    if (transcriptSegments.length === 0) {
      return;
    }

    const analysis = await this.aiClientService.requestRecordingAnalysis(
      {
        jobId,
        recordingId: context.recording.id,
        transcriptSegments: transcriptSegments.map((segment) => ({
          id: segment.id,
          segmentIndex: segment.segmentIndex,
          startMs: segment.startMs,
          endMs: segment.endMs,
          speakerLabel: segment.speakerLabel,
          transcriptText: segment.correctedText ?? segment.transcriptText,
        })),
        subjectContext: buildSubjectContext(context),
        subjectSpeakerLabel,
        conversationPartnerName: context.recording.conversationPartnerName,
      },
      {
        ownerUserId: context.job.ownerUserId,
        subjectId: context.job.subjectId,
        feature: ConsentFeature.MEMORIES,
      },
    );
    if (!analysis) {
      throw new ServiceUnavailableException({
        code: 'ai_server_not_configured',
        message: 'AI_SERVER_URL is required to run recording analysis.',
      });
    }

    await this.persistRecordingAnalysis(context, analysis);
    await this.embedMemorySegments(context);
    await this.rebuildPersonaFromReflections(context);
  }

  private async persistRecordingAnalysis(
    context: AnalysisTranscriptionContext,
    analysis: AiRecordingAnalysisResponse,
  ): Promise<void> {
    context.recording.summary = analysis.summary ?? null;
    context.recording.summaryTags = [...(analysis.tags ?? [])];
    context.recording.speechStyle = analysis.speechStyle ?? null;
    context.recording.safetyFlags = [...(analysis.safetyFlags ?? [])];
    await this.recordingsRepository.save(context.recording);

    await this.workerTransitionsService.markRedaction(context.job.id);
    await this.workerTransitionsService.markSegmenting(context.job.id, {
      segments: analysis.memorySegments.map((segment) => ({
        segmentIndex: segment.segmentIndex,
        sourceTranscriptSegmentIds: [...segment.sourceTranscriptSegmentIds],
        startMs: segment.startMs,
        endMs: segment.endMs,
        speakerLabel: segment.speakerLabel,
        memoryText: segment.memoryText,
        confidence: segment.confidence,
        importanceScore: segment.importanceScore,
        tags: [...(segment.tags ?? [])],
        relatedPeople: [...(segment.relatedPeople ?? [])],
        sensitivityFlags: [...(segment.sensitivityFlags ?? [])],
      })),
    });
  }

  private async embedMemorySegments(
    context: AnalysisTranscriptionContext,
  ): Promise<void> {
    const memorySegments = await this.memorySegmentsRepository.find({
      where: { jobId: context.job.id },
      order: { segmentIndex: 'ASC' },
    });
    if (memorySegments.length === 0) {
      return;
    }

    const response = await this.aiClientService.requestEmbeddings(
      {
        jobId: context.job.id,
        items: memorySegments.map((segment, index) => ({
          memorySegmentId: segment.id,
          embeddingIndex: index,
          text: segment.memoryText,
        })),
      },
      {
        ownerUserId: context.job.ownerUserId,
        subjectId: context.job.subjectId,
        feature: ConsentFeature.MEMORIES,
      },
    );
    if (!response) {
      return;
    }
    const memoryById = new Map(memorySegments.map((segment) => [segment.id, segment]));
    const embeddings = response.embeddings.flatMap((embedding, index) => {
        const segment = memoryById.get(embedding.memorySegmentId);
        if (!segment) {
          return [];
        }
        return [
          {
            memorySegmentId: embedding.memorySegmentId,
            embeddingIndex: index,
            provider: response.provider ?? 'talkto-app-ai',
            model: response.model ?? 'text-embedding-3-small',
            dimensions: embedding.embedding.length,
            embedding: [...embedding.embedding],
          },
        ];
      });
    if (embeddings.length === 0) {
      return;
    }
    await this.workerTransitionsService.markIndexing(context.job.id, { embeddings });
  }

  private async rebuildPersonaFromReflections(
    context: AnalysisTranscriptionContext,
  ): Promise<void> {
    const memorySegments = await this.memorySegmentsRepository.find({
      where: { ownerUserId: context.job.ownerUserId, subjectId: context.job.subjectId },
      order: { updatedAt: 'DESC' },
      take: 200,
    });
    if (memorySegments.length === 0) {
      return;
    }
    const reflection = await this.aiClientService.reflectPersona(
      {
        subjectContext: buildSubjectContext(context),
        memories: memorySegments.map((segment) => ({
          id: segment.id,
          memoryText: segment.memoryText,
          tags: segment.tags ?? [],
          importanceScore: segment.importanceScore ?? 5,
        })),
      },
      {
        ownerUserId: context.job.ownerUserId,
        subjectId: context.job.subjectId,
        feature: ConsentFeature.VOICE_PERSONA,
      },
    );
    if (!reflection) {
      return;
    }
    await this.reflectionsRepository.delete({
      ownerUserId: context.job.ownerUserId,
      subjectId: context.job.subjectId,
    });
    const savedReflections = await this.reflectionsRepository.save(
      reflection.reflections.map((item) =>
        this.reflectionsRepository.create({
          ownerUserId: context.job.ownerUserId,
          subjectId: context.job.subjectId,
          insight: item.insight,
          category: item.category,
          evidenceMemoryIds: [...item.evidenceMemoryIds],
          importance: item.importance,
        }),
      ),
    );
    await this.assemblePersonaInstructions(context, savedReflections);
  }

  private async assemblePersonaInstructions(
    context: AnalysisTranscriptionContext,
    reflections: readonly PersonaReflection[],
  ): Promise<void> {
    const application = await this.applicationsRepository.findOne({
      where: {
        ownerUserId: context.job.ownerUserId,
        subjectId: context.job.subjectId,
        intakeStatus: 'submitted',
      },
      order: { submittedAt: 'DESC', createdAt: 'DESC' },
    });
    if (!application) {
      return;
    }
    const intake = await this.intakesRepository.findOne({
      where: { applicationId: application.id, status: 'submitted' },
    });
    if (!intake) {
      return;
    }
    const sample = await this.samplesRepository.findOne({
      where: { applicationId: application.id },
      order: { createdAt: 'DESC' },
    });
    const assembly = await this.aiClientService.assemblePersona(
      {
        subjectContext: buildSubjectContext(context),
        intakeContext: mapIntakeContext({
          intake,
          glossaryTerms: context.glossaryTerms,
          subjectName: context.subject.displayName,
          sample,
        }),
        speechExamples: await this.loadSpeechExamples(context),
        personaInsights: reflections.map((reflection) => reflection.insight).slice(0, 50),
      },
      {
        ownerUserId: context.job.ownerUserId,
        subjectId: context.job.subjectId,
        feature: ConsentFeature.VOICE_PERSONA,
      },
    );
    if (!assembly) {
      return;
    }
    context.subject.assembledPersonaInstructions = assembly.instructions;
    await this.subjectsRepository.save(context.subject);
    let bible = await this.personaBiblesRepository.findOne({
      where: { applicationId: application.id },
    });
    if (!bible) {
      bible = this.personaBiblesRepository.create({
        applicationId: application.id,
        ownerUserId: application.ownerUserId,
        subjectId: application.subjectId,
        contentSummary: '자동 조립된 페르소나 지침',
        safetyNotes: null,
        assembledInstructions: assembly.instructions,
        reviewStatus: VoicePersonaReviewStatus.PENDING_REVIEW,
        reviewerUserId: null,
        reviewedAt: null,
      });
    } else {
      bible.assembledInstructions = assembly.instructions;
    }
    await this.personaBiblesRepository.save(bible);
  }

  private async loadSpeechExamples(
    context: AnalysisTranscriptionContext,
  ): Promise<readonly string[]> {
    const segments = await this.transcriptSegmentsRepository.find({
      where: {
        ownerUserId: context.job.ownerUserId,
        subjectId: context.job.subjectId,
      },
      order: { updatedAt: 'DESC' },
      take: 200,
    });
    return segments
      .map((segment) => (segment.correctedText ?? segment.transcriptText).trim())
      .filter((text) => text.length >= 6 && text.length <= 40)
      .slice(0, 50);
  }

  private async referenceVoiceSampleUrl(
    job: AnalysisJob,
  ): Promise<string | null> {
    const application = await this.applicationsRepository.findOne({
      where: { ownerUserId: job.ownerUserId, subjectId: job.subjectId },
      order: { submittedAt: 'DESC', createdAt: 'DESC' },
    });
    if (!application) {
      return null;
    }
    const sample = await this.samplesRepository.findOne({
      where: { applicationId: application.id },
      order: { createdAt: 'DESC' },
    });
    if (!sample) {
      return null;
    }
    const storageKey = await this.voiceSampleStorageKey(sample, job.ownerUserId);
    if (!storageKey) {
      return null;
    }
    return (
      await this.audioStorageService.createPlaybackUrl(
        storageKey,
        ANALYSIS_AUDIO_URL_MIN_TTL_SECONDS,
      )
    ).playbackUrl;
  }

  private async voiceSampleStorageKey(
    sample: TargetVoiceSample,
    ownerUserId: string,
  ): Promise<string | null> {
    if (sample.storageKey) {
      return sample.storageKey;
    }
    if (!sample.recordingId) {
      return null;
    }
    const recording = await this.recordingsRepository.findOne({
      where: { id: sample.recordingId, ownerUserId },
    });
    return recording?.storageKey ?? null;
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
