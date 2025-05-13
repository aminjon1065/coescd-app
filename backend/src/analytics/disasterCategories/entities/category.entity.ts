import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { DisasterType } from '../../disasterTypes/entities/disaster-type.entity';

@Entity('disaster_categories')
export class DisasterCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @OneToMany(() => DisasterType, (type) => type.category)
  types: DisasterType[];
}
