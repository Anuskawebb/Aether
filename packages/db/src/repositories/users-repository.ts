import { randomUUID } from 'crypto';
import { db, users, eq } from '../client.js';
import { type UserRow, type InsertUser } from '../schema/users.js';

export type { UserRow };

export interface CreateUserParams {
  email?:         string;
  walletAddress?: string;
  displayName?:   string;
  privyId?:       string;
}

export interface UpdateUserParams {
  email?:         string;
  walletAddress?: string;
  displayName?:   string;
  privyId?:       string;
}

export class UsersRepository {
  static async create(params: CreateUserParams): Promise<UserRow> {
    const now = new Date();
    const row: InsertUser = {
      id:            randomUUID(),
      email:         params.email         ?? null,
      walletAddress: params.walletAddress ?? null,
      displayName:   params.displayName   ?? null,
      privyId:       params.privyId       ?? null,
      createdAt:     now,
      updatedAt:     now,
    };

    const [inserted] = await db
      .insert(users)
      .values(row)
      .returning();

    if (!inserted) throw new Error('Failed to insert user');
    return inserted;
  }

  static async getById(id: string): Promise<UserRow | null> {
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return rows[0] ?? null;
  }

  static async getByEmail(email: string): Promise<UserRow | null> {
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return rows[0] ?? null;
  }

  static async getByWalletAddress(walletAddress: string): Promise<UserRow | null> {
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.walletAddress, walletAddress.toLowerCase()))
      .limit(1);
    return rows[0] ?? null;
  }

  static async getByPrivyId(privyId: string): Promise<UserRow | null> {
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.privyId, privyId))
      .limit(1);
    return rows[0] ?? null;
  }

  static async update(id: string, params: UpdateUserParams): Promise<UserRow | null> {
    const patch: Partial<InsertUser> = { updatedAt: new Date() };
    if (params.email         !== undefined) patch.email         = params.email;
    if (params.walletAddress !== undefined) patch.walletAddress = params.walletAddress;
    if (params.displayName   !== undefined) patch.displayName   = params.displayName;
    if (params.privyId       !== undefined) patch.privyId       = params.privyId;

    const [updated] = await db
      .update(users)
      .set(patch)
      .where(eq(users.id, id))
      .returning();

    return updated ?? null;
  }
}
