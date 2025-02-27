import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'web_users_permissions' })
export class WebUsersPermissions {
  @PrimaryColumn({ type: 'varchar', length: 250, unique: true })
  username: string;

  @Column({ name: 'allowed_pages', type: 'json', nullable: false })
  allowedPages: string[];

  @Column({
    name: 'isActive',
    type: 'tinyint',
    default: 1,
  })
  isActive: number;

  @Column({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @Column({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
