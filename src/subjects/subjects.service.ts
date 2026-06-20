import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SubjectAvatarType,
  SubjectLifeStatus,
  SubjectReadinessStatus,
} from '../common/enums/archive.enums';
import { Role } from '../common/enums/role.enum';
import {
  assertSubjectAccess,
  type SubjectAccessActor,
} from '../common/permissions/subject-access';
import { AppEventsService } from '../events/events.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { UpsertGlossaryTermDto } from './dto/upsert-glossary-term.dto';
import { FamilyGlossaryTerm } from './family-glossary-term.entity';
import { Subject } from './subject.entity';

const RELATIONSHIP_LABELS: Record<string, string> = {
  grandmother: '할머니',
  grandfather: '할아버지',
  mother: '어머니',
  father: '아버지',
  parent: '부모님',
  sibling: '형제자매',
  spouse: '배우자',
  child: '자녀',
  friend: '친구',
  other: '기타',
};

export type SubjectV1Response = Subject & {
  readonly relationshipLabel: string;
  readonly regionText: string | null;
  readonly recordingCount: number;
  readonly recordingSeconds: number;
};

@Injectable()
export class SubjectsService {
  constructor(
    @InjectRepository(Subject)
    private readonly subjectsRepository: Repository<Subject>,
    @InjectRepository(FamilyGlossaryTerm)
    private readonly glossaryRepository: Repository<FamilyGlossaryTerm>,
    private readonly appEventsService: AppEventsService,
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

    const savedSubject = await this.subjectsRepository.save(subject);
    await this.appEventsService.emit({
      userId: ownerUserId,
      name: 'subject.created',
      subjectId: savedSubject.id,
      payload: {
        relationship: savedSubject.relationship,
        lifeStatus: savedSubject.lifeStatus,
        hasLocaleHint: Boolean(savedSubject.localeHint),
        hasDialectHint: Boolean(savedSubject.dialectHint),
        hasNotes: Boolean(savedSubject.notes),
      },
    });

    return savedSubject;
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

  async getAccessible(
    subjectId: string,
    actor: SubjectAccessActor,
  ): Promise<Subject> {
    const subject = await this.subjectsRepository.findOne({
      where: { id: subjectId },
      relations: ['glossaryTerms'],
    });

    if (!subject) {
      throw new NotFoundException('Subject not found.');
    }

    assertSubjectAccess(actor, subject);

    return subject;
  }

  toResponse(subject: Subject): SubjectV1Response {
    return {
      ...subject,
      avatarType: subject.avatarType ?? SubjectAvatarType.DEFAULT,
      recordingCountCache: subject.recordingCountCache ?? 0,
      recordingSecondsCache: subject.recordingSecondsCache ?? 0,
      memoriesStatus:
        subject.memoriesStatus ?? SubjectReadinessStatus.NOT_STARTED,
      personaStatus: subject.personaStatus ?? SubjectReadinessStatus.NOT_STARTED,
      relationshipLabel: this.toRelationshipLabel(subject.relationship),
      regionText: this.toRegionText(subject),
      recordingCount: subject.recordingCountCache ?? 0,
      recordingSeconds: subject.recordingSecondsCache ?? 0,
    };
  }

  toResponses(subjects: Subject[]): SubjectV1Response[] {
    return subjects.map((subject) => this.toResponse(subject));
  }

  async update(
    subjectId: string,
    actorOrOwnerUserId: SubjectAccessActor | string,
    dto: UpdateSubjectDto,
  ): Promise<Subject> {
    const actor = this.toSubjectAccessActor(actorOrOwnerUserId);
    const subject = await this.getAccessible(subjectId, actor);

    Object.assign(subject, {
      ...dto,
      localeHint: dto.localeHint === undefined ? subject.localeHint : dto.localeHint,
      dialectHint:
        dto.dialectHint === undefined ? subject.dialectHint : dto.dialectHint,
      notes: dto.notes === undefined ? subject.notes : dto.notes,
    });

    await this.subjectsRepository.save(subject);
    const updatedSubject = await this.getAccessible(subject.id, actor);
    await this.appEventsService.emit({
      userId: actor.userId,
      name: 'subject.updated',
      subjectId: updatedSubject.id,
      payload: {
        relationship: updatedSubject.relationship,
        lifeStatus: updatedSubject.lifeStatus,
        hasLocaleHint: Boolean(updatedSubject.localeHint),
        hasDialectHint: Boolean(updatedSubject.dialectHint),
        hasNotes: Boolean(updatedSubject.notes),
      },
    });

    return updatedSubject;
  }

  async addGlossaryTerm(
    subjectId: string,
    actorOrOwnerUserId: SubjectAccessActor | string,
    dto: UpsertGlossaryTermDto,
  ): Promise<FamilyGlossaryTerm> {
    await this.getAccessible(
      subjectId,
      this.toSubjectAccessActor(actorOrOwnerUserId),
    );

    const term = this.glossaryRepository.create({
      subjectId,
      termType: dto.termType,
      term: dto.term,
      pronunciationHint: dto.pronunciationHint ?? null,
      meaning: dto.meaning ?? null,
    });

    const savedTerm = await this.glossaryRepository.save(term);
    await this.appEventsService.emit({
      userId: this.toSubjectAccessActor(actorOrOwnerUserId).userId,
      name: 'subject.glossary_term_added',
      subjectId,
      payload: {
        termType: savedTerm.termType,
        hasPronunciationHint: Boolean(savedTerm.pronunciationHint),
        hasMeaning: Boolean(savedTerm.meaning),
      },
    });

    return savedTerm;
  }

  async removeGlossaryTerm(
    subjectId: string,
    termId: string,
    actorOrOwnerUserId: SubjectAccessActor | string,
  ): Promise<{ deleted: true }> {
    await this.getAccessible(
      subjectId,
      this.toSubjectAccessActor(actorOrOwnerUserId),
    );
    const result = await this.glossaryRepository.delete({
      id: termId,
      subjectId,
    });

    if (result.affected === 0) {
      throw new NotFoundException('Glossary term not found.');
    }

    await this.appEventsService.emit({
      userId: this.toSubjectAccessActor(actorOrOwnerUserId).userId,
      name: 'subject.glossary_term_removed',
      subjectId,
      payload: {
        termId,
      },
    });

    return { deleted: true };
  }

  private toSubjectAccessActor(
    actorOrOwnerUserId: SubjectAccessActor | string,
  ): SubjectAccessActor {
    if (typeof actorOrOwnerUserId === 'string') {
      return {
        userId: actorOrOwnerUserId,
        role: Role.FAMILY,
      };
    }

    return actorOrOwnerUserId;
  }

  private toRelationshipLabel(relationship: string): string {
    const normalizedRelationship = relationship.trim().toLowerCase();

    return RELATIONSHIP_LABELS[normalizedRelationship] ?? relationship;
  }

  private toRegionText(subject: Subject): string | null {
    const regionParts = [subject.localeHint, subject.dialectHint].filter(
      (value): value is string => Boolean(value?.trim()),
    );

    if (regionParts.length === 0) {
      return null;
    }

    return regionParts.join(' · ');
  }
}
