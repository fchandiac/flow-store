"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { AlertProvider } from "./state/contexts/AlertContext";
import { PermissionsProvider } from "./state/contexts/PermissionsContext";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <PermissionsProvider>
        <AlertProvider>
          {children}
        </AlertProvider>
      </PermissionsProvider>
    </SessionProvider>
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

