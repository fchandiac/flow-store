"use client";

import { ReactNode, useEffect } from "react";
import { AlertProvider } from "./state/contexts/AlertContext";
import { PermissionsProvider } from "./state/contexts/PermissionsContext";
import { useAuthPersistence } from "./lib/authStorage";

// Component to handle auth persistence
function AuthPersistenceHandler() {
  useAuthPersistence();
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <PermissionsProvider>
      <AuthPersistenceHandler />
      <AlertProvider>
        {children}
      </AlertProvider>
    </PermissionsProvider>
  );
}

/**
 * Minimal provider que solo proporciona AlertProvider sin SessionProvider
 * Esto permite que el resto de la app sea Server Components hasta donde sea posible
 */
export function MinimalProviders({ children }: { children: ReactNode }) {
  return (
    <AlertProvider>
      {children}
    </AlertProvider>
  );
}

