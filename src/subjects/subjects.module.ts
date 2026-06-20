import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsModule } from '../events/events.module';
import { FamilyGlossaryTerm } from './family-glossary-term.entity';
import { Subject } from './subject.entity';
import { SubjectsController } from './subjects.controller';
import { SubjectsService } from './subjects.service';

@Module({
  imports: [TypeOrmModule.forFeature([Subject, FamilyGlossaryTerm]), EventsModule],
  controllers: [SubjectsController],
  providers: [SubjectsService],
  exports: [SubjectsService],
})
export class SubjectsModule {}
