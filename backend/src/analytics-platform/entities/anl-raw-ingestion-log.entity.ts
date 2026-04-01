import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('anl_raw_ingestion_log')
export class AnlRawIngestionLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'source_type' })
  sourceType: string;

  @Column({ name: 'source_key' })
  sourceKey: string;

  @Column({ name: 'batch_id', type: 'uuid' })
  batchId: string;

  @Column({ name: 'raw_payload', type: 'jsonb' })
  rawPayload: Record<string, unknown>;

  @Column({ name: 'row_count', nullable: true })
  rowCount: number;

  @Column({ default: 'pending' })
  status: string;

  @Column({ name: 'error_detail', nullable: true })
  errorDetail: string;

  @Column({ name: 'ingested_at', type: 'timestamptz', default: () => 'NOW()' })
  ingestedAt: Date;

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt: Date;
}
