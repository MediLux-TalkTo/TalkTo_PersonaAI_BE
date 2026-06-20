import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { Role } from '../common/enums/role.enum';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  actorUserId: string | null;

  @Column({ type: 'varchar', nullable: true })
  actorRole: Role | null;

  @Column({ length: 80 })
  action: string;

  @Column({ length: 80 })
  resourceType: string;

  @Column({ type: 'varchar', nullable: true })
  resourceId: string | null;

  @Column({ type: 'uuid', nullable: true })
  subjectId: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  occurredAt: Date;
}
