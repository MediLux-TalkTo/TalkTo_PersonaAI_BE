import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubjectLifeStatus } from '../common/enums/archive.enums';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { UpsertGlossaryTermDto } from './dto/upsert-glossary-term.dto';
import { FamilyGlossaryTerm } from './family-glossary-term.entity';
import { Subject } from './subject.entity';

@Injectable()
export class SubjectsService {
  constructor(
    @InjectRepository(Subject)
    private readonly subjectsRepository: Repository<Subject>,
    @InjectRepository(FamilyGlossaryTerm)
    private readonly glossaryRepository: Repository<FamilyGlossaryTerm>,
  ) {}

  async create(ownerUserId: string, dto: CreateSubjectDto): Promise<Subject> {
    const subject = this.subjectsRepository.create({
      ownerUserId,
      displayName: dto.displayName,
      relationship: dto.relationship,
      lifeStatus: dto.lifeStatus ?? SubjectLifeStatus.UNKNOWN,
      localeHint: dto.localeHint ?? null,
      dialectHint: dto.dialectHint ?? null,
      notes: dto.notes ?? null,
    });

    return this.subjectsRepository.save(subject);
  }

  async list(ownerUserId: string): Promise<Subject[]> {
    return this.subjectsRepository.find({
      where: { ownerUserId },
      relations: ['glossaryTerms'],
      order: { createdAt: 'ASC' },
    });
  }

  async getOwned(subjectId: string, ownerUserId: string): Promise<Subject> {
    const subject = await this.subjectsRepository.findOne({
      where: { id: subjectId, ownerUserId },
      relations: ['glossaryTerms'],
    });

    if (!subject) {
      throw new NotFoundException('Subject not found.');
    }

    return subject;
  }

  async update(
    subjectId: string,
    ownerUserId: string,
    dto: UpdateSubjectDto,
  ): Promise<Subject> {
    const subject = await this.getOwned(subjectId, ownerUserId);

    Object.assign(subject, {
      ...dto,
      localeHint: dto.localeHint === undefined ? subject.localeHint : dto.localeHint,
      dialectHint:
        dto.dialectHint === undefined ? subject.dialectHint : dto.dialectHint,
      notes: dto.notes === undefined ? subject.notes : dto.notes,
    });

    await this.subjectsRepository.save(subject);
    return this.getOwned(subject.id, ownerUserId);
  }

  async addGlossaryTerm(
    subjectId: string,
    ownerUserId: string,
    dto: UpsertGlossaryTermDto,
  ): Promise<FamilyGlossaryTerm> {
    await this.getOwned(subjectId, ownerUserId);

    const term = this.glossaryRepository.create({
      subjectId,
      termType: dto.termType,
      term: dto.term,
      pronunciationHint: dto.pronunciationHint ?? null,
      meaning: dto.meaning ?? null,
    });

    return this.glossaryRepository.save(term);
  }

  async removeGlossaryTerm(
    subjectId: string,
    termId: string,
    ownerUserId: string,
  ): Promise<{ deleted: true }> {
    await this.getOwned(subjectId, ownerUserId);
    const result = await this.glossaryRepository.delete({
      id: termId,
      subjectId,
    });

    if (result.affected === 0) {
      throw new NotFoundException('Glossary term not found.');
    }

    return { deleted: true };
  }
}
