import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export type CallStatus = 'pending' | 'active' | 'missed' | 'rejected' | 'ended';

@Entity('calls')
export class Call {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL', eager: false })
  @JoinColumn({ name: 'initiator_id' })
  initiator: User | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL', eager: false })
  @JoinColumn({ name: 'receiver_id' })
  receiver: User | null;

  @Column({ length: 20, default: 'pending' })
  status: CallStatus;

  @Column({ name: 'has_video', default: false })
  hasVideo: boolean;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt: Date | null;

  @Column({ name: 'duration_sec', type: 'int', nullable: true })
  durationSec: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
