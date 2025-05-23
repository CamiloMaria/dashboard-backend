import { Entity, Column, PrimaryColumn, OneToMany, Relation } from 'typeorm';
import { WebProductSetRelation } from './web-product-set-relation.entity';

@Entity('web_set_products')
export class WebSetProducts {
  @PrimaryColumn({ length: 20 })
  set_sku: string;

  @Column({ type: 'text', nullable: true })
  title: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price: number;

  @Column({ type: 'decimal', precision: 11, scale: 2, nullable: true })
  compare_price: number;

  @Column({ length: 45, nullable: true })
  area: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP(6)' })
  create_at: Date;

  @Column({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP(6)',
    onUpdate: 'CURRENT_TIMESTAMP(6)',
  })
  update_at: Date;

  @Column({ type: 'tinyint', default: 1 })
  status: number;

  @OneToMany(() => WebProductSetRelation, (relations) => relations.set)
  relations: Relation<WebProductSetRelation[]>;
}
