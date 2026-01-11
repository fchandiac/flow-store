"use client";

import { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { AlertProvider } from "./globalstate/alert/AlertContext";
import { PermissionsProvider } from "./globalstate/permissions/PermissionsContext";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <AlertProvider>
        <PermissionsProvider>
          {children}
        </PermissionsProvider>
      </AlertProvider>
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

