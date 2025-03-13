import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Unique,
  Index,
  ManyToOne,
  JoinColumn,
  Relation,
} from 'typeorm';
import { WebProduct } from './web-product.entity';
import { WebSetProducts } from './web-product-set.entity';

@Entity({ name: 'web_set_products_relation' })
@Unique(['productSku', 'setSku'])
@Index('idx_set_sku', ['setSku'])
@Index('idx_product_sku', ['productSku'])
export class WebProductSetRelation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'product_sku', length: 20 })
  productSku: string;

  @Column({ name: 'set_sku', length: 20 })
  setSku: string;

  @Column({ type: 'tinyint', nullable: true, default: 0 })
  is_free: boolean;

  @ManyToOne(() => WebProduct, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'product_sku', referencedColumnName: 'sku' })
  product: Relation<WebProduct>;

  @ManyToOne(() => WebSetProducts, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'set_sku', referencedColumnName: 'set_sku' })
  set: Relation<WebSetProducts>;
}
