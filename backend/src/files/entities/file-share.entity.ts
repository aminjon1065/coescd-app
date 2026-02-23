import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { FileEntity } from './file.entity';
import { User } from '../../users/entities/user.entity';
import { Department } from '../../department/entities/department.entity';

@Entity('file_shares')
export class FileShareEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => FileEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'file_id' })
  file: FileEntity;

  @ManyToOne(() => User, { nullable: true, eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shared_with_user_id' })
  sharedWithUser: User | null;

  @ManyToOne(() => Department, {
    nullable: true,
    eager: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'shared_with_department_id' })
  sharedWithDepartment: Department | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'granted_by_id' })
  grantedBy: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
