import {
  Entity,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Relation,
  PrimaryColumn,
} from 'typeorm';
import { WebPromo } from './web-promo.entity';
import { WebProduct } from './web-product.entity';

/**
 * Entity representing product promotions in the web shop system
 */
@Entity('web_products_promo')
export class WebProductPromo {
  @PrimaryColumn()
  no_promo: number;

  @Column({ length: 20, nullable: true })
  sku: string;

  @Column({ nullable: true })
  matnr: number;

  @Column('decimal', {
    precision: 11,
    scale: 2,
    nullable: true,
    comment: 'Precio del Producto',
  })
  price: number;

  @Column('decimal', {
    precision: 11,
    scale: 2,
    nullable: true,
    comment: 'Precio de la promoción',
  })
  compare_price: number;

  @CreateDateColumn({
    type: 'timestamp',
    nullable: true,
    default: () => 'CURRENT_TIMESTAMP',
  })
  create_at: Date;

  @Column({ type: 'int', width: 1, default: 1 })
  status: number;

  @Column({ length: 6, nullable: true })
  shop: string;

  // Relationships
  @ManyToOne(() => WebPromo, (promo) => promo.productPromos, {
    onDelete: 'CASCADE', // This reflects the ON DELETE CASCADE constraint
  })
  @JoinColumn({ name: 'no_promo' }) // The foreign key column
  promo: Relation<WebPromo>;

  // Optional relationship to WebProduct if needed
  @ManyToOne(() => WebProduct, { nullable: true })
  @JoinColumn({ name: 'sku', referencedColumnName: 'sku' })
  product: Relation<WebProduct>;
}
