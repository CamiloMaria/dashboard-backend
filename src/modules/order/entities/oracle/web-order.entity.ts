import { Column, Entity, OneToMany, PrimaryColumn, Relation } from 'typeorm';
import { WebTransactions } from './web-transactions.entity';
import { WebFactures } from './web-factures.entity';
import { WebArticles } from './web-articles.entity';

@Entity({ name: 'WEB_ORDENES', schema: 'INTRANET' })
export class WebOrder {
  @PrimaryColumn({ type: 'varchar', width: 20 })
  ID: string;

  @Column({ type: 'varchar', length: 20, nullable: false })
  ORDEN: string;

  @Column({ type: 'varchar', width: 20 })
  RNC: string;

  @Column({ type: 'varchar', length: 80 })
  NOMBRE: string;

  @Column({ type: 'varchar', length: 100 })
  APELLIDOS: string;

  @Column({ type: 'varchar', length: 220 })
  DIRECCION: string;

  @Column({ type: 'varchar', length: 80 })
  CIUDAD: string;

  @Column({ type: 'varchar', length: 220 })
  COMENTARIO: string;

  @Column({ type: 'varchar', length: 30 })
  TELEFONO: string;

  @Column({ type: 'varchar', length: 60 })
  EMAIL: string;

  @Column({ type: 'varchar', length: 100 })
  PAIS: string;

  @Column({ type: 'int', width: 1 })
  ESTATUS: number;

  @Column({ type: 'decimal', precision: 11, scale: 2, default: 0 })
  TOTAL: number;

  @Column({ type: 'decimal', precision: 11, scale: 2, default: 0 })
  ITBIS: number;

  @Column({ type: 'date', nullable: true })
  FECHA_REGISTRO: string;

  @Column({ type: 'varchar', length: 20 })
  HORA_REGISTRO: string;

  @Column({ type: 'varchar', length: 30 })
  TARJETA: string;

  @Column({ type: 'varchar', length: 1 })
  PTLOG: string;

  @Column({ type: 'varchar', length: 20 })
  CLUB: string;

  @Column({ type: 'varchar', length: 1 })
  WEB: string;

  @Column({ type: 'varchar', length: 6 })
  TIENDA: string;

  @Column({ type: 'varchar', length: 50 })
  NCF: string;

  @Column({ type: 'varchar', length: 3 })
  TIPO_NCF: string;

  @Column({ type: 'int', width: 1 })
  ESTATUS_DELIV: number;

  @Column({ type: 'varchar', length: 100 })
  RNC_NAME: string;

  @Column({ type: 'varchar', length: 100 })
  OTRO_NOMBRE: string;

  @Column({ type: 'varchar', length: 100 })
  OTRO_NOMBRE_DOC: string;

  @Column({ type: 'varchar', length: 20 })
  ORDEN_REFERENCIA: string;

  @Column({ type: 'varchar', length: 20 })
  ORDEN_DESDE: string;

  @Column({ type: 'decimal', precision: 11, scale: 2, default: 0 })
  TOTAL_DESCUENTO: number;

  @Column({ type: 'int', width: 1 })
  PRINT: number;

  @Column({ type: 'varchar', length: 40 })
  USER_ID: string;

  @Column({ type: 'varchar', length: 20 })
  ORDER_IDENTIFICATION: string;

  @Column({ type: 'varchar', length: 10 })
  VENDEDOR: string;

  @Column({ type: 'varchar', length: 50 })
  PLATAFORMAS: string;

  @OneToMany(() => WebArticles, (item) => item.orden, {
    eager: true,
    cascade: true,
  })
  ARTICULOS: Relation<WebArticles[]>;

  @OneToMany(() => WebFactures, (factures) => factures.orden, {
    eager: true,
    cascade: true,
  })
  FACTURAS: Relation<WebFactures[]>;

  @OneToMany(() => WebTransactions, (tra) => tra.orden, {
    eager: true,
    cascade: true,
  })
  TRANSACIONES: Relation<WebTransactions[]>;
}
