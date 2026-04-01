import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('edm_v2_audit_logs')
export class EdmV2AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'entity_type', length: 50 })
  entityType: string;

  /** UUID or numeric ID serialised as string */
  @Column({ name: 'entity_id', length: 100 })
  entityId: string;

  @Column({ length: 100 })
  action: string;

  @ManyToOne(() => User, { nullable: true, eager: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actor_id' })
  actor: User | null;

  @Column({ name: 'actor_id', nullable: true, type: 'int' })
  actorId: number | null;

  @Column({ name: 'actor_ip', length: 45, nullable: true, type: 'varchar' })
  actorIp: string | null;

  @Column({ name: 'actor_agent', length: 500, nullable: true, type: 'varchar' })
  actorAgent: string | null;

  @Column({ type: 'jsonb', nullable: true })
  changes: Record<string, [unknown, unknown]> | null;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  context: Record<string, unknown>;

  @Column({ name: 'occurred_at', type: 'timestamptz', default: () => 'NOW()' })
  occurredAt: Date;
}
