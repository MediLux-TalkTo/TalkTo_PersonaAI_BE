import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TranscriptRedaction } from './transcript-redaction.entity';
import { type MaskingSpanKind, type RedactionSourceType } from './masking.constants';

@Entity('masking_spans')
@Index('IDX_masking_spans_redaction', ['redactionId'])
@Index('IDX_masking_spans_source', ['sourceType', 'sourceId'])
export class MaskingSpan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  redactionId: string;

  @ManyToOne(() => TranscriptRedaction, (redaction) => redaction.spans, {
    eager: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'redactionId' })
  redaction?: TranscriptRedaction;

  @Column({ type: 'varchar', length: 40 })
  sourceType: RedactionSourceType;

  @Column({ type: 'uuid' })
  sourceId: string;

  @Column({ type: 'varchar', length: 40 })
  kind: MaskingSpanKind;

  @Column({ type: 'integer' })
  startOffset: number;

  @Column({ type: 'integer' })
  endOffset: number;

  @Column({ type: 'varchar', length: 80 })
  replacement: string;

  @Column({ type: 'double precision' })
  confidence: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
