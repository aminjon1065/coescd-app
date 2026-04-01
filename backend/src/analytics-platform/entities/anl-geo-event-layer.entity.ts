import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('anl_geo_event_layers')
export class AnlGeoEventLayer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'incident_id', type: 'uuid', nullable: true })
  incidentId: string;

  @Column({ name: 'event_time', type: 'timestamptz' })
  eventTime: Date;

  @Column({ type: 'geometry', srid: 4326, nullable: true })
  geometry: string;

  @Column({ name: 'layer_type' })
  layerType: string;

  @Column({ type: 'jsonb', default: '{}' })
  properties: Record<string, unknown>;
}
