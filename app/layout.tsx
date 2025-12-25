import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import appConfig from '../app.config.json';
import { Providers } from './Providers';
import '../app/global.css';

export const metadata: Metadata = {
  title: appConfig.appName,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Restore session from localStorage before any other scripts run
              try {
                const storedSession = localStorage.getItem('flow_session');
                if (storedSession) {
                  document.cookie = 'flow_session=' + encodeURIComponent(storedSession) + '; path=/; max-age=86400; samesite=lax';
                  console.debug('[authStorage] Session restored from localStorage on page load');
                }
              } catch (error) {
                console.error('[authStorage] Failed to restore session on page load:', error);
              }
            `,
          }}
        />
      </head>
      <body className="bg-white">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
