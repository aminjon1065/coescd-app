import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('anl_data_sources')
export class AnlDataSource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  type: string;

  @Column({ type: 'jsonb' })
  config: Record<string, unknown>;

  @Column({ name: 'schema_def', type: 'jsonb', nullable: true })
  schemaDef: Record<string, unknown>;

  @Column({ name: 'last_fetched', type: 'timestamptz', nullable: true })
  lastFetched: Date;

  @Column({ name: 'last_status', nullable: true })
  lastStatus: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt: Date;
}
