'use client';

import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="text-center space-y-8 max-w-2xl">
        {/* Logo */}
        <div className="flex justify-center">
          <img
            src="/logo.svg"
            alt="Logo"
            width={120}
            height={120}
            className="w-32 h-32"
          />
        </div>

        {/* 404 Message */}
        <div className="space-y-4">
          <h1 className="text-6xl font-bold" style={{ color: 'var(--color-primary)' }}>
            ⚠️
          </h1>
          <p className="text-lg" style={{ color: 'var(--color-muted)' }}>
            Lo sentimos, el contenido que intentas acceder no se encuentra disponible en este momento.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
          <button
            onClick={() => router.push('/')}
            className="px-8 py-3 rounded-lg font-semibold transition-all hover:shadow-lg"
            style={{
              backgroundColor: 'var(--color-primary)',
              color: 'var(--color-background)',
            }}
          >
            Ir al inicio
          </button>
          <button
            onClick={() => router.back()}
            className="px-8 py-3 rounded-lg font-semibold transition-all hover:shadow-lg"
            style={{
              backgroundColor: 'var(--color-secondary)',
              color: 'var(--color-background)',
            }}
          >
            Volver atrás
          </button>
        </div>
      </div>
    </main>
  );
}
