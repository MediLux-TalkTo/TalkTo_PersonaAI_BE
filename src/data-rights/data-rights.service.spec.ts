import { MaskingStatus, RedactionSourceType } from '../masking/masking.constants';
import { TranscriptRedaction } from '../masking/transcript-redaction.entity';
import { MemorySegment } from '../analysis/memory-segment.entity';
import { DataRightsService } from './data-rights.service';
import { ResearchExportPreference } from './research-export-preference.entity';

describe('DataRightsService', () => {
  const preferencesRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((input) => input),
    save: jest.fn((input) => Promise.resolve({ id: 'preference-id', ...input })),
  };
  const memorySegmentsRepository = {
    find: jest.fn(),
  };
  const redactionsRepository = {
    find: jest.fn(),
  };
  const deletionRequestsRepository = {
    create: jest.fn((input) => input),
    save: jest.fn((input) => Promise.resolve({ id: 'deletion-request-id', ...input })),
    findOne: jest.fn(),
  };
  const providerDeletionRecordsRepository = {
    create: jest.fn((input) => input),
    save: jest.fn((input) => Promise.resolve(input)),
    findOne: jest.fn(),
  };
  const providerAssetsRepository = {
    find: jest.fn(),
  };
  const auditService = {
    recordSensitiveWrite: jest.fn(),
    recordSensitiveRead: jest.fn(),
  };
  const appEventsService = {
    emit: jest.fn(),
  };
  let service: DataRightsService;

  beforeEach(() => {
    jest.resetAllMocks();
    preferencesRepository.create.mockImplementation((input) => input);
    preferencesRepository.save.mockImplementation((input) =>
      Promise.resolve({ id: 'preference-id', ...input }),
    );
    deletionRequestsRepository.create.mockImplementation((input) => input);
    deletionRequestsRepository.save.mockImplementation((input) =>
      Promise.resolve({ id: 'deletion-request-id', ...input }),
    );
    providerDeletionRecordsRepository.create.mockImplementation((input) => input);
    providerDeletionRecordsRepository.save.mockImplementation((input) =>
      Promise.resolve(input),
    );
    service = new DataRightsService(
      preferencesRepository as never,
      memorySegmentsRepository as never,
      redactionsRepository as never,
      deletionRequestsRepository as never,
      providerDeletionRecordsRepository as never,
      providerAssetsRepository as never,
      auditService as never,
      appEventsService as never,
    );
  });

  it('stores opt-in preference with audit and event metadata', async () => {
    preferencesRepository.findOne.mockResolvedValue(null);

    await expect(service.optInResearchExport('user-id')).resolves.toMatchObject({
      optedIn: true,
      withdrawnAt: null,
    });

    expect(auditService.recordSensitiveWrite).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 'user-id',
        resourceType: 'research_export_preference',
        metadata: { optedIn: true },
      }),
    );
    expect(appEventsService.emit).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'research_export.opted_in' }),
    );
  });

  it('withdraws opt-in without deleting the preference trail', async () => {
    preferencesRepository.findOne.mockResolvedValue(buildPreference({ optedIn: true }));

    await expect(
      service.withdrawResearchExport('user-id'),
    ).resolves.toMatchObject({
      optedIn: false,
      withdrawnAt: expect.any(String),
    });
  });

  it('previews only opted-in rows and never falls back to raw memory text', async () => {
    preferencesRepository.find.mockResolvedValue([
      buildPreference({ userId: 'opted-in-user', optedIn: true }),
    ]);
    memorySegmentsRepository.find.mockResolvedValue([
      buildSegment({
        id: 'safe-segment',
        ownerUserId: 'opted-in-user',
        memoryText: 'Raw text with phone 010-1234-5678',
      }),
      buildSegment({
        id: 'missing-redaction-segment',
        ownerUserId: 'opted-in-user',
        memoryText: 'Raw private text',
      }),
    ]);
    redactionsRepository.find.mockResolvedValue([
      buildRedaction({
        sourceId: 'safe-segment',
        status: MaskingStatus.SUCCEEDED,
        redactedText: 'Raw text with phone [PHONE]',
      }),
    ]);

    await expect(
      service.previewRedactedResearchExport('admin-id', { limit: 20 }),
    ).resolves.toEqual({
      rows: [
        expect.objectContaining({
          memorySegmentId: 'safe-segment',
          eligible: true,
          redactedText: 'Raw text with phone [PHONE]',
          exclusionReason: null,
        }),
        expect.objectContaining({
          memorySegmentId: 'missing-redaction-segment',
          eligible: false,
          redactedText: null,
          exclusionReason: 'missing_redaction',
        }),
      ],
    });

    expect(JSON.stringify(redactionsRepository.find.mock.calls)).not.toContain(
      'Raw private text',
    );
    expect(auditService.recordSensitiveRead).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 'admin-id',
        resourceType: 'research_export_preview',
      }),
    );
  });

  it('returns no preview rows when no users opted in', async () => {
    preferencesRepository.find.mockResolvedValue([]);

    await expect(
      service.previewRedactedResearchExport('admin-id', {}),
    ).resolves.toEqual({ rows: [] });

    expect(memorySegmentsRepository.find).not.toHaveBeenCalled();
    expect(redactionsRepository.find).not.toHaveBeenCalled();
  });

  it('requires exact confirmation for data deletion requests', async () => {
    await expect(
      service.createDataDeletionRequest('user-id', {
        scope: 'account',
        confirmation: 'delete',
      }),
    ).rejects.toThrow('Confirmation must exactly match');
  });

  it('creates data deletion requests and provider deletion tracking rows', async () => {
    providerAssetsRepository.find.mockResolvedValue([
      {
        id: 'asset-id',
        subjectId: 'subject-id',
        providerName: 'manual-provider',
        externalAssetId: 'asset-123',
      },
    ]);

    await expect(
      service.createDataDeletionRequest('user-id', {
        scope: 'subject',
        subjectId: 'subject-id',
        confirmation: 'DELETE MY DATA',
      }),
    ).resolves.toMatchObject({
      deletionRequest: expect.objectContaining({
        id: 'deletion-request-id',
        scope: 'subject',
        subjectId: 'subject-id',
      }),
      providerDeletionRecords: [
        expect.objectContaining({
          providerAssetId: 'asset-id',
          status: 'pending_manual',
        }),
      ],
    });
    expect(auditService.recordSensitiveWrite).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 'user-id',
        resourceType: 'data_deletion_request',
      }),
    );
  });
});

function buildPreference(
  overrides: Partial<ResearchExportPreference> = {},
): ResearchExportPreference {
  const preference = new ResearchExportPreference();
  preference.id = 'preference-id';
  preference.userId = 'user-id';
  preference.optedIn = false;
  preference.optedInAt = null;
  preference.withdrawnAt = null;
  return Object.assign(preference, overrides);
}

function buildSegment(overrides: Partial<MemorySegment>): MemorySegment {
  const segment = new MemorySegment();
  segment.id = 'segment-id';
  segment.ownerUserId = 'user-id';
  segment.subjectId = 'subject-id';
  segment.recordingId = 'recording-id';
  segment.startMs = 1000;
  segment.endMs = 2000;
  segment.memoryText = 'Raw memory text';
  return Object.assign(segment, overrides);
}

function buildRedaction(
  overrides: Partial<TranscriptRedaction>,
): TranscriptRedaction {
  const redaction = new TranscriptRedaction();
  redaction.id = 'redaction-id';
  redaction.ownerUserId = 'user-id';
  redaction.subjectId = 'subject-id';
  redaction.recordingId = 'recording-id';
  redaction.sourceType = RedactionSourceType.MEMORY_SEGMENT;
  redaction.sourceId = 'segment-id';
  redaction.status = MaskingStatus.SUCCEEDED;
  redaction.redactedText = 'Redacted text';
  redaction.errorCode = null;
  redaction.updatedAt = new Date('2026-06-18T00:00:00.000Z');
  return Object.assign(redaction, overrides);
}
