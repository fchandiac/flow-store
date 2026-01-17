import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FlowStore Mobile Backend',
  description: 'Backend scaffolding for FlowStore mobile services.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
