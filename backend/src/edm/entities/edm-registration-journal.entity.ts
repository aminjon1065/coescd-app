import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EdmDocument } from './edm-document.entity';
import { User } from '../../users/entities/user.entity';

export type EdmRegistrationJournalType = 'incoming' | 'outgoing';
export type EdmRegistrationStatus = 'registered' | 'cancelled';

@Entity('edm_registration_journal')
export class EdmRegistrationJournal {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => EdmDocument)
  @JoinColumn({ name: 'document_id' })
  document: EdmDocument;

  @Column({ name: 'journal_type', type: 'varchar' })
  journalType: EdmRegistrationJournalType;

  @Column({ name: 'registration_number', type: 'varchar' })
  registrationNumber: string;

  @Column({ type: 'varchar', default: 'registered' })
  status: EdmRegistrationStatus;

  @Column({ name: 'registered_at', type: 'timestamp' })
  registeredAt: Date;

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt: Date | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updatedBy: User | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
