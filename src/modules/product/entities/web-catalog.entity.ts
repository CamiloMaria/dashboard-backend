import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  JoinColumn,
  ManyToOne,
  Relation,
} from 'typeorm';
import { WebProduct } from './web-product.entity';

/**
 * Entity representing product catalogs in the web shop system
 */
@Entity('web_catalogs')
@Unique('IDX_287bd4502176e3c9d8e1850a39', ['sku', 'pl'])
export class WebCatalog {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ length: 20 })
  sku: string;

  @Column({ length: 6 })
  pl: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  price: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  compare_price: number;

  @Column({ type: 'int', nullable: true })
  stock: number;

  @Column({
    type: 'tinyint',
    default: 1,
    comment: '0 if is disabled and 1 if not',
  })
  status: number;

  @Column({
    type: 'tinyint',
    width: 1,
    default: 0,
    comment:
      'Aqui se identifica si el catalogo esta tiene un promocion en web_products_promotions',
  })
  in_promotion: boolean;

  @Column({ type: 'tinyint', width: 1, default: 0 })
  in_set: boolean;

  @CreateDateColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @UpdateDateColumn({ nullable: true })
  update_at: Date;

  @ManyToOne(() => WebProduct, (product) => product.catalogs, {
    onDelete: 'CASCADE', // This reflects the ON DELETE CASCADE constraint
  })
  @JoinColumn({ name: 'sku' }) // The foreign key column
  product: Relation<WebProduct>;
}
