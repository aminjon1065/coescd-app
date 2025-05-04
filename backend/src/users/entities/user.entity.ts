import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { IsOptional } from 'class-validator';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ unique: true })
  email: string;
  @Column()
  password: string;
  @Column()
  name: string;
  @Column()
  @IsOptional()
  createdAt?: Date;
  @Column()
  @IsOptional()
  updatedAd?: Date;
  @Column({ default: false })
  isVerified: boolean;
}
