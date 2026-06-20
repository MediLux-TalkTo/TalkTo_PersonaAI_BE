import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export const PersonaFamilyReviewStatus = {
  APPROVED: 'approved',
  CHANGES_REQUESTED: 'changes_requested',
} as const;

export type PersonaFamilyReviewStatus =
  (typeof PersonaFamilyReviewStatus)[keyof typeof PersonaFamilyReviewStatus];

@Entity('persona_family_reviews')
@Index('IDX_persona_family_reviews_application', ['applicationId', 'createdAt'])
export class PersonaFamilyReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  applicationId: string;

  @Column({ type: 'uuid' })
  ownerUserId: string;

  @Column({ type: 'uuid' })
  subjectId: string;

  @Column({ type: 'uuid' })
  personaBibleId: string;

  @Column({ type: 'uuid' })
  reviewerUserId: string;

  @Column({ type: 'varchar', length: 40 })
  status: PersonaFamilyReviewStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
