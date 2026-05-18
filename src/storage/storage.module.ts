import { Module } from '@nestjs/common';
import { AudioStorageService } from './audio-storage.service';

@Module({
  providers: [AudioStorageService],
  exports: [AudioStorageService],
})
export class StorageModule {}
