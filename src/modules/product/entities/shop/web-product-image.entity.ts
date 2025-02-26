import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Relation,
} from 'typeorm';
import { WebProduct } from './web-product.entity';

/**
 * Entity representing product images in the web shop system
 */
@Entity('web_products_images')
export class WebProductImage {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ nullable: true })
  product_id: number;

  @Column({ length: 13, nullable: true })
  sku: string;

  @Column({ nullable: true })
  position: number;

  @Column({ nullable: true })
  width: number;

  @Column({ nullable: true })
  height: number;

  @Column({ length: 45, nullable: true })
  alt: string;

  @Column({ type: 'text', nullable: true })
  src: string;

  @Column({ type: 'longblob', nullable: true })
  image_base64: Buffer;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @UpdateDateColumn({ nullable: true })
  updated_at: Date;

  @Column({ length: 60, nullable: true })
  id_shopify: string;

  @Column({ type: 'int', width: 1, default: 0 })
  status: number;

  @Column({ type: 'text', nullable: true })
  src_cloudflare: string;

  @Column({ type: 'text', nullable: true })
  id_cloudflare: string;

  // Relationship to the product
  @ManyToOne(() => WebProduct, (product) => product.images, {
    onDelete: 'CASCADE', // This reflects the ON DELETE CASCADE constraint
  })
  @JoinColumn({ name: 'product_id' }) // The foreign key column
  product: Relation<WebProduct>;
}
