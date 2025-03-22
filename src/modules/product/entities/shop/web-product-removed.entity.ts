import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('web_products_removed')
export class WebProductRemoved {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 13, nullable: false, unique: true })
  sku: string;

  @Column({ type: 'longtext', nullable: true })
  text: string;

  @Column({ type: 'varchar', length: 45, nullable: true })
  user: string;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  create_at: Date;
}
