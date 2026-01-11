'use server'

import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/authOptions';
import { getDb } from '@/data/db';
import { User, UserRole } from '@/data/entities/User';
import { IsNull } from 'typeorm';

export interface SessionInfo {
  id: string;
  userName: string;
  name?: string | null;
  email?: string | null;
  rol: UserRole;
  permissions: string[];
}

export async function getCurrentSession(): Promise<SessionInfo | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return null;
  }

  const user = session.user as Record<string, unknown>;
  const id = typeof user.id === 'string' ? user.id : undefined;

  if (!id) {
    return null;
  }

  const role = typeof user.role === 'string' ? user.role : UserRole.OPERATOR;
  const permissions = Array.isArray(user.permissions)
    ? (user.permissions as string[])
    : [];

  return {
    id,
    userName: (user.userName as string | undefined)
      || (user.name as string | undefined)
      || '',
    name: (user.name as string | undefined) ?? null,
    email: (user.email as string | undefined) ?? null,
    rol: (role as UserRole) ?? UserRole.OPERATOR,
    permissions,
  };
}

export async function getCurrentUser(): Promise<Omit<User, 'pass'> | null> {
  const session = await getCurrentSession();
  if (!session) {
    return null;
  }

  const ds = await getDb();
  const repo = ds.getRepository(User);
  const user = await repo.findOne({
    where: { id: session.id, deletedAt: IsNull() },
    relations: ['person'],
  });

  if (!user) {
    return null;
  }

  const { pass, ...rest } = user;
  return rest as any;
}

export async function isAuthenticated(): Promise<boolean> {
  const session = await getCurrentSession();
  return session !== null;
}
