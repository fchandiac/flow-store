'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { AbilityValue, validAbilities, ABILITY_VALUES } from '@/lib/permissions';

type PermissionsContextValue = {
  permissions: AbilityValue[];
  has: (ability: AbilityValue) => boolean;
  hasAny: (abilities: AbilityValue[]) => boolean;
  isLoading: boolean;
};

const PermissionsContext = createContext<PermissionsContextValue | undefined>(undefined);

export const PermissionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: session, status } = useSession();

  const normalizedPermissions = useMemo<AbilityValue[]>(() => {
    const userPermissions = (session?.user as any)?.permissions;
    const userRole = typeof (session?.user as any)?.role === 'string'
      ? ((session?.user as any)?.role as string).toUpperCase()
      : undefined;

    const rawPermissions = Array.isArray(userPermissions)
      ? (userPermissions as AbilityValue[])
      : [];

    const merged = new Set<AbilityValue>(rawPermissions);

    if (userRole === 'ADMIN') {
      for (const ability of ABILITY_VALUES) {
        merged.add(ability);
      }
    }

    return Array.from(merged).filter((permission): permission is AbilityValue =>
      validAbilities.has(permission as AbilityValue)
    );
  }, [session]);

  const permissionsSet = useMemo(() => new Set<AbilityValue>(normalizedPermissions), [normalizedPermissions]);

  const value = useMemo<PermissionsContextValue>(() => {
    const has = (ability: AbilityValue) => permissionsSet.has(ability);
    const hasAny = (abilities: AbilityValue[]) =>
      abilities.some((ability) => permissionsSet.has(ability));

    return {
      permissions: normalizedPermissions,
      has,
      hasAny,
      isLoading: status === 'loading',
    };
  }, [normalizedPermissions, permissionsSet, status]);

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
