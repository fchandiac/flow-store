// authStorage.ts - Client-side session persistence for Electron
// This ensures NextAuth session survives app restarts by syncing cookies with localStorage

import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

const SESSION_COOKIE_KEY = 'next-auth-session-token';

export function useAuthPersistence() {
  const { data: session, status } = useSession();

  // Save session cookie to localStorage when session changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (status === 'authenticated' && session) {
        try {
          // Get the session cookie from document.cookie
          const cookies = document.cookie.split(';');
          const sessionCookie = cookies.find(cookie =>
            cookie.trim().startsWith(`${SESSION_COOKIE_KEY}=`)
          );

          if (sessionCookie) {
            const cookieValue = sessionCookie.split('=')[1];
            localStorage.setItem(SESSION_COOKIE_KEY, cookieValue);
            console.debug('[authStorage] Session cookie saved to localStorage');
          }
        } catch (error) {
          console.error('[authStorage] Failed to save session cookie:', error);
        }
      } else if (status === 'unauthenticated') {
        // Clear localStorage on logout
        try {
          localStorage.removeItem(SESSION_COOKIE_KEY);
          console.debug('[authStorage] Session cookie cleared from localStorage');
        } catch (error) {
          console.error('[authStorage] Failed to clear session cookie:', error);
        }
      }
    }
  }, [session, status]);

  // Restore session cookie from localStorage on app start
  useEffect(() => {
    if (typeof window !== 'undefined' && status === 'loading') {
      try {
        const storedCookie = localStorage.getItem(SESSION_COOKIE_KEY);
        if (storedCookie) {
          // Set the cookie in document.cookie
          document.cookie = `${SESSION_COOKIE_KEY}=${storedCookie}; path=/; max-age=${30 * 24 * 60 * 60}; samesite=lax`;
          console.debug('[authStorage] Session cookie restored from localStorage');
        }
      } catch (error) {
        console.error('[authStorage] Failed to restore session cookie:', error);
        localStorage.removeItem(SESSION_COOKIE_KEY);
      }
    }
  }, [status]);
}

// Utility function to check if running in Electron
export function isElectron(): boolean {
  return typeof window !== 'undefined' && window.electronAPI !== undefined;
}