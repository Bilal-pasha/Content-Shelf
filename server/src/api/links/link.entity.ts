import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../user/user.entity';

export type LinkSource =
  | 'instagram'
  | 'facebook'
  | 'twitter'
  | 'tiktok'
  | 'youtube'
  | 'linkedin'
  | 'other';

@Entity('links')
export class Link {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 2048 })
  url: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'other',
  })
  source: LinkSource;

  @Column({ type: 'varchar', length: 500, nullable: true })
  title: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'category' })
  category: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'folder_id' })
  folderId: string | null;

  @Column({
    type: 'varchar',
    length: 2048,
    nullable: true,
    name: 'thumbnail_url',
  })
  thumbnailUrl: string | null;

  // TypeORM has no native `vector` type. The real column is vector(1536)
  // (see migration); this field is typed `text` + select:false only so a
  // raw-query result can be read back if ever needed — writes/similarity
  // queries always go through raw SQL, never through this field.
  @Column({ type: 'text', nullable: true, select: false })
  embedding: string | null;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;
}
