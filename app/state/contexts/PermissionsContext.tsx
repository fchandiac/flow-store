'use client';

import React, { createContext, useCallback, useContext, useMemo } from 'react';
import type { Session } from 'next-auth';
import { useSession } from 'next-auth/react';
import { AbilityValue, ABILITY_VALUES, validAbilities } from '@/lib/permissions';

type PermissionsContextValue = {
  permissions: AbilityValue[];
  has: (ability: AbilityValue) => boolean;
  hasAny: (abilities: AbilityValue[]) => boolean;
  isLoading: boolean;
};

const PermissionsContext = createContext<PermissionsContextValue | undefined>(undefined);

export const PermissionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: session, status } = useSession();

  const { role, permissions: rawPermissions } = useMemo(() => {
    if (!session?.user) {
      return {
        role: undefined as string | undefined,
        permissions: [] as unknown[],
      };
    }

    const user = session.user as Session['user'] & {
      role?: string;
      permissions?: unknown;
    };

    return {
      role: user.role ?? undefined,
      permissions: Array.isArray(user.permissions) ? user.permissions : [],
    };
  }, [session]);

  const resolvedPermissions = useMemo<AbilityValue[]>(() => {
    if (role === 'ADMIN') {
      return [...ABILITY_VALUES];
    }

    const filtered = (rawPermissions as unknown[])
      .map((value) => String(value).toUpperCase())
      .filter((value): value is AbilityValue => validAbilities.has(value as AbilityValue));

    return Array.from(new Set(filtered));
  }, [rawPermissions, role]);

  const has = useCallback((ability: AbilityValue) => {
    if (role === 'ADMIN') {
      return true;
    }
    return resolvedPermissions.includes(ability);
  }, [resolvedPermissions, role]);

  const hasAny = useCallback((abilities: AbilityValue[]) => {
    return abilities.some((ability) => has(ability));
  }, [has]);

  const value = useMemo<PermissionsContextValue>(() => ({
    permissions: resolvedPermissions,
    has,
    hasAny,
    isLoading: status === 'loading',
  }), [resolvedPermissions, has, hasAny, status]);

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissionsContext = () => {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissionsContext must be used within a PermissionsProvider');
  }
  return context;
};
