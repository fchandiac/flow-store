'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { AbilityValue, ABILITY_VALUES } from '@/lib/permissions';

type PermissionsContextValue = {
  permissions: AbilityValue[];
  has: (ability: AbilityValue) => boolean;
  hasAny: (abilities: AbilityValue[]) => boolean;
  isLoading: boolean;
};

const PermissionsContext = createContext<PermissionsContextValue | undefined>(undefined);

/**
 * PermissionsProvider - MODO DESARROLLO
 * 
 * Durante el desarrollo, TODOS los permisos están habilitados.
 * La lógica de permisos real se implementará al final del proceso.
 * 
 * TODO: Reactivar lógica de permisos real cuando sea necesario
 */
export const PermissionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // DESARROLLO: Todos los permisos habilitados
  const allPermissions = useMemo<AbilityValue[]>(() => {
    return [...ABILITY_VALUES];
  }, []);

  const value = useMemo<PermissionsContextValue>(() => {
    // Durante desarrollo, siempre retorna true
    const has = (_ability: AbilityValue) => true;
    const hasAny = (_abilities: AbilityValue[]) => true;

    return {
      permissions: allPermissions,
      has,
      hasAny,
      isLoading: false,
    };
  }, [allPermissions]);

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
