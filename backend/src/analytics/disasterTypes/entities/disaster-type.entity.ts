import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DisasterCategory } from '../../disasterCategories/entities/category.entity';

@Entity('disaster_types')
export class DisasterType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @ManyToOne(() => DisasterCategory, (category) => category.types, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'category_id' })
  category: DisasterCategory;
}
