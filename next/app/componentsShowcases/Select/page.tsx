'use client';

import React, { useState } from 'react';
import Select from '@/app/baseComponents/Select/Select';

interface SelectOption {
  id: string | number;
  label: string;
}

const countriesOptions: SelectOption[] = [
  { id: 'mx', label: 'México' },
  { id: 'ar', label: 'Argentina' },
  { id: 'co', label: 'Colombia' },
  { id: 'pe', label: 'Perú' },
  { id: 'cl', label: 'Chile' },
  { id: 'br', label: 'Brasil' },
  { id: 'es', label: 'España' },
  { id: 'us', label: 'Estados Unidos' },
];

const rolesOptions: SelectOption[] = [
  { id: 'admin', label: 'Administrador' },
  { id: 'editor', label: 'Editor' },
  { id: 'viewer', label: 'Visor' },
  { id: 'guest', label: 'Invitado' },
];

export default function SelectShowcase() {
  const [selectedCountry, setSelectedCountry] = useState<string | number | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | number | null>(null);
  const [selectedRequired, setSelectedRequired] = useState<string | number | null>(null);

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--color-primary)' }}>
            Select Component
          </h1>
          <p style={{ color: 'var(--color-muted)' }}>
            Un componente select versátil con búsqueda, validación y navegación por teclado
          </p>
        </div>

        {/* Main Showcase */}
        <div className="bg-white rounded-lg p-8 border border-gray-300 mb-8">
          <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            Ejemplos Básicos
          </h2>

          <div className="space-y-8">
            {/* Example 1: Simple Select */}
            <div>
              <label className="block text-sm font-semibold mb-3" style={{ color: 'var(--color-primary)' }}>
                Selecciona un país
              </label>
              <Select
                options={countriesOptions}
                placeholder="Elige un país..."
                value={selectedCountry}
                onChange={setSelectedCountry}
                data-test-id="country-select"
              />
              {selectedCountry && (
                <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: 'rgba(36, 38, 41, 0.1)' }}>
                  <p className="text-sm" style={{ color: 'var(--color-primary)' }}>
                    País seleccionado: <span className="font-semibold">{countriesOptions.find(o => o.id === selectedCountry)?.label}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Example 2: Role Select */}
            <div>
              <label className="block text-sm font-semibold mb-3" style={{ color: 'var(--color-primary)' }}>
                Selecciona un rol
              </label>
              <Select
                options={rolesOptions}
                placeholder="Elige un rol..."
                value={selectedRole}
                onChange={setSelectedRole}
                data-test-id="role-select"
              />
              {selectedRole && (
                <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: 'rgba(212, 106, 47, 0.1)' }}>
                  <p className="text-sm" style={{ color: 'var(--color-secondary)' }}>
                    Rol seleccionado: <span className="font-semibold">{rolesOptions.find(o => o.id === selectedRole)?.label}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Example 3: Required Select */}
            <div>
              <label className="block text-sm font-semibold mb-3" style={{ color: 'var(--color-primary)' }}>
                Campo requerido <span className="text-red-500">*</span>
              </label>
              <Select
                options={countriesOptions}
                placeholder="Selecciona un país..."
                value={selectedRequired}
                onChange={setSelectedRequired}
                required={true}
                name="country-required"
                data-test-id="required-select"
              />
              {selectedRequired ? (
                <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--color-success)', color: 'white' }}>
                  <p className="text-sm">
                    ✓ Campo requerido completado: <span className="font-semibold">{countriesOptions.find(o => o.id === selectedRequired)?.label}</span>
                  </p>
                </div>
              ) : (
                <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: 'rgba(220, 53, 69, 0.1)' }}>
                  <p className="text-sm" style={{ color: 'var(--color-error)' }}>
                    Este campo es requerido
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="p-6 rounded-lg" style={{ backgroundColor: 'var(--color-secondary)', color: 'var(--color-background)' }}>
            <h3 className="font-semibold mb-3">Características</h3>
            <ul className="text-sm space-y-2">
              <li>✓ Navegación con teclado (↑↓ Enter Esc)</li>
              <li>✓ Validación de campos requeridos</li>
              <li>✓ Botón para limpiar selección</li>
              <li>✓ Floating label animado</li>
              <li>✓ Estados de enfoque visual</li>
            </ul>
          </div>

          <div className="p-6 rounded-lg" style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-background)' }}>
            <h3 className="font-semibold mb-3">Props Principales</h3>
            <ul className="text-sm space-y-2">
              <li>options: Option[] - Lista de opciones</li>
              <li>placeholder: string - Texto placeholder</li>
              <li>value: string | number | null</li>
              <li>onChange: Callback de cambio</li>
              <li>required: boolean - Campo requerido</li>
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
{`import { useState } from 'react';
import Select from '@/app/baseComponents/Select/Select';

interface Option {
  id: string | number;
  label: string;
}

const options: Option[] = [
  { id: 'mx', label: 'México' },
  { id: 'ar', label: 'Argentina' },
  { id: 'co', label: 'Colombia' },
];

function MyComponent() {
  const [selectedValue, setSelectedValue] = useState<string | number | null>(null);

  return (
    <Select
      options={options}
      value={selectedValue}
      onChange={setSelectedValue}
      placeholder="Selecciona un país"
    />
  );
}`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Importación básica y uso simple del componente Select con opciones de tipo Option.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Con Validación Requerida</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`const [selectedCountry, setSelectedCountry] = useState<string | number | null>(null);
const [errors, setErrors] = useState<string>('');

const handleSubmit = () => {
  if (!selectedCountry) {
    setErrors('Por favor selecciona un país');
    return;
  }
  // Procesar formulario
};

<Select
  options={countries}
  value={selectedCountry}
  onChange={(value) => {
    setSelectedCountry(value);
    if (errors) setErrors(''); // Limpiar error al seleccionar
  }}
  placeholder="Selecciona tu país"
  required
/>

{errors && <p className="text-red-500 text-sm mt-1">{errors}</p>}`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Uso con validación requerida. El componente muestra indicadores visuales cuando required=true.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Con Formulario React</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`<form onSubmit={handleSubmit}>
  <div className="space-y-4">
    <Select
      options={roles}
      value={selectedRole}
      onChange={setSelectedRole}
      placeholder="Selecciona un rol"
      required
      name="userRole"
    />

    <Select
      options={departments}
      value={selectedDepartment}
      onChange={setSelectedDepartment}
      placeholder="Selecciona un departamento"
      name="department"
    />

    <button type="submit" className="btn-primary">
      Crear Usuario
    </button>
  </div>
</form>`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Integración con formularios HTML. Incluye atributo name para envío de formularios tradicionales.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Manejo de Estados</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`const [selectedValue, setSelectedValue] = useState<string | number | null>(null);
const [isLoading, setIsLoading] = useState(false);

// Simular carga de opciones desde API
useEffect(() => {
  const loadOptions = async () => {
    setIsLoading(true);
    try {
      const data = await fetchOptionsFromAPI();
      setOptions(data);
    } finally {
      setIsLoading(false);
    }
  };
  loadOptions();
}, []);

<Select
  options={options}
  value={selectedValue}
  onChange={setSelectedValue}
  placeholder={isLoading ? "Cargando..." : "Selecciona una opción"}
  disabled={isLoading}
/>`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Manejo de estados de carga y opciones dinámicas. El componente se deshabilita automáticamente durante la carga.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Con Búsqueda Avanzada</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`// El componente incluye búsqueda automática
// No necesitas configuración adicional

const products = [
  { id: 1, label: 'Laptop Dell XPS 13' },
  { id: 2, label: 'MacBook Pro 16"' },
  { id: 3, label: 'Surface Pro 8' },
  // ... más productos
];

<Select
  options={products}
  value={selectedProduct}
  onChange={setSelectedProduct}
  placeholder="Buscar producto..."
/>

// La búsqueda filtra automáticamente mientras escribes
// Navegación: ↑↓ para mover, Enter para seleccionar, Esc para cerrar`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                <strong>Búsqueda integrada:</strong> El componente filtra opciones automáticamente. Soporta navegación completa con teclado.
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
              <div className="space-y-4">
                {/* Select wireframe */}
                <div className="relative flex items-center border border-gray-400 rounded-lg bg-gray-100 h-12">
                  {/* Input simulado */}
                  <div className="flex-1 h-full flex items-center px-4">
                    <div className="h-4 w-32 bg-gray-300 rounded" />
                  </div>
                  {/* Icono dropdown */}
                  <div className="absolute right-2 top-0 h-full flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center" />
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
