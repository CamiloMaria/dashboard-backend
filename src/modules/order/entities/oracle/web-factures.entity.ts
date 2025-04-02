import {
  Entity,
  Column,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  Relation,
} from 'typeorm';
import { WebOrder } from './web-order.entity';

@Entity({ name: 'WEB_FACTURAS', schema: 'INTRANET' })
export class WebFactures {
  @PrimaryColumn({ type: 'varchar', length: 20 })
  ID: string;

  @Column({ type: 'varchar', length: 20 })
  ORDEN: string;

  @Column({ type: 'varchar', length: 30 })
  FACTURAS: string;

  @Column({ type: 'varchar', length: 80 })
  DEPTO: string;

  @Column({ type: 'varchar', length: 1 })
  ESTATUS: string;

  @Column({ type: 'varchar', length: 1 })
  WEB: string;

  @Column({ type: 'varchar', length: 6 })
  TIENDA: string;

  @Column({ type: 'varchar', length: 1 })
  DELIVERY: string;

  @Column({ type: 'number', precision: 10, scale: 0 })
  ITBIS: number;

  @Column({ type: 'varchar', length: 50 })
  NCF: string;

  @Column({ type: 'varchar', length: 3 })
  TIPO_NCF: string;

  @Column({ type: 'number', precision: 10, scale: 2 })
  TOTAL: number;

  @ManyToOne(() => WebOrder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ORDEN', referencedColumnName: 'ORDEN' })
  orden: Relation<WebOrder>;
}
