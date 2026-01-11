'use client';

import React from 'react';
import { AbilityValue } from '@/lib/permissions';
import { usePermissions } from '@/app/globalstate/permissions/usePermissions';

type CanProps = {
  ability: AbilityValue;
  fallback?: React.ReactNode;
  children: React.ReactNode;
};

export const Can: React.FC<CanProps> = ({ ability, fallback = null, children }) => {
  const { has, isLoading } = usePermissions();

  if (isLoading) {
    return null;
  }

  return has(ability) ? <>{children}</> : <>{fallback}</>;
};
