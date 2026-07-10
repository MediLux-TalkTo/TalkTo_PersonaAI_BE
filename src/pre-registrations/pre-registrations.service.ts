import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type FindOptionsWhere, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { CreatePreRegistrationDto } from './dto/create-pre-registration.dto';
import { QueryPreRegistrationsDto } from './dto/query-pre-registrations.dto';
import { UpdatePreRegistrationDto } from './dto/update-pre-registration.dto';
import {
  PreRegistrationStatus,
  type PreRegistrationBenefitStatus as PreRegistrationBenefitStatusValue,
} from './pre-registration.constants';
import { PreRegistration } from './pre-registration.entity';
import {
  normalizeContact,
  toAdminPreRegistrationItem,
  toNewPreRegistration,
} from './pre-registration.mapper';
import { isPostgresUniqueViolation } from './pre-registration.database';
import { preRegistrationAlreadyExists } from './pre-registration.errors';
import {
  assertContactConsent,
  assertIdempotencyKey,
  assertReasonOther,
  assertRequiredText,
  assertSubmissionShape,
} from './pre-registration.validation';

type PreRegistrationSubmission = {
  readonly registrationId: string;
  readonly status: PreRegistrationStatus;
  readonly participationType: string;
  readonly benefitStatus: PreRegistrationBenefitStatusValue;
  readonly nextStep: 'wait_for_contact';
};

@Injectable()
export class PreRegistrationsService {
  constructor(
    @InjectRepository(PreRegistration)
    private readonly preRegistrationsRepository: Repository<PreRegistration>,
    private readonly auditService: AuditService,
  ) {}

  async create(
    dto: CreatePreRegistrationDto,
    idempotencyKey: string | undefined,
  ): Promise<PreRegistrationSubmission> {
    assertSubmissionShape(dto);
    assertRequiredText(dto.name, 'name_required', 'Name is required.');
    assertRequiredText(
      dto.contactConsentVersion,
      'contact_consent_version_required',
      'Contact consent version is required.',
    );
    assertReasonOther(dto.reason, dto.reasonOther);
    assertContactConsent(dto.contactConsent);
    assertIdempotencyKey(idempotencyKey);

    if (idempotencyKey) {
      const existingByKey = await this.preRegistrationsRepository.findOne({
        where: { idempotencyKey },
      });
      if (existingByKey) {
        return this.toSubmission(existingByKey);
      }
    }

    const normalizedContact = normalizeContact(dto.contact);
    const existingByContact = await this.preRegistrationsRepository.findOne({
      where: { contactNormalized: normalizedContact.value },
    });
    if (existingByContact) {
      throw preRegistrationAlreadyExists();
    }

    let registration: PreRegistration;
    try {
      registration = await this.preRegistrationsRepository.save(
        this.preRegistrationsRepository.create(
          toNewPreRegistration(dto, normalizedContact, idempotencyKey),
        ),
      );
    } catch (error) {
      if (isPostgresUniqueViolation(error)) {
        if (idempotencyKey) {
          const existingByKey = await this.preRegistrationsRepository.findOne({
            where: { idempotencyKey },
          });
          if (existingByKey) {
            return this.toSubmission(existingByKey);
          }
        }
        throw preRegistrationAlreadyExists();
      }
      throw error;
    }

    await this.auditService.recordSensitiveWrite({
      resourceType: 'pre_registration',
      resourceId: registration.id,
      metadata: {
        event: 'submitted',
        participationType: registration.participationType,
        benefitStatus: registration.benefitStatus,
      },
    });
    return this.toSubmission(registration);
  }

  async listForAdmin(actorUserId: string, query: QueryPreRegistrationsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const where: FindOptionsWhere<PreRegistration> = {};
    if (query.participationType) {
      where.participationType = query.participationType;
    }
    if (query.status) {
      where.status = query.status;
    }

    const [items, total] = await this.preRegistrationsRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    await this.auditService.recordSensitiveRead({
      actorUserId,
      resourceType: 'pre_registration',
      metadata: {
        participationType: query.participationType ?? 'all',
        status: query.status ?? 'all',
        page,
        limit,
      },
    });

    return {
      items: items.map((item) => toAdminPreRegistrationItem(item)),
      total,
      page,
      limit,
    };
  }

  async updateForAdmin(
    registrationId: string,
    actorUserId: string,
    dto: UpdatePreRegistrationDto,
  ) {
    if (
      dto.status === undefined &&
      dto.benefitStatus === undefined &&
      dto.operatorNotes === undefined
    ) {
      throw new BadRequestException({
        code: 'pre_registration_update_required',
        message: 'At least one update field is required.',
      });
    }
    const registration = await this.preRegistrationsRepository.findOne({
      where: { id: registrationId },
    });
    if (!registration) {
      throw new NotFoundException('Pre-registration not found.');
    }

    if (dto.status) {
      registration.status = dto.status;
      if (dto.status === PreRegistrationStatus.CONTACTED && !registration.contactedAt) {
        registration.contactedAt = new Date();
      }
    }
    if (dto.benefitStatus) {
      registration.benefitStatus = dto.benefitStatus;
    }
    if (dto.operatorNotes !== undefined) {
      registration.operatorNotes = dto.operatorNotes.trim() || null;
    }

    const saved = await this.preRegistrationsRepository.save(registration);
    await this.auditService.recordSensitiveWrite({
      actorUserId,
      resourceType: 'pre_registration',
      resourceId: saved.id,
      metadata: {
        status: saved.status,
        benefitStatus: saved.benefitStatus,
        operatorNotesUpdated: dto.operatorNotes !== undefined,
      },
    });
    return toAdminPreRegistrationItem(saved);
  }

  private toSubmission(registration: PreRegistration): PreRegistrationSubmission {
    return {
      registrationId: registration.id,
      status: registration.status,
      participationType: registration.participationType,
      benefitStatus: registration.benefitStatus,
      nextStep: 'wait_for_contact',
    };
  }

}
