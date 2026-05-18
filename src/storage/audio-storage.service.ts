import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

    if (driver !== 'local') {
      throw new Error(`Unsupported audio storage driver: ${driver}.`);
    }

    return this.saveLocalMp3(params);
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
    const safeConversationId = this.safeSegment(params.conversationId);
    const safeMessageId = this.safeSegment(params.messageId);
    const filename = `${safeMessageId}-${randomUUID()}${extname('tts.mp3')}`;
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

  private safeSegment(value: string): string {
    return value.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  private normalizePublicPath(path: string): string {
    const withLeadingSlash = path.startsWith('/') ? path : `/${path}`;
    return withLeadingSlash.replace(/\/+$/, '');
  }
}
