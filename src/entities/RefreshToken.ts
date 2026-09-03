import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from "typeorm";
import { User } from "./User";

@Entity({ name: "refresh_tokens" })
export class RefreshToken {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => User, user => user.refreshTokens, { onDelete: "CASCADE" })
  user!: User;

  @Column()
  tokenHash!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: "timestamp with time zone" })
  expiresAt!: Date;

  @Column({ default: false })
  revoked!: boolean;

  @Column({ nullable: true })
  replacedByTokenId?: string | null;
}
