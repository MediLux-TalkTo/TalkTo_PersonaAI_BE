import { MaskingService } from './masking.service';
import { DeterministicRedactor } from './deterministic-redactor';
import { MaskingStatus } from './masking.constants';
import { MaskingSpan } from './masking-span.entity';
import { TranscriptRedaction } from './transcript-redaction.entity';

describe('MaskingService', () => {
  it('stores redacted transcript status and masking spans without raw text', async () => {
    const redactionsRepository = {
      create: jest.fn((value: Partial<TranscriptRedaction>) =>
        Object.assign(new TranscriptRedaction(), {
          id: 'redaction-id',
          ...value,
        }),
      ),
      save: jest.fn(async (value: TranscriptRedaction) => value),
    };
    const spansRepository = {
      create: jest.fn((value: Partial<MaskingSpan>) =>
        Object.assign(new MaskingSpan(), value),
      ),
      save: jest.fn(async (value: MaskingSpan[]) => value),
    };
    const service = new MaskingService(
      redactionsRepository,
      spansRepository,
      new DeterministicRedactor(),
    );

    const result = await service.redactTranscript({
      ownerUserId: 'owner-id',
      subjectId: 'subject-id',
      recordingId: 'recording-id',
      sourceType: 'transcript_segment',
      sourceId: 'segment-id',
      rawText: 'Call me at 010-1234-5678 or kim@example.com',
    });

    expect(result.status).toBe(MaskingStatus.SUCCEEDED);
    expect(result.redactedText).toBe('Call me at [PHONE] or [EMAIL]');
    expect(JSON.stringify(redactionsRepository.save.mock.calls)).not.toContain(
      'kim@example.com',
    );
    expect(JSON.stringify(spansRepository.save.mock.calls)).not.toContain(
      '010-1234-5678',
    );
    expect(spansRepository.save).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          sourceType: 'transcript_segment',
          sourceId: 'segment-id',
          replacement: '[PHONE]',
        }),
      ]),
    );
  });
});
