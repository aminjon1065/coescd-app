import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('anl_fact_resource_deployment')
export class AnlFactResourceDeployment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'deployed_at', type: 'timestamptz' })
  deployedAt: Date;

  @Column({ name: 'incident_id', type: 'uuid', nullable: true })
  incidentId: string;

  @Column({ name: 'resource_id', nullable: true })
  resourceId: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  quantity: number;

  @Column({ name: 'geo_code', nullable: true })
  geoCode: string;

  @Column({ name: 'department_id', nullable: true })
  departmentId: number;

  @Column({ name: 'cost_som', type: 'numeric', precision: 15, scale: 2, nullable: true })
  costSom: number;

  @Column({ name: 'returned_at', type: 'timestamptz', nullable: true })
  returnedAt: Date;
}
