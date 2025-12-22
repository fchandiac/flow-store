'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';

export default function ComponentsShowcases() {
  const router = useRouter();

  const components = [
    { name: 'Alert', path: '/componentsShowcases/Alert' },
    { name: 'AutoComplete', path: '/componentsShowcases/AutoComplete' },
    { name: 'Button', path: '/componentsShowcases/Button' },
    { name: 'CreateBaseForm', path: '/componentsShowcases/CreateBaseForm' },
    { name: 'DeleteBaseForm', path: '/componentsShowcases/DeleteBaseForm' },
    { name: 'Dialog', path: '/componentsShowcases/Dialog' },
    { name: 'DotProgress', path: '/componentsShowcases/DotProgress' },
    { name: 'DropdownList', path: '/componentsShowcases/DropdownList' },
    { name: 'FileUploader', path: '/componentsShowcases/FileUploader' },
    { name: 'IconButton', path: '/componentsShowcases/IconButton' },
    { name: 'LocationPicker', path: '/componentsShowcases/LocationPicker' },
    { name: 'NumberStepper', path: '/componentsShowcases/NumberStepper' },
    { name: 'RangeSlider', path: '/componentsShowcases/RangeSlider' },
    { name: 'Select', path: '/componentsShowcases/Select' },
    { name: 'Switch', path: '/componentsShowcases/Switch' },
    { name: 'TextField', path: '/componentsShowcases/TextField' },
    { name: 'UpdateBaseForm', path: '/componentsShowcases/UpdateBaseForm' },
  ];

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--color-primary)' }}>
              Componentes Disponibles
            </h1>
            <p style={{ color: 'var(--color-muted)' }}>
              Selecciona un componente para ver su caso de uso y ejemplos
            </p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="px-4 py-2 rounded-lg font-medium transition-all hover:shadow-md"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-background)',
              border: `1px solid var(--color-border)`,
            }}
          >
            Cerrar Sesión
          </button>
        </div>

        {/* Components List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {components.map((component) => (
            <button
              key={component.name}
              onClick={() => router.push(component.path)}
              className="p-6 rounded-lg border transition-all hover:shadow-lg text-left group"
              style={{
                backgroundColor: 'var(--color-primary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-background)',
              }}
            >
              <h2 className="text-xl font-semibold mb-2 group-hover:translate-x-1 transition-transform">
                {component.name}
              </h2>
              <p style={{ color: 'var(--color-muted)' }} className="text-sm">
                Ver ejemplo y documentación →
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
