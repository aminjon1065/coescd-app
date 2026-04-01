import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('anl_fact_weather')
export class AnlFactWeather {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'observed_at', type: 'timestamptz' })
  observedAt: Date;

  @Column({ name: 'station_code' })
  stationCode: string;

  @Column({ name: 'geo_code', nullable: true })
  geoCode: string;

  @Column({ name: 'temp_celsius', type: 'numeric', precision: 5, scale: 2, nullable: true })
  tempCelsius: number;

  @Column({ name: 'humidity_pct', type: 'numeric', precision: 5, scale: 2, nullable: true })
  humidityPct: number;

  @Column({ name: 'precip_mm', type: 'numeric', precision: 8, scale: 3, nullable: true })
  precipMm: number;

  @Column({ name: 'wind_speed_ms', type: 'numeric', precision: 6, scale: 2, nullable: true })
  windSpeedMs: number;

  @Column({ name: 'river_level_cm', type: 'numeric', precision: 8, scale: 2, nullable: true })
  riverLevelCm: number;

  @Column({ name: 'snow_depth_cm', type: 'numeric', precision: 7, scale: 2, nullable: true })
  snowDepthCm: number;

  @Column({ name: 'raw_json', type: 'jsonb', nullable: true })
  rawJson: Record<string, unknown>;
}
