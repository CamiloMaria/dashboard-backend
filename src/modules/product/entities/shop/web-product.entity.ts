import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Unique,
  Relation,
} from 'typeorm';
import { WebProductImage } from './web-product-image.entity';
import { WebCatalog } from './web-catalog.entity';

/**
 * Entity representing products in the web shop system
 */
@Entity('web_products')
@Unique('constraint_sku', ['sku'])
export class WebProduct {
  @PrimaryGeneratedColumn('increment')
  num: number;

  @Column({ length: 20, nullable: true })
  sku: string;

  @Column({ length: 150, nullable: true })
  title: string;

  @Column('decimal', { precision: 11, scale: 2, nullable: true })
  price: number;

  @Column('decimal', { precision: 11, scale: 2, nullable: true })
  compare_price: number;

  @Column({ length: 40, nullable: true })
  matnr: string;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  create_at: Date;

  @UpdateDateColumn({ nullable: true })
  update_at: Date;

  @Column({ type: 'datetime', nullable: true })
  update_at_price: Date;

  @Column({ length: 20, nullable: true, comment: 'electro o super' })
  depto: string;

  @Column({
    type: 'int',
    width: 1,
    default: 1,
    comment: '0 Articulo nuevo, 1 Articulo ya agregado',
  })
  status_new: number;

  @Column({ length: 10, nullable: true })
  grupo: string;

  @Column({
    type: 'int',
    width: 1,
    nullable: true,
    comment: '0 = Sin ITBIS, 1 = 18%, 2 = 16%',
  })
  type_tax: number;

  @Column({ type: 'text', nullable: true })
  tags: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  images_url: string;

  @Column({
    type: 'int',
    width: 1,
    default: 0,
    comment: 'Linea blanca = 1 todos los demas = 0',
  })
  centerd: number;

  @Column({ length: 20, nullable: true })
  unmanejo: string;

  @Column({ length: 20, nullable: true })
  tpean: string;

  @Column({ type: 'tinyint', width: 1, default: 0 })
  borrado: boolean;

  @Column({ length: 45, nullable: true })
  userAdd: string;

  @Column({ length: 45, nullable: true })
  userUpd: string;

  @Column({ type: 'int', width: 1, default: 0 })
  without_stock: number;

  @Column({ type: 'tinyint', width: 1, default: 0 })
  is_set: boolean;

  @Column({ length: 255, nullable: true })
  borrado_comment: string;

  @Column({ type: 'text', nullable: true })
  shops_disable: string;

  @Column({ type: 'text', nullable: true })
  description_instaleap: string;

  @Column({ type: 'int', default: 10 })
  security_stock: number;

  @Column('decimal', { precision: 4, scale: 2, default: 1.0 })
  click_multiplier: number;

  @Column({ length: 60, nullable: true })
  brand: string;

  @Column({ type: 'longtext', nullable: true })
  search_keywords: string;

  @Column({ type: 'mediumtext', nullable: true })
  specifications: string;

  @Column({ type: 'text', nullable: true })
  slug: string;

  @Column({ type: 'longtext', nullable: true })
  disabled_shops: string;

  @Column({ type: 'text', nullable: true })
  disabled_shops_comment: string;

  // Relationships
  @OneToMany(() => WebProductImage, (image) => image.product, {
    cascade: true, // Appropriate for ON DELETE CASCADE constraint
  })
  images: Relation<WebProductImage[]>;

  @OneToMany(() => WebCatalog, (catalog) => catalog.product, {
    cascade: true, // Appropriate for ON DELETE CASCADE constraint
  })
  catalogs: Relation<WebCatalog[]>;
}
