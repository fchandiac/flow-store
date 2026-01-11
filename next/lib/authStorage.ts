// authStorage.ts - Client-side session persistence for Electron
// This ensures session survives app restarts by syncing cookies with localStorage

import { useEffect } from 'react';

const SESSION_COOKIE_KEY = 'flow_session';

// Function to restore session synchronously (for immediate use)
export function restoreSessionFromStorage() {
  if (typeof window !== 'undefined') {
    try {
      const storedSession = localStorage.getItem(SESSION_COOKIE_KEY);
      if (storedSession) {
        // Set the cookie in document.cookie to restore the session
        document.cookie = `${SESSION_COOKIE_KEY}=${encodeURIComponent(storedSession)}; path=/; max-age=${24 * 60 * 60}; samesite=lax`;
        console.debug('[authStorage] Session restored from localStorage');
        return true;
      }
    } catch (error) {
      console.error('[authStorage] Failed to restore session:', error);
    }
  }
  return false;
}

export function useAuthPersistence() {
  // Restore session cookie from localStorage on app start
  useEffect(() => {
    restoreSessionFromStorage();
  }, []);

  // Save session cookie to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saveSessionToStorage = () => {
        try {
          const cookies = document.cookie.split(';');
          const sessionCookie = cookies.find(cookie =>
            cookie.trim().startsWith(`${SESSION_COOKIE_KEY}=`)
          );

          if (sessionCookie) {
            const cookieValue = sessionCookie.split('=')[1];
            localStorage.setItem(SESSION_COOKIE_KEY, decodeURIComponent(cookieValue));
            console.debug('[authStorage] Session saved to localStorage');
          } else {
            // If no session cookie, clear localStorage
            localStorage.removeItem(SESSION_COOKIE_KEY);
          }
        } catch (error) {
          console.error('[authStorage] Failed to save session:', error);
        }
      };

      // Save immediately
      saveSessionToStorage();

      // Set up an interval to check for cookie changes (since we can't listen to cookie changes directly)
      const interval = setInterval(saveSessionToStorage, 1000);

      return () => clearInterval(interval);
    }
  }, []);
}

// Utility function to check if running in Electron
export function isElectron(): boolean {
  return typeof window !== 'undefined' && window.electronAPI !== undefined;
}