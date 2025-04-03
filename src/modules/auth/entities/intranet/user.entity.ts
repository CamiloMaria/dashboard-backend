import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('adm_usuarios')
export class UserEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  usuario?: string;

  @Column({
    type: 'integer',
    nullable: true,
  })
  codigo?: number;

  @Column({
    type: 'varchar',
    length: 45,
    nullable: true,
  })
  nombre?: string;

  @Column({
    type: 'varchar',
    length: 45,
    nullable: true,
  })
  apellido?: string;

  @Column({
    type: 'varchar',
    length: 45,
    nullable: true,
  })
  cargo?: string;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    default: '000-000-0000',
  })
  telefono: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  email?: string;

  @Column({
    type: 'integer',
    nullable: true,
  })
  id_rol?: number;

  @Column({
    type: 'integer',
    nullable: true,
    default: 3,
  })
  privilegio: number;

  @Column({
    type: 'integer',
    nullable: true,
    default: 1,
  })
  status: number;

  @Column({
    type: 'varchar',
    length: 6,
    nullable: true,
  })
  tienda?: string;

  @Column({
    type: 'varchar',
    length: 60,
    nullable: true,
  })
  pregunta?: string;

  @Column({
    type: 'varchar',
    length: 60,
    nullable: true,
  })
  repuesta?: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  password?: string;

  @Column({
    type: 'longblob',
    nullable: true,
  })
  foto?: any;

  @Column({
    type: 'date',
    nullable: true,
  })
  fecha?: Date;

  @Column({
    type: 'text',
    nullable: true,
  })
  uuid?: string;

  @Column({
    type: 'varchar',
    length: 1,
    nullable: true,
    default: 'D',
  })
  web: string;

  @Column({
    type: 'tinyint',
    default: 0,
    nullable: true,
  })
  proveedor: number;

  @Column({
    type: 'tinyint',
    default: 1,
    nullable: true,
  })
  tipo_user: number;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  rnc?: string;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  ficha?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  photo_url?: string;

  @Column({
    type: 'varchar',
    length: 5,
    nullable: true,
  })
  verification_code?: string;

  @Column({
    type: 'smallint',
    default: 0,
    nullable: true,
  })
  question_attemps: number;

  @Column({
    type: 'smallint',
    default: 0,
    nullable: true,
  })
  password_attemps: number;
}
