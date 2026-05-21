import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { AudioStorageService } from './audio-storage.service';

jest.mock('@aws-sdk/client-s3', () => ({
  GetObjectCommand: jest.fn((input) => ({ input, command: 'get' })),
  PutObjectCommand: jest.fn((input) => ({ input, command: 'put' })),
  S3Client: jest.fn(),
}));
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

describe('AudioStorageService', () => {
  let tempDir: string;
  const send = jest.fn();

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'talkto-audio-'));
    jest.clearAllMocks();
    (S3Client as jest.Mock).mockImplementation(() => ({ send }));
    (getSignedUrl as jest.Mock).mockResolvedValue('https://signed.r2.example/audio.mp3');
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

  it('stores private R2 mp3 bytes and returns a signed read URL', async () => {
    const service = new AudioStorageService({
      get: jest.fn((key: string) => {
        const config: Record<string, string | number> = {
          AUDIO_STORAGE_DRIVER: 'r2',
          AUDIO_SIGNED_URL_TTL_SECONDS: 600,
          R2_ACCOUNT_ID: 'account-id',
          R2_BUCKET_NAME: 'talkto-audio',
          R2_ACCESS_KEY_ID: 'access-key',
          R2_SECRET_ACCESS_KEY: 'secret-key',
        };

        return config[key];
      }),
    } as unknown as ConfigService);

    const stored = await service.saveMp3({
      buffer: Buffer.from('mp3-bytes'),
      conversationId: 'conversation/1',
      messageId: 'message/1',
    });

    expect(S3Client).toHaveBeenCalledWith({
      region: 'auto',
      endpoint: 'https://account-id.r2.cloudflarestorage.com',
      credentials: {
        accessKeyId: 'access-key',
        secretAccessKey: 'secret-key',
      },
    });
    expect(PutObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Bucket: 'talkto-audio',
        Body: Buffer.from('mp3-bytes'),
        ContentType: 'audio/mpeg',
        Key: expect.stringMatching(/^conversation_1\/message_1-/),
      }),
    );
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ command: 'put' }));
    expect(getSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ command: 'get' }),
      { expiresIn: 600 },
    );
    expect(stored.storageKey).toMatch(/^conversation_1\/message_1-/);
    expect(stored.url).toBe('https://signed.r2.example/audio.mp3');
    expect(stored.expiresAt).toBeInstanceOf(Date);
  });
});
