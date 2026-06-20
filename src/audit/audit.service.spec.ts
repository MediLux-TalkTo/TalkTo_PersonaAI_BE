import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import type { DeepPartial } from 'typeorm';
import { Role } from '../common/enums/role.enum';
import { AuditLog } from './audit-log.entity';
import { AuditLogAction, AuditService } from './audit.service';

describe('AuditService', () => {
  type AuditLogRepositoryMock = {
    readonly create: jest.Mock<DeepPartial<AuditLog>, [DeepPartial<AuditLog>]>;
    readonly save: jest.Mock<
      Promise<DeepPartial<AuditLog> & { readonly id: string }>,
      [DeepPartial<AuditLog>]
    >;
  };

  const repository = (): AuditLogRepositoryMock => ({
    create: jest.fn((value: DeepPartial<AuditLog>) => value),
    save: jest.fn(async (value: DeepPartial<AuditLog>) => ({
      id: 'audit-log-id',
      ...value,
    })),
  });

  let service: AuditService;
  let auditLogsRepository: ReturnType<typeof repository>;

  beforeEach(async () => {
    auditLogsRepository = repository();

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: getRepositoryToken(AuditLog), useValue: auditLogsRepository },
      ],
    }).compile();

    service = moduleRef.get(AuditService);
  });

  it('records sensitive reads without forbidden metadata values', async () => {
    await service.recordSensitiveRead({
      actorUserId: 'user-id',
      actorRole: Role.ADMIN,
      resourceType: 'recording',
      resourceId: 'recording-id',
      subjectId: 'subject-id',
      metadata: {
        status: 'played',
        segmentCount: 3,
        playbackUrl: 'https://r2.example.com/audio.wav?X-Amz-Signature=abc',
        nested: {
          rawTranscript: '오늘 녹음한 원문입니다.',
          authorization: 'Bearer secret-token',
          providerSecret: 'provider-secret',
          safeId: 'segment-id',
        },
        items: [
          {
            generatedAudioUrl: 'https://cdn.example.com/generated.wav',
            allowedState: 'archived',
          },
        ],
      },
    });

    const savedLog = auditLogsRepository.save.mock.calls[0]?.[0];
    const serializedMetadata = JSON.stringify(savedLog?.metadata ?? {});

    expect(savedLog).toMatchObject({
      actorUserId: 'user-id',
      actorRole: Role.ADMIN,
      action: AuditLogAction.SENSITIVE_READ,
      resourceType: 'recording',
      resourceId: 'recording-id',
      subjectId: 'subject-id',
      metadata: {
        status: 'played',
        segmentCount: 3,
        nested: {
          safeId: 'segment-id',
        },
        items: [
          {
            allowedState: 'archived',
          },
        ],
      },
    });
    expect(serializedMetadata).not.toContain('X-Amz-Signature');
    expect(serializedMetadata).not.toContain('오늘 녹음한 원문입니다.');
    expect(serializedMetadata).not.toContain('Bearer secret-token');
    expect(serializedMetadata).not.toContain('provider-secret');
    expect(serializedMetadata).not.toContain('generated.wav');
  });

  it('records sensitive writes with nullable actor fields and sanitized metadata defaults', async () => {
    await service.recordSensitiveWrite({
      resourceType: 'subject',
      resourceId: 'subject-id',
    });

    expect(auditLogsRepository.save).toHaveBeenCalledTimes(1);
    expect(auditLogsRepository.save.mock.calls[0]?.[0]).toMatchObject({
      actorUserId: null,
      actorRole: null,
      action: AuditLogAction.SENSITIVE_WRITE,
      resourceType: 'subject',
      resourceId: 'subject-id',
      subjectId: null,
      metadata: {},
    });
  });
});
