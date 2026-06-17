import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ConsentFeature,
  ConsentStatus,
  ConsentType,
} from '../common/enums/consent.enums';
import { SubjectsService } from '../subjects/subjects.service';
import { AcceptConsentsDto } from './dto/accept-consents.dto';
import { CreateConsentDto } from './dto/create-consent.dto';
import { QueryConsentRequirementsDto } from './dto/query-consent-requirements.dto';
import { Consent } from './consent.entity';

type ConsentRequirement = {
  readonly consent_type: ConsentType;
  readonly required: boolean;
  readonly title: string;
  readonly summary: string;
};

const CONSENT_REQUIREMENTS: Record<ConsentFeature, readonly ConsentRequirement[]> = {
  [ConsentFeature.ARCHIVE]: [
    {
      consent_type: ConsentType.PRIVACY_COLLECTION,
      required: true,
      title: '개인정보 수집 및 이용 동의',
      summary: 'TalkTo 계정과 대상자 프로필을 만들기 위해 필요합니다.',
    },
    {
      consent_type: ConsentType.AUDIO_STORAGE_SERVICE,
      required: true,
      title: '음성 파일 보관 동의',
      summary: '녹음 파일을 안전하게 보관하기 위해 필요합니다.',
    },
  ],
  [ConsentFeature.MEMORIES]: [
    {
      consent_type: ConsentType.AUDIO_STORAGE_SERVICE,
      required: true,
      title: '음성 파일 보관 동의',
      summary: '녹음 파일을 안전하게 보관하기 위해 필요합니다.',
    },
    {
      consent_type: ConsentType.AI_ANALYSIS_SERVICE,
      required: true,
      title: 'AI 분석 동의',
      summary: 'Memories 검색을 위해 STT, 요약, 임베딩 처리를 수행합니다.',
    },
    {
      consent_type: ConsentType.OVERSEAS_TRANSFER_LLM_PROVIDER,
      required: true,
      title: 'LLM Provider 국외 이전 동의',
      summary: 'AI 분석 Provider 호출이 필요한 경우 국외 이전 조건을 확인합니다.',
    },
  ],
  [ConsentFeature.VOICE_PERSONA]: [
    {
      consent_type: ConsentType.AUDIO_STORAGE_SERVICE,
      required: true,
      title: '음성 파일 보관 동의',
      summary: '목소리 샘플과 원본 녹음을 안전하게 보관하기 위해 필요합니다.',
    },
    {
      consent_type: ConsentType.BIOMETRIC_VOICE_PROCESSING,
      required: true,
      title: '생체정보 음성 처리 동의',
      summary: 'Voice Persona 제작과 런타임 음성 생성을 위해 필요합니다.',
    },
    {
      consent_type: ConsentType.OVERSEAS_TRANSFER_VOICE_PROVIDER,
      required: true,
      title: 'Voice Provider 국외 이전 동의',
      summary: '외부 Voice Provider를 사용할 때 필요한 고지와 동의입니다.',
    },
    {
      consent_type: ConsentType.POSTHUMOUS_PERSONA_CREATION,
      required: true,
      title: '사후 Persona 생성 동의',
      summary: '고인의 기록 기반 AI 음성 Persona 제작 전에 필요합니다.',
    },
  ],
};

@Injectable()
export class ConsentsService {
  constructor(
    @InjectRepository(Consent)
    private readonly consentsRepository: Repository<Consent>,
    private readonly subjectsService: SubjectsService,
  ) {}

  async getLatest(userId: string): Promise<Consent | null> {
    return this.consentsRepository.findOne({
      where: { userId },
      order: {
        acceptedAt: 'DESC',
      },
    });
  }

  async save(userId: string, dto: CreateConsentDto): Promise<Consent> {
    const consent = this.consentsRepository.create({
      userId,
      ...dto,
    });

    return this.consentsRepository.save(consent);
  }

  async getRequirements(userId: string, dto: QueryConsentRequirementsDto) {
    if (dto.subject_id) {
      await this.subjectsService.getOwned(dto.subject_id, userId);
    }

    const latestByType = await this.getLatestByType(userId, dto.subject_id);

    return {
      feature: dto.feature,
      subject_id: dto.subject_id ?? null,
      requirements: CONSENT_REQUIREMENTS[dto.feature].map((requirement) => {
        const accepted = latestByType.get(requirement.consent_type);
        return {
          ...requirement,
          status: accepted?.status ?? 'missing',
          blocking_behavior: requirement.required
            ? ('block_if_missing' as const)
            : ('allow_optional' as const),
        };
      }),
    };
  }

  async accept(userId: string, dto: AcceptConsentsDto) {
    if (dto.subject_id) {
      await this.subjectsService.getOwned(dto.subject_id, userId);
    }

    const consents = dto.consents.map((item) =>
      this.consentsRepository.create({
        userId,
        subjectId: dto.subject_id ?? null,
        consentType: item.consent_type,
        feature: this.featureForConsentType(item.consent_type),
        required: true,
        status: ConsentStatus.ACCEPTED,
        version: item.version,
        personaDisclaimerAccepted: false,
        conversationStorageAccepted: false,
        voiceSynthesisAccepted: false,
        withdrawnAt: null,
      }),
    );
    const savedConsents = await this.consentsRepository.save(consents);
    const acceptedFeatures = [...new Set(savedConsents.map((consent) => consent.feature))]
      .filter((feature): feature is ConsentFeature => Boolean(feature));

    return {
      accepted_features: acceptedFeatures,
      consents: savedConsents,
    };
  }

  async assertRequiredConsents(
    userId: string,
    feature: ConsentFeature,
    subjectId?: string,
  ): Promise<void> {
    const requirements = await this.getRequirements(userId, {
      feature,
      subject_id: subjectId,
    });
    const missingConsentTypes = requirements.requirements
      .filter(
        (requirement) =>
          requirement.required && requirement.status !== ConsentStatus.ACCEPTED,
      )
      .map((requirement) => requirement.consent_type);

    if (missingConsentTypes.length === 0) {
      return;
    }

    throw new ForbiddenException({
      code: 'requires_consent',
      message: 'AI 분석을 시작하려면 필요한 동의가 필요해요.',
      missing_consent_types: missingConsentTypes,
    });
  }

  private async getLatestByType(
    userId: string,
    subjectId?: string,
  ): Promise<Map<ConsentType, Consent>> {
    const consents = await this.consentsRepository.find({
      where: { userId },
      order: { acceptedAt: 'DESC' },
    });
    const latestByType = new Map<ConsentType, Consent>();

    for (const consent of consents) {
      if (!consent.consentType || latestByType.has(consent.consentType)) {
        continue;
      }

      if (consent.subjectId && consent.subjectId !== subjectId) {
        continue;
      }

      latestByType.set(consent.consentType, consent);
    }

    return latestByType;
  }

  private featureForConsentType(consentType: ConsentType): ConsentFeature {
    switch (consentType) {
      case ConsentType.PRIVACY_COLLECTION:
      case ConsentType.AUDIO_STORAGE_SERVICE:
      case ConsentType.MARKETING_OPTIONAL:
        return ConsentFeature.ARCHIVE;
      case ConsentType.AI_ANALYSIS_SERVICE:
      case ConsentType.OVERSEAS_TRANSFER_LLM_PROVIDER:
        return ConsentFeature.MEMORIES;
      case ConsentType.BIOMETRIC_VOICE_PROCESSING:
      case ConsentType.OVERSEAS_TRANSFER_VOICE_PROVIDER:
      case ConsentType.POSTHUMOUS_PERSONA_CREATION:
      case ConsentType.FAMILY_RECONSENT_POSTHUMOUS:
        return ConsentFeature.VOICE_PERSONA;
    }
  }
}
