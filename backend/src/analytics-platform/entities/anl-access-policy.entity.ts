import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('anl_access_policies')
export class AnlAccessPolicy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'principal_id' })
  principalId: number;

  @Column({ name: 'resource_type' })
  resourceType: string;

  @Column({ name: 'resource_id', nullable: true })
  resourceId: string;

  @Column({ name: 'can_read', default: true })
  canRead: boolean;

  @Column({ name: 'can_export', default: false })
  canExport: boolean;

  @Column({ name: 'can_manage', default: false })
  canManage: boolean;

  @Column({ name: 'granted_by', nullable: true })
  grantedBy: number;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt: Date;
}
