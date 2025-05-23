import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Unique,
  OneToMany,
  Relation,
} from 'typeorm';
import { WebProduct } from './web-product.entity';

/**
 * Entity representing product groups in the web shop system
 */
@Entity('web_products_group')
@Unique('group_UNIQUE', ['group_sap'])
export class WebProductGroup {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ length: 10 })
  group_sap: string;

  @Column({ length: 45, nullable: true })
  description: string;

  @Column({ length: 10, nullable: true })
  depto: string;

  @Column({ length: 45, nullable: true })
  depto_sap: string;

  @Column({ length: 45, nullable: true })
  area: string;

  @Column({ length: 45, nullable: true })
  cat_app: string;

  @Column('text', { nullable: true })
  shops_stock: string;

  @Column('int', { width: 1, default: 1 })
  status: number;

  @Column({ length: 45, nullable: true })
  level2: string;

  @Column({ length: 45, nullable: true })
  level3: string;

  @Column({ length: 10, nullable: true })
  level1_instaleap: string;

  @Column({ length: 10, nullable: true })
  level2_instaleap: string;

  @Column({ length: 10, nullable: true })
  level3_instaleap: string;

  @Column('int', { default: 0 })
  bigItems: number;

  @Column({ length: 1, default: 'T' })
  delivery: string;

  @Column({ length: 45, nullable: true })
  delivery_depto: string;

  @OneToMany(() => WebProduct, (product) => product.group)
  products: Relation<WebProduct[]>;
}
