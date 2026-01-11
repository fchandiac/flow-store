import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import appConfig from '@/app.config.json';
import { Providers } from './Providers';
import '../app/global.css';

export const metadata: Metadata = {
  title: appConfig.appName,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head />
      <body className="bg-white">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
