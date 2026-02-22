import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

export type BusinessRoleDefaultScope =
  | 'self'
  | 'department'
  | 'subtree'
  | 'global';

@Entity('iam_business_roles')
@Unique('UQ_IAM_BUSINESS_ROLES_CODE', ['code'])
export class BusinessRoleEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  code: string;

  @Column()
  name: string;

  @Column({ name: 'default_scope', type: 'varchar' })
  defaultScope: BusinessRoleDefaultScope;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
