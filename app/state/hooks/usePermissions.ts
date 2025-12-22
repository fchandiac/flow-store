'use client';

import { usePermissionsContext } from '../contexts/PermissionsContext';

export const usePermissions = () => {
  return usePermissionsContext();
};
