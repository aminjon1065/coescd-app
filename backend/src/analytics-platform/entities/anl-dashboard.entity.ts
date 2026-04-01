import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('anl_dashboards')
export class AnlDashboard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'owner_id' })
  ownerId: number;

  @Column()
  title: string;

  @Column({ type: 'jsonb', default: { widgets: [] } })
  layout: Record<string, unknown>;

  @Column({ type: 'jsonb', default: {} })
  filters: Record<string, unknown>;

  @Column({ name: 'is_public', default: false })
  isPublic: boolean;

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @Column({ type: 'text', array: true, default: [] })
  tags: string[];

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'NOW()' })
  updatedAt: Date;
}
