import {
  Column,
  Entity,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  Relation,
} from 'typeorm';
import { WebOrder } from './web-order.entity';

@Entity({ name: 'WEB_ARTICULOS', schema: 'INTRANET' })
export class WebArticles {
  @PrimaryColumn('varchar', { length: 20 })
  ID: string;

  @Column('varchar', { length: 20 })
  ORDEN: string;

  @Column('varchar', { length: 20 })
  FACTURA: string;

  @Column('number', { precision: 10, scale: 2 })
  CANT: number;

  @Column('varchar', { length: 16 })
  EAN: string;

  @Column('varchar', { length: 100 })
  DESCRIPCION: string;

  @Column('number', { precision: 10, scale: 2 })
  PRECIO: number;

  @Column('number', { precision: 10, scale: 2 })
  TOTAL: number;

  @Column('number', { precision: 1, scale: 0 })
  ESTATUS: number;

  @Column('date')
  FECHA: Date;

  @Column('varchar', { length: 1 })
  WEB: string;

  @Column('varchar', { length: 20 })
  UNMANEJO: string;

  @Column('number', { precision: 11, scale: 2, nullable: true })
  TOTAL_DISCOUNT: number | null;

  @ManyToOne(() => WebOrder, (webOrders) => webOrders.ORDEN, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ORDEN', referencedColumnName: 'ORDEN' })
  orden: Relation<WebOrder>;
}
