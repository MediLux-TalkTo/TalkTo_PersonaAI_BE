import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { mkdir, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { extname, isAbsolute, join } from 'path';

export interface StoredAudio {
  storageKey: string;
  url: string;
  expiresAt: Date | null;
}

@Injectable()
export class AudioStorageService {
  constructor(private readonly configService: ConfigService) {}

  async saveMp3(params: {
    buffer: Buffer;
    conversationId: string;
    messageId: string;
  }): Promise<StoredAudio> {
    const driver = this.configService.get<string>('AUDIO_STORAGE_DRIVER') ?? 'local';

    if (driver === 'local') {
      return this.saveLocalMp3(params);
    }

    if (driver === 'r2') {
      return this.saveR2Mp3(params);
    }

    throw new Error(`Unsupported audio storage driver: ${driver}.`);
  }

  private async saveLocalMp3(params: {
    buffer: Buffer;
    conversationId: string;
    messageId: string;
  }): Promise<StoredAudio> {
    const storageRoot =
      this.configService.get<string>('LOCAL_AUDIO_STORAGE_DIR') ?? 'storage/audio';
    const publicPath =
      this.configService.get<string>('LOCAL_AUDIO_PUBLIC_PATH') ?? '/audio';
    const ttlSeconds =
      this.configService.get<number>('AUDIO_SIGNED_URL_TTL_SECONDS') ?? 3600;
    const { safeConversationId, filename } = this.buildObjectSegments(params);
    const relativePath = join(safeConversationId, filename);
    const absoluteRoot = isAbsolute(storageRoot)
      ? storageRoot
      : join(process.cwd(), storageRoot);
    const absolutePath = join(absoluteRoot, relativePath);

    await mkdir(join(absoluteRoot, safeConversationId), {
      recursive: true,
    });
    await writeFile(absolutePath, params.buffer, { mode: 0o600 });

    return {
      storageKey: relativePath,
      url: `${this.normalizePublicPath(publicPath)}/${safeConversationId}/${filename}`,
      expiresAt: new Date(Date.now() + ttlSeconds * 1000),
    };
  }

  private async saveR2Mp3(params: {
    buffer: Buffer;
    conversationId: string;
    messageId: string;
  }): Promise<StoredAudio> {
    const bucket = this.requiredConfig('R2_BUCKET_NAME');
    const ttlSeconds =
      this.configService.get<number>('AUDIO_SIGNED_URL_TTL_SECONDS') ?? 3600;
    const { safeConversationId, filename } = this.buildObjectSegments(params);
    const storageKey = `${safeConversationId}/${filename}`;
    const s3 = this.buildR2Client();

    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: storageKey,
        Body: params.buffer,
        ContentType: 'audio/mpeg',
      }),
    );

    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: bucket,
        Key: storageKey,
      }),
      { expiresIn: ttlSeconds },
    );

    return {
      storageKey,
      url,
      expiresAt: new Date(Date.now() + ttlSeconds * 1000),
    };
  }

  private buildR2Client(): S3Client {
    const accountId = this.requiredConfig('R2_ACCOUNT_ID');

    return new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: this.requiredConfig('R2_ACCESS_KEY_ID'),
        secretAccessKey: this.requiredConfig('R2_SECRET_ACCESS_KEY'),
      },
    });
  }

  private buildObjectSegments(params: {
    conversationId: string;
    messageId: string;
  }) {
    const safeConversationId = this.safeSegment(params.conversationId);
    const safeMessageId = this.safeSegment(params.messageId);

    return {
      safeConversationId,
      filename: `${safeMessageId}-${randomUUID()}${extname('tts.mp3')}`,
    };
  }

  private requiredConfig(key: string): string {
    const value = this.configService.get<string>(key);

    if (!value) {
      throw new Error(`${key} is required for R2 audio storage.`);
    }

    return value;
  }

  private safeSegment(value: string): string {
    return value.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  private normalizePublicPath(path: string): string {
    const withLeadingSlash = path.startsWith('/') ? path : `/${path}`;
    return withLeadingSlash.replace(/\/+$/, '');
  }
}
