import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type OrgUnitType = 'committee' | 'department' | 'division';

@Entity('org_units')
export class OrgUnit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'varchar' })
  type: OrgUnitType;

  @ManyToOne(() => OrgUnit, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: OrgUnit | null;

  // Database column is PostgreSQL ltree; mapped as string for non-breaking ORM usage.
  @Column({ type: 'varchar', nullable: true })
  path: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
