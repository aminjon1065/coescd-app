import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Department } from '../../department/entities/department.entity';
import { EdmDocumentType } from './edm-document.entity';
import { EdmDocumentTemplateField } from './edm-document-template-field.entity';

export type EdmDocumentTemplateScope = 'department' | 'global';

@Entity('edm_document_templates')
export class EdmDocumentTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'document_type', type: 'varchar' })
  documentType: EdmDocumentType;

  @Column({ name: 'scope_type', type: 'varchar' })
  scopeType: EdmDocumentTemplateScope;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'department_id' })
  department: Department | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updatedBy: User | null;

  @OneToMany(() => EdmDocumentTemplateField, (field) => field.template, {
    cascade: true,
  })
  fields: EdmDocumentTemplateField[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;
}
