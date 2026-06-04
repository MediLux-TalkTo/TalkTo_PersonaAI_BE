import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageModule } from '../storage/storage.module';
import { SubjectsModule } from '../subjects/subjects.module';
import { Recording } from './recording.entity';
import { RecordingsController } from './recordings.controller';
import { RecordingsService } from './recordings.service';

@Module({
  imports: [TypeOrmModule.forFeature([Recording]), SubjectsModule, StorageModule],
  controllers: [RecordingsController],
  providers: [RecordingsService],
})
export class RecordingsModule {}
