import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Department } from '../../department/entities/department.entity';

export type DelegationScopeType = 'department' | 'global';
export type DelegationStatus = 'active' | 'revoked' | 'expired';

@Entity('iam_delegations')
export class IamDelegation {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'delegator_user_id' })
  delegatorUser: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'delegate_user_id' })
  delegateUser: User;

  @Column({ name: 'scope_type' })
  scopeType: DelegationScopeType;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'scope_department_id' })
  scopeDepartment: Department | null;

  @Column({ name: 'permission_subset', type: 'jsonb' })
  permissionSubset: string[];

  @Column({ name: 'valid_from', type: 'timestamp' })
  validFrom: Date;

  @Column({ name: 'valid_to', type: 'timestamp' })
  validTo: Date;

  @Column()
  status: DelegationStatus;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
