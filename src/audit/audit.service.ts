import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../common/enums/role.enum';
import { sanitizeForAuditMetadata } from '../common/utils/sanitize.util';
import { AuditLog } from './audit-log.entity';

export const AuditLogAction = {
  SENSITIVE_READ: 'sensitive_read',
  SENSITIVE_WRITE: 'sensitive_write',
} as const;

export type AuditLogAction = (typeof AuditLogAction)[keyof typeof AuditLogAction];

export type RecordAuditLogInput = {
  readonly actorUserId?: string | null;
  readonly actorRole?: Role | null;
  readonly action: AuditLogAction | string;
  readonly resourceType: string;
  readonly resourceId?: string | null;
  readonly subjectId?: string | null;
  readonly metadata?: Record<string, unknown>;
};

export type SensitiveAuditEventInput = Omit<RecordAuditLogInput, 'action'>;

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogsRepository: Repository<AuditLog>,
  ) {}

  async record(payload: RecordAuditLogInput): Promise<AuditLog> {
    const auditLog = this.auditLogsRepository.create({
      actorUserId: payload.actorUserId ?? null,
      actorRole: payload.actorRole ?? null,
      action: payload.action,
      resourceType: payload.resourceType,
      resourceId: payload.resourceId ?? null,
      subjectId: payload.subjectId ?? null,
      metadata: sanitizeForAuditMetadata(payload.metadata),
    });

    return this.auditLogsRepository.save(auditLog);
  }

  async recordSensitiveRead(payload: SensitiveAuditEventInput): Promise<AuditLog> {
    return this.record({
      ...payload,
      action: AuditLogAction.SENSITIVE_READ,
    });
  }

  async recordSensitiveWrite(payload: SensitiveAuditEventInput): Promise<AuditLog> {
    return this.record({
      ...payload,
      action: AuditLogAction.SENSITIVE_WRITE,
    });
  }
}
