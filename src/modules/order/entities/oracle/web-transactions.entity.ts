import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';
import { WebOrder } from './web-order.entity';

@Entity({ name: 'WEB_TRANSACIONES', schema: 'INTRANET' })
export class WebTransactions extends BaseEntity {
  @PrimaryColumn({ type: 'varchar', length: 20 })
  ID: string;

  @Column({ type: 'varchar', length: 20 })
  ORDEN: string;

  @Column({ type: 'decimal', precision: 11, scale: 2, default: 0 })
  TOTAL: number;

  @Column({ type: 'varchar', length: 30 })
  TARJETA: string;

  @Column({ type: 'varchar', length: 20 })
  APROBACION: string;

  @Column({ type: 'varchar', length: 20 })
  REFERENCIA: string;

  @Column({ type: 'int', width: 1 })
  ESTATUS: number;

  @Column({ type: 'varchar', length: 150 })
  MENSAJE: string;

  @Column({ type: 'date', nullable: true })
  FECHA_APROBACION: string;

  @Column({ type: 'varchar', length: 15 })
  HORA_APROBACION: string;

  @Column({ type: 'varchar', length: 1 })
  WEB: string;

  @Column({ type: 'varchar', length: 30 })
  TRANS_ID: string;

  @Column({ type: 'decimal', precision: 11, scale: 2, default: 0 })
  TOTAL_AUT: number;

  @Column({ type: 'varchar', length: 40 })
  KIND: string;

  @Column({ type: 'int', width: 3 })
  TIPO_PAGO: number;

  @Column({ type: 'varchar', length: 40 })
  GATEWAY: string;

  @ManyToOne(() => WebOrder, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'ORDEN',
    referencedColumnName: 'ORDEN',
  })
  orden: Relation<WebOrder>;
}
