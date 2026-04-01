import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('anl_kpi_definitions')
export class AnlKpiDefinition {
  @PrimaryColumn()
  code: string;

  @Column({ name: 'name_ru' })
  nameRu: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  formula: string;

  @Column({ nullable: true })
  unit: string;

  @Column({ type: 'jsonb', nullable: true })
  thresholds: { warning?: number; critical?: number; direction?: 'up_bad' | 'down_bad' };

  @Column({ name: 'scope_levels', type: 'text', array: true, default: ['global'] })
  scopeLevels: string[];

  @Column({ name: 'refresh_cron', default: '0 * * * *' })
  refreshCron: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
