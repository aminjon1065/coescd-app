import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('anl_pipeline_runs')
export class AnlPipelineRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'source_id', type: 'uuid', nullable: true })
  sourceId: string;

  @Column({ name: 'queue_name' })
  queueName: string;

  @Column({ default: 'queued' })
  status: string;

  @Column({ name: 'records_in', nullable: true })
  recordsIn: number;

  @Column({ name: 'records_out', nullable: true })
  recordsOut: number;

  @Column({ name: 'records_err', nullable: true })
  recordsErr: number;

  @Column({ name: 'error_log', type: 'jsonb', nullable: true })
  errorLog: Record<string, unknown>;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date;

  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
  finishedAt: Date;

  @Column({ name: 'triggered_by', default: 'scheduler' })
  triggeredBy: string;
}
