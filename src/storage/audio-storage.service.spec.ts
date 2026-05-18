import { ConfigService } from '@nestjs/config';
import { mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { AudioStorageService } from './audio-storage.service';

describe('AudioStorageService', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'talkto-audio-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('stores mp3 bytes under the local public audio path', async () => {
    const service = new AudioStorageService({
      get: jest.fn((key: string) => {
        if (key === 'AUDIO_STORAGE_DRIVER') {
          return 'local';
        }
        if (key === 'LOCAL_AUDIO_STORAGE_DIR') {
          return tempDir;
        }
        if (key === 'LOCAL_AUDIO_PUBLIC_PATH') {
          return '/audio';
        }
        if (key === 'AUDIO_SIGNED_URL_TTL_SECONDS') {
          return 3600;
        }
        return undefined;
      }),
    } as unknown as ConfigService);

    const stored = await service.saveMp3({
      buffer: Buffer.from('mp3-bytes'),
      conversationId: 'conversation-1',
      messageId: 'message-1',
    });

    expect(stored.url).toMatch(/^\/audio\/conversation-1\/message-1-/);
    expect(stored.expiresAt).toBeInstanceOf(Date);
    await expect(readFile(join(tempDir, stored.storageKey), 'utf8')).resolves.toBe(
      'mp3-bytes',
    );
  });
});
