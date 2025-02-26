import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Relation,
} from 'typeorm';
import { WebProductPromo } from './web-product-promo.entity';

/**
 * Entity representing promotions in the web shop system
 */
@Entity('web_promo')
export class WebPromo {
  @Column()
  mapa: number;

  @Column({ length: 25 })
  nro: string;

  @PrimaryColumn()
  no_promo: number;

  @Column({ length: 20, nullable: true })
  tipo_promo: string;

  @Column({ nullable: true })
  value: number;

  @Column({ type: 'date', nullable: true })
  promo_ini: Date;

  @Column({ type: 'date', nullable: true })
  promo_end: Date;

  @PrimaryColumn({ length: 6 })
  tienda: string;

  @Column({ type: 'int', width: 1, nullable: true })
  status: number;

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fecha_registro: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  fecha_update: Date;

  // Relationships
  @OneToMany(() => WebProductPromo, (productPromo) => productPromo.promo, {
    cascade: true, // Appropriate for ON DELETE CASCADE constraint
  })
  productPromos: Relation<WebProductPromo[]>;
}
