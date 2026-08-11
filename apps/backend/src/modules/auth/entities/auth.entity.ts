export class AuthSessionEntity {
  id!: string;
  userId!: string;
  token!: string;
  createdAt!: Date;
  expiresAt!: Date;
  isActive!: boolean;
}
