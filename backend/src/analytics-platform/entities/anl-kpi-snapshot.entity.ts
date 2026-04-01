import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('anl_kpi_snapshots')
export class AnlKpiSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'captured_at', type: 'timestamptz' })
  capturedAt: Date;

  @Column({ name: 'kpi_code' })
  kpiCode: string;

  @Column({ name: 'scope_type', default: 'global' })
  scopeType: string;

  @Column({ name: 'scope_value', nullable: true })
  scopeValue: string;

  @Column({ type: 'numeric', precision: 20, scale: 6 })
  value: number;

  @Column({ nullable: true })
  unit: string;

  @Column({ nullable: true })
  trend: string;

  @Column({ name: 'vs_prev_pct', type: 'numeric', precision: 8, scale: 2, nullable: true })
  vsPrevPct: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;
}
