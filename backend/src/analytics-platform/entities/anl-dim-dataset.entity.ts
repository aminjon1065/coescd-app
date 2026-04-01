import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('anl_dim_dataset')
export class AnlDimDataset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ name: 'source_type' })
  sourceType: string;

  @Column({ name: 'schema_def', type: 'jsonb', nullable: true })
  schemaDef: Record<string, unknown>;

  @Column({ name: 'owner_id', nullable: true })
  ownerId: number;

  @Column({ name: 'is_public', default: false })
  isPublic: boolean;

  @Column({ type: 'text', array: true, default: [] })
  tags: string[];

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'NOW()' })
  updatedAt: Date;
}
