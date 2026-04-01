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
import { type Relation } from 'typeorm';
import { TmTaskBoard } from './tm-task-board.entity';

@Entity('tm_task_board_columns')
export class TmTaskBoardColumn {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => TmTaskBoard, (board) => board.columns, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'board_id' })
  board: Relation<TmTaskBoard>;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 30 })
  status: string;

  @Column({ name: 'order_index', type: 'int', default: 0 })
  orderIndex: number;

  @Column({ type: 'varchar', length: 7, default: '#94a3b8' })
  color: string;

  @Column({ name: 'wip_limit', type: 'int', nullable: true, default: null })
  wipLimit: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
