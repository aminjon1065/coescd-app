import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('anl_dim_resource')
export class AnlDimResource {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  code: string;

  @Column({ name: 'name_ru' })
  nameRu: string;

  @Column()
  type: string;

  @Column()
  unit: string;

  @Column({ name: 'department_id', nullable: true })
  departmentId: number;
}
