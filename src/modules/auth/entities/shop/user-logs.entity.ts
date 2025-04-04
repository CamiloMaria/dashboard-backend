import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users_logs')
export class UsersLogsEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 45 })
  user: string;

  @Column({ type: 'varchar', length: 45, nullable: false })
  type_log: string;

  @Column({ type: 'varchar', length: 45, nullable: true })
  field: string;

  @Column({ type: 'text', nullable: true })
  log: string;

  @Column({
    type: 'datetime',
    nullable: false,
    default: () => 'CURRENT_TIMESTAMP',
  })
  date_timer: Date;
}
