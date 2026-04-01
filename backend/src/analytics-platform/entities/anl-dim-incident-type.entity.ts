import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('anl_dim_incident_type')
export class AnlDimIncidentType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  code: string;

  @Column({ name: 'name_ru' })
  nameRu: string;

  @Column()
  category: string;

  @Column({ name: 'severity_base', type: 'smallint', nullable: true })
  severityBase: number;

  @Column({ name: 'response_sla_hours', nullable: true })
  responseSlaHours: number;
}
