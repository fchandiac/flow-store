'use client';

import React, { useState } from 'react';
import { Button } from '@/app/baseComponents/Button/Button';
import { ButtonPill } from '@/app/baseComponents/Button/ButtonPill';

type ButtonVariant = "primary" | "secondary" | "outlined" | "text";
type ButtonPillVariant = "primary" | "secondary" | "outlined";

export default function ButtonShowcase() {
  const [clickCount, setClickCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = () => {
    setClickCount(prev => prev + 1);
  };

  const handleLoadingClick = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 2000);
  };

  const buttonVariants: ButtonVariant[] = ["primary", "secondary", "outlined", "text"];
  const buttonPillVariants: ButtonPillVariant[] = ["primary", "secondary", "outlined"];

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--color-primary)' }}>
            Button Components
          </h1>
          <p style={{ color: 'var(--color-muted)' }}>
            Componentes de botones versátiles: Button y ButtonPill con múltiples variantes y estados
          </p>
        </div>

        {/* Button Component Showcase */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            Button Component
          </h2>
          <div className="bg-white rounded-lg border border-gray-300 p-8">
            <div className="space-y-8">
              {/* Variantes */}
              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-primary)' }}>
                  Variantes de Estilo
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {buttonVariants.map((variant) => (
                    <div key={variant} className="text-center">
                      <Button
                        variant={variant}
                        onClick={handleClick}
                        className="w-full"
                      >
                        {variant.charAt(0).toUpperCase() + variant.slice(1)}
                      </Button>
                      <p className="text-xs mt-2" style={{ color: 'var(--color-muted)' }}>
                        {variant}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Estados */}
              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-primary)' }}>
                  Estados del Botón
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center">
                    <Button variant="primary" onClick={handleClick}>
                      Normal
                    </Button>
                    <p className="text-xs mt-2" style={{ color: 'var(--color-muted)' }}>
                      Estado normal
                    </p>
                  </div>
                  <div className="text-center">
                    <Button variant="primary" disabled>
                      Deshabilitado
                    </Button>
                    <p className="text-xs mt-2" style={{ color: 'var(--color-muted)' }}>
                      disabled
                    </p>
                  </div>
                  <div className="text-center">
                    <Button variant="primary" onClick={handleLoadingClick} disabled={isLoading}>
                      {isLoading ? 'Cargando...' : 'Con Loading'}
                    </Button>
                    <p className="text-xs mt-2" style={{ color: 'var(--color-muted)' }}>
                      Simulación de loading
                    </p>
                  </div>
                  <div className="text-center">
                    <Button variant="primary" onClick={handleClick}>
                      Clicks: {clickCount}
                    </Button>
                    <p className="text-xs mt-2" style={{ color: 'var(--color-muted)' }}>
                      Contador de clicks
                    </p>
                  </div>
                </div>
              </div>

              {/* Con Iconos */}
              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-primary)' }}>
                  Con Iconos
                </h3>
                <div className="flex flex-wrap gap-4">
                  <Button variant="primary" onClick={handleClick} className="flex items-center">
                    <span className="material-symbols-outlined mr-2">add</span>
                    Agregar
                  </Button>
                  <Button variant="secondary" onClick={handleClick} className="flex items-center">
                    <span className="material-symbols-outlined mr-2">delete</span>
                    Eliminar
                  </Button>
                  <Button variant="outlined" onClick={handleClick} className="flex items-center">
                    <span className="material-symbols-outlined mr-2">edit</span>
                    Editar
                  </Button>
                  <Button variant="text" onClick={handleClick} className="flex items-center">
                    <span className="material-symbols-outlined mr-2">save</span>
                    Guardar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ButtonPill Component Showcase */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            ButtonPill Component
          </h2>
          <div className="bg-white rounded-lg border border-gray-300 p-8">
            <div className="space-y-8">
              {/* Variantes */}
              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-primary)' }}>
                  Variantes de Estilo
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {buttonPillVariants.map((variant) => (
                    <div key={variant} className="text-center">
                      <ButtonPill
                        variant={variant}
                        onClick={handleClick}
                        className="w-full"
                      >
                        {variant.charAt(0).toUpperCase() + variant.slice(1)}
                      </ButtonPill>
                      <p className="text-xs mt-2" style={{ color: 'var(--color-muted)' }}>
                        {variant}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Estados */}
              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-primary)' }}>
                  Estados del ButtonPill
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center">
                    <ButtonPill variant="primary" onClick={handleClick}>
                      Normal
                    </ButtonPill>
                    <p className="text-xs mt-2" style={{ color: 'var(--color-muted)' }}>
                      Estado normal
                    </p>
                  </div>
                  <div className="text-center">
                    <ButtonPill variant="primary" disabled>
                      Deshabilitado
                    </ButtonPill>
                    <p className="text-xs mt-2" style={{ color: 'var(--color-muted)' }}>
                      disabled
                    </p>
                  </div>
                  <div className="text-center">
                    <ButtonPill variant="primary" onClick={handleLoadingClick} disabled={isLoading}>
                      {isLoading ? 'Cargando...' : 'Con Loading'}
                    </ButtonPill>
                    <p className="text-xs mt-2" style={{ color: 'var(--color-muted)' }}>
                      Simulación de loading
                    </p>
                  </div>
                  <div className="text-center">
                    <ButtonPill variant="primary" onClick={handleClick}>
                      Clicks: {clickCount}
                    </ButtonPill>
                    <p className="text-xs mt-2" style={{ color: 'var(--color-muted)' }}>
                      Contador de clicks
                    </p>
                  </div>
                </div>
              </div>

              {/* Con Iconos */}
              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-primary)' }}>
                  Con Iconos
                </h3>
                <div className="flex flex-wrap gap-4">
                  <ButtonPill variant="primary" onClick={handleClick} className="flex items-center">
                    <span className="material-symbols-outlined mr-2">add</span>
                    Agregar
                  </ButtonPill>
                  <ButtonPill variant="secondary" onClick={handleClick} className="flex items-center">
                    <span className="material-symbols-outlined mr-2">delete</span>
                    Eliminar
                  </ButtonPill>
                  <ButtonPill variant="outlined" onClick={handleClick} className="flex items-center">
                    <span className="material-symbols-outlined mr-2">edit</span>
                    Editar
                  </ButtonPill>
                </div>
              </div>

              {/* Usos Comunes */}
              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-primary)' }}>
                  Casos de Uso Comunes
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-medium" style={{ color: 'var(--color-primary)' }}>Etiquetas/Filtros</h4>
                    <div className="flex flex-wrap gap-2">
                      <ButtonPill variant="secondary" onClick={handleClick}>React</ButtonPill>
                      <ButtonPill variant="secondary" onClick={handleClick}>TypeScript</ButtonPill>
                      <ButtonPill variant="secondary" onClick={handleClick}>Next.js</ButtonPill>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-medium" style={{ color: 'var(--color-primary)' }}>Estados/Status</h4>
                    <div className="flex flex-wrap gap-2">
                      <ButtonPill variant="primary" onClick={handleClick}>Activo</ButtonPill>
                      <ButtonPill variant="outlined" onClick={handleClick}>Pendiente</ButtonPill>
                      <ButtonPill variant="secondary" onClick={handleClick}>Completado</ButtonPill>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="p-6 rounded-lg" style={{ backgroundColor: 'var(--color-secondary)', color: 'var(--color-background)' }}>
            <h3 className="font-semibold mb-3">Características</h3>
            <ul className="text-sm space-y-2">
              <li>✓ Button: 4 variantes (primary, secondary, outlined, text)</li>
              <li>✓ ButtonPill: 3 variantes con diseño redondeado</li>
              <li>✓ Estados: normal, disabled (con prop explícita), loading</li>
              <li>✓ Soporte para iconos de Material Symbols (alineados verticalmente)</li>
              <li>✓ Eventos de click personalizables</li>
              <li>✓ Diseño responsive y accesible</li>
            </ul>
          </div>

          <div className="p-6 rounded-lg" style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-background)' }}>
            <h3 className="font-semibold mb-3">Props Principales</h3>
            <ul className="text-sm space-y-2">
              <li>variant: Estilo del botón (primary, secondary, outlined, text)</li>
              <li>children: Contenido del botón</li>
              <li>disabled: Deshabilita el botón (boolean)</li>
              <li>onClick: Manejador de click</li>
              <li>className: Clases CSS adicionales</li>
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
{`import { Button } from '@/app/baseComponents/Button/Button';

function MyComponent() {
  const handleClick = () => {
    console.log('Botón clickeado!');
  };

  return (
    <Button variant="primary" onClick={handleClick}>
      Click me
    </Button>
  );
}`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Importación básica y uso simple del componente Button con variante primary.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Todas las Variantes</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`// Variantes disponibles: "primary", "secondary", "outlined", "text"

<Button variant="primary" onClick={handleClick}>
  Primary Button
</Button>

<Button variant="secondary" onClick={handleClick}>
  Secondary Button
</Button>

<Button variant="outlined" onClick={handleClick}>
  Outlined Button
</Button>

<Button variant="text" onClick={handleClick}>
  Text Button
</Button>`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Las cuatro variantes disponibles para el componente Button. Cada una tiene estilos diferentes pero mantienen la misma funcionalidad.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Con Iconos de Material Symbols</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`<Button variant="primary" onClick={handleSave} className="flex items-center">
  <span className="material-symbols-outlined mr-2">save</span>
  Guardar
</Button>

<Button variant="secondary" onClick={handleDelete} className="flex items-center">
  <span className="material-symbols-outlined mr-2">delete</span>
  Eliminar
</Button>

<Button variant="outlined" onClick={handleEdit} className="flex items-center">
  <span className="material-symbols-outlined mr-2">edit</span>
  Editar
</Button>

// Para iconos sin texto (botones de icono)
<Button variant="text" onClick={handleMenu} className="p-2">
  <span className="material-symbols-outlined">menu</span>
</Button>`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                <strong>Importante:</strong> Para alinear verticalmente los iconos con el texto, agrega <code>className="flex items-center"</code> al Button.
                Los iconos de Material Symbols se centran automáticamente con esta clase.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Estados y Loading</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`const [isLoading, setIsLoading] = useState(false);

const handleSubmit = async () => {
  setIsLoading(true);
  try {
    await submitForm();
  } finally {
    setIsLoading(false);
  }
};

// Estado normal
<Button variant="primary" onClick={handleClick}>
  Enviar
</Button>

// Estado deshabilitado
<Button variant="primary" disabled>
  Deshabilitado
</Button>

// Estado de loading (deshabilitado automáticamente)
<Button
  variant="primary"
  onClick={handleSubmit}
  disabled={isLoading}
>
  {isLoading ? 'Enviando...' : 'Enviar'}
</Button>`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Manejo de estados: normal, deshabilitado, y loading. El estado disabled se puede controlar manualmente o automáticamente durante operaciones asíncronas.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">ButtonPill para Etiquetas y Estados</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`import { ButtonPill } from '@/app/baseComponents/Button/ButtonPill';

// Etiquetas/Filtros
<ButtonPill variant="secondary" onClick={() => handleFilter('react')}>
  React
</ButtonPill>

<ButtonPill variant="secondary" onClick={() => handleFilter('typescript')}>
  TypeScript
</ButtonPill>

// Estados/Status
<ButtonPill variant="primary" onClick={() => setStatus('active')}>
  Activo
</ButtonPill>

<ButtonPill variant="outlined" onClick={() => setStatus('pending')}>
  Pendiente
</ButtonPill>

<ButtonPill variant="secondary" onClick={() => setStatus('completed')}>
  Completado
</ButtonPill>`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                ButtonPill es ideal para etiquetas, filtros, estados, y elementos pequeños. Tiene las variantes primary, secondary, y outlined (sin text).
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Eventos y Callbacks</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`const [clickCount, setClickCount] = useState(0);

const handleClick = (event) => {
  console.log('Button clicked!', event);
  setClickCount(prev => prev + 1);
};

const handleMouseEnter = () => {
  console.log('Mouse entered button');
};

// El componente acepta todos los eventos estándar de botón
<Button
  variant="primary"
  onClick={handleClick}
  onMouseEnter={handleMouseEnter}
  onMouseLeave={() => console.log('Mouse left')}
>
  Clicks: {clickCount}
</Button>`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Los botones aceptan todos los eventos estándar de React (onClick, onMouseEnter, onMouseLeave, etc.) y pasan el evento como parámetro.
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
                {/* Button wireframe */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm">Button Component</h3>
                  <div className="flex justify-center">
                    <div className="relative flex items-center border border-gray-400 rounded-lg bg-gray-100 h-10 px-4">
                      <div className="h-4 w-20 bg-gray-300 rounded" />
                    </div>
                  </div>
                </div>
                {/* ButtonPill wireframe */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm">ButtonPill Component</h3>
                  <div className="flex justify-center">
                    <div className="relative flex items-center border border-gray-400 rounded-full bg-gray-100 h-10 px-6">
                      <div className="h-4 w-16 bg-gray-300 rounded" />
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