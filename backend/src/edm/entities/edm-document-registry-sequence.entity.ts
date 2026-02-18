import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Department } from '../../department/entities/department.entity';
import { EdmDocumentType } from './edm-document.entity';

@Entity('edm_document_registry_sequences')
export class EdmDocumentRegistrySequence {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Department)
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column({ name: 'doc_type' })
  docType: EdmDocumentType;

  @Column()
  year: number;

  @Column({ name: 'last_value', default: 0 })
  lastValue: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
