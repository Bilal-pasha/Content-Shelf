import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
} from 'typeorm';
import * as bcrypt from 'bcrypt';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  password: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatar: string | null;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'user',
  })
  role: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    name: 'oauth_provider',
  })
  oauthProvider: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'oauth_id' })
  oauthId: string | null;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'current_refresh_token_hash',
  })
  currentRefreshTokenHash: string | null;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'password_reset_token_hash',
  })
  passwordResetTokenHash: string | null;

  @Column({
    type: 'timestamp',
    nullable: true,
    name: 'password_reset_token_expires_at',
  })
  passwordResetTokenExpiresAt: Date | null;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  @BeforeInsert()
  async hashPassword(): Promise<void> {
    // Only hash password if it exists and is not already hashed
    // OAuth users may not have a password
    if (this.password && !this.password.startsWith('$2b$')) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
  }

  async comparePassword(plainPassword: string): Promise<boolean> {
    // If no password is set (OAuth user), return false
    if (!this.password) {
      return false;
    }
    return bcrypt.compare(plainPassword, this.password);
  }
}
