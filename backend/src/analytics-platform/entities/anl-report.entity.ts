import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('anl_reports')
export class AnlReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
  template: string;

  @Column({ type: 'jsonb', default: {} })
  params: Record<string, unknown>;

  @Column({ default: 'pending' })
  status: string;

  @Column({ name: 'file_key', nullable: true })
  fileKey: string;

  @Column({ name: 'owner_id' })
  ownerId: number;

  @Column({ name: 'requested_at', type: 'timestamptz', default: () => 'NOW()' })
  requestedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date;
}
