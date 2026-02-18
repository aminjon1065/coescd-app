import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

export type BulkImportOperationType = 'dry-run' | 'apply';
export type BulkImportOperationStatus = 'completed' | 'partial' | 'failed';

@Entity('bulk_import_operations')
export class BulkImportOperation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'operation_id', type: 'varchar', unique: true })
  operationId: string;

  @Column({ name: 'session_id', type: 'varchar', nullable: true })
  sessionId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actor_id' })
  actor: User | null;

  @Column({ type: 'varchar' })
  type: BulkImportOperationType;

  @Column({ type: 'varchar' })
  status: BulkImportOperationStatus;

  @Column({ type: 'varchar', nullable: true })
  mode: string | null;

  @Column({ name: 'idempotency_key', type: 'varchar', nullable: true })
  idempotencyKey: string | null;

  @Column({ name: 'total_rows', type: 'int', nullable: true })
  totalRows: number | null;

  @Column({ name: 'valid_rows', type: 'int', nullable: true })
  validRows: number | null;

  @Column({ name: 'invalid_rows', type: 'int', nullable: true })
  invalidRows: number | null;

  @Column({ name: 'created_count', type: 'int', nullable: true })
  createdCount: number | null;

  @Column({ name: 'updated_count', type: 'int', nullable: true })
  updatedCount: number | null;

  @Column({ name: 'skipped_count', type: 'int', nullable: true })
  skippedCount: number | null;

  @Column({ name: 'failed_count', type: 'int', nullable: true })
  failedCount: number | null;

  @Column({ name: 'warnings_count', type: 'int', nullable: true })
  warningsCount: number | null;

  @Column({ name: 'errors_count', type: 'int', nullable: true })
  errorsCount: number | null;

  @Column({ type: 'json', nullable: true })
  details: Record<string, unknown> | null;

  @Column({ type: 'varchar', nullable: true })
  ip: string | null;

  @Column({ name: 'user_agent', type: 'varchar', nullable: true })
  userAgent: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
