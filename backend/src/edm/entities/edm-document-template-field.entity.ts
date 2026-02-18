import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EdmDocumentTemplate } from './edm-document-template.entity';

export type EdmDocumentTemplateFieldKey =
  | 'title'
  | 'subject'
  | 'summary'
  | 'resolutionText'
  | 'dueAt'
  | 'confidentiality'
  | 'type';

@Entity('edm_document_template_fields')
export class EdmDocumentTemplateField {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => EdmDocumentTemplate, (template) => template.fields, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'template_id' })
  template: EdmDocumentTemplate;

  @Column({ name: 'field_key', type: 'varchar' })
  fieldKey: EdmDocumentTemplateFieldKey;

  @Column({ type: 'varchar' })
  label: string;

  @Column({ name: 'field_type', type: 'varchar', default: 'text' })
  fieldType: string;

  @Column({ name: 'is_required', type: 'boolean', default: false })
  isRequired: boolean;

  @Column({ name: 'is_readonly', type: 'boolean', default: false })
  isReadonly: boolean;

  @Column({ name: 'default_value', type: 'text', nullable: true })
  defaultValue: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 100 })
  sortOrder: number;

  @Column({ name: 'validation_rules', type: 'jsonb', nullable: true })
  validationRules: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
