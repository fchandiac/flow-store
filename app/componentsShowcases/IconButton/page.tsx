'use client';

import React from 'react';
import IconButton from '@/app/baseComponents/IconButton/IconButton';

type IconButtonVariant = 'containedPrimary' | 'containedSecondary' | 'text' | 'basic' | 'outlined';
type IconButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export default function IconButtonShowcase() {
  const icons = [
    'home',
    'settings',
    'search',
    'favorite',
    'delete',
    'edit',
    'add',
    'close',
  ];

  const variants: IconButtonVariant[] = [
    'containedPrimary',
    'containedSecondary',
    'text',
    'basic',
    'outlined',
  ];

  const sizes: IconButtonSize[] = ['xs', 'sm', 'md', 'lg', 'xl'];

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--color-primary)' }}>
            IconButton Component
          </h1>
          <p style={{ color: 'var(--color-muted)' }}>
            Botones versátiles con iconos de Material Symbols
          </p>
        </div>

        {/* Variantes */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            Variantes de Estilo
          </h2>
          <div className="bg-white rounded-lg p-8 border border-gray-300">
            <div className="space-y-6">
              {variants.map((variant) => (
                <div key={variant}>
                  <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-primary)' }}>
                    {variant}
                  </h3>
                  <div className="flex flex-wrap gap-4">
                    {icons.slice(0, 4).map((icon) => (
                      <IconButton
                        key={`${variant}-${icon}`}
                        icon={icon}
                        variant={variant}
                        size="md"
                        ariaLabel={`${variant} - ${icon}`}
                        onClick={() => console.log(`Clicked: ${variant} - ${icon}`)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tamaños */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            Tamaños Disponibles
          </h2>
          <div className="bg-white rounded-lg p-8 border border-gray-300">
            <div className="flex flex-wrap items-center gap-8">
              {sizes.map((size) => (
                <div key={size} className="text-center">
                  <IconButton
                    icon="settings"
                    variant="containedPrimary"
                    size={size}
                    ariaLabel={`Size: ${size}`}
                  />
                  <p className="text-xs mt-2" style={{ color: 'var(--color-muted)' }}>
                    {size}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Galería de Iconos */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            Galería de Iconos
          </h2>
          <div className="bg-white rounded-lg p-8 border border-gray-300">
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-6">
              {icons.map((icon) => (
                <div key={icon} className="flex flex-col items-center gap-3">
                  <IconButton
                    icon={icon}
                    variant="basic"
                    size="lg"
                    ariaLabel={icon}
                  />
                  <p className="text-xs text-center" style={{ color: 'var(--color-muted)' }}>
                    {icon}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Estados del IconButton */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            Estados del IconButton
          </h2>
          <div className="bg-white rounded-lg border border-gray-300 p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center">
                <IconButton
                  icon="home"
                  variant="containedPrimary"
                  size="md"
                  ariaLabel="Normal"
                  onClick={() => console.log('Normal click')}
                />
                <p className="text-xs mt-2" style={{ color: 'var(--color-muted)' }}>
                  Estado normal
                </p>
              </div>
              <div className="text-center">
                <IconButton
                  icon="settings"
                  variant="containedPrimary"
                  size="md"
                  ariaLabel="Deshabilitado"
                  disabled
                />
                <p className="text-xs mt-2" style={{ color: 'var(--color-muted)' }}>
                  disabled
                </p>
              </div>
              <div className="text-center">
                <IconButton
                  icon="favorite"
                  variant="containedPrimary"
                  size="md"
                  ariaLabel="Favorito"
                  onClick={() => console.log('Favorite clicked')}
                />
                <p className="text-xs mt-2" style={{ color: 'var(--color-muted)' }}>
                  Con interacción
                </p>
              </div>
              <div className="text-center">
                <IconButton
                  icon="close"
                  variant="text"
                  size="md"
                  ariaLabel="Cerrar"
                  onClick={() => console.log('Close clicked')}
                />
                <p className="text-xs mt-2" style={{ color: 'var(--color-muted)' }}>
                  Variante text
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="p-6 rounded-lg" style={{ backgroundColor: 'var(--color-secondary)', color: 'var(--color-background)' }}>
            <h3 className="font-semibold mb-3">Características</h3>
            <ul className="text-sm space-y-2">
              <li>✓ 5 variantes de estilo</li>
              <li>✓ 5 tamaños predefinidos</li>
              <li>✓ Material Symbols integrado</li>
              <li>✓ Efectos hover y click</li>
            </ul>
          </div>

          <div className="p-6 rounded-lg" style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-background)' }}>
            <h3 className="font-semibold mb-3">Props Principales</h3>
            <ul className="text-sm space-y-2">
              <li>icon: string - Nombre del icono</li>
              <li>variant: Estilo del botón</li>
              <li>size: Tamaño del botón</li>
              <li>onClick: Manejador de click</li>
            </ul>
          </div>
        </div>

        {/* Usage Examples */}
        <div className="bg-white rounded-lg border border-gray-300 p-8 mb-8">
          <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            Ejemplos de Uso
          </h2>

          <div className="space-y-8">
            <div>
              <h3 className="font-semibold mb-3">Uso Básico</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`import { IconButton } from '@/app/baseComponents/IconButton/IconButton';

function MyComponent() {
  const handleClick = () => {
    console.log('Icon button clicked!');
  };

  return (
    <IconButton
      icon="settings"
      variant="containedPrimary"
      size="md"
      ariaLabel="Configuración"
      onClick={handleClick}
    />
  );
}`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Importación básica y uso simple del componente IconButton con variante containedPrimary.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Todas las Variantes</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`// Variantes disponibles: "containedPrimary", "containedSecondary", "text", "basic", "outlined"

<IconButton icon="home" variant="containedPrimary" size="md" ariaLabel="Home" />
<IconButton icon="settings" variant="containedSecondary" size="md" ariaLabel="Settings" />
<IconButton icon="search" variant="text" size="md" ariaLabel="Search" />
<IconButton icon="favorite" variant="basic" size="md" ariaLabel="Favorite" />
<IconButton icon="delete" variant="outlined" size="md" ariaLabel="Delete" />`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Las cinco variantes disponibles para el componente IconButton. Cada una tiene estilos diferentes pero mantienen la misma funcionalidad.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Con Diferentes Tamaños</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`// Tamaños disponibles: "xs", "sm", "md", "lg", "xl"

<IconButton icon="add" variant="containedPrimary" size="xs" ariaLabel="Add XS" />
<IconButton icon="add" variant="containedPrimary" size="sm" ariaLabel="Add SM" />
<IconButton icon="add" variant="containedPrimary" size="md" ariaLabel="Add MD" />
<IconButton icon="add" variant="containedPrimary" size="lg" ariaLabel="Add LG" />
<IconButton icon="add" variant="containedPrimary" size="xl" ariaLabel="Add XL" />`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Los cinco tamaños predefinidos disponibles. El tamaño afecta tanto el botón como el icono interno.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Estados y Eventos</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`const [isLoading, setIsLoading] = useState(false);

const handleAction = async () => {
  setIsLoading(true);
  try {
    await performAction();
  } finally {
    setIsLoading(false);
  }
};

// Estado normal
<IconButton
  icon="save"
  variant="containedPrimary"
  onClick={handleAction}
  ariaLabel="Guardar"
/>

// Estado deshabilitado
<IconButton
  icon="delete"
  variant="containedPrimary"
  disabled
  ariaLabel="Eliminar deshabilitado"
/>

// Con diferentes eventos
<IconButton
  icon="menu"
  variant="text"
  onClick={handleMenu}
  onMouseEnter={() => console.log('Hover')}
  ariaLabel="Menú"
/>`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Manejo de estados disabled y eventos. Los IconButton aceptan todos los eventos estándar de React.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Accesibilidad (ariaLabel)</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`<IconButton
  icon="close"
  variant="text"
  size="md"
  ariaLabel="Cerrar modal"
  onClick={handleClose}
/>

<IconButton
  icon="search"
  variant="outlined"
  size="md"
  ariaLabel="Buscar en la aplicación"
  onClick={handleSearch}
/>

// ❌ Incorrecto - falta ariaLabel
<IconButton
  icon="settings"
  variant="basic"
  onClick={handleSettings}
/>`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                <strong>Importante:</strong> Siempre incluye la prop <code>ariaLabel</code> para accesibilidad. Los lectores de pantalla necesitan esta información para describir botones que solo contienen iconos.
              </p>
            </div>
          </div>
        </div>

        {/* Wireframe */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            Wireframe
          </h2>
          <div className="bg-white rounded-lg border border-gray-300 p-8">
            <div className="max-w-md mx-auto">
              <div className="space-y-6">
                {/* IconButton wireframe */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm">IconButton Component</h3>
                  <div className="flex justify-center">
                    <div className="relative flex items-center justify-center border border-gray-400 rounded-lg bg-gray-100 w-10 h-10">
                      <div className="w-5 h-5 rounded-full bg-gray-400"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Back Button */}
        <button
          onClick={() => window.history.back()}
          className="px-6 py-2 rounded-lg font-medium transition-all"
          style={{
            backgroundColor: 'var(--color-muted)',
            color: 'var(--color-background)',
          }}
        >
          ← Atrás
        </button>
      </div>
    </div>
  );
}
