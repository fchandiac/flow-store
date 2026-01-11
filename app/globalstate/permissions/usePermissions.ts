'use client';

import { usePermissionsContext } from './PermissionsContext';

export const usePermissions = () => {
  return usePermissionsContext();
};
