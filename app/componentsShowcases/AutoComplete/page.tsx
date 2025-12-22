'use client';

import React, { useState } from 'react';
import AutoComplete from '@/app/baseComponents/AutoComplete/AutoComplete';

interface Fruit {
  id: number;
  name: string;
  color: string;
  emoji: string;
}

interface Country {
  id: number;
  name: string;
  code: string;
  flag: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

const fruitOptions: Fruit[] = [
  { id: 1, name: 'Apple', color: 'red', emoji: '🍎' },
  { id: 2, name: 'Banana', color: 'yellow', emoji: '🍌' },
  { id: 3, name: 'Orange', color: 'orange', emoji: '🍊' },
  { id: 4, name: 'Grape', color: 'purple', emoji: '🍇' },
  { id: 5, name: 'Watermelon', color: 'green', emoji: '🍉' },
  { id: 6, name: 'Strawberry', color: 'red', emoji: '🍓' },
  { id: 7, name: 'Blueberry', color: 'blue', emoji: '🫐' },
  { id: 8, name: 'Mango', color: 'orange', emoji: '🥭' },
];

const countryOptions: Country[] = [
  { id: 1, name: 'Estados Unidos', code: 'US', flag: '🇺🇸' },
  { id: 2, name: 'México', code: 'MX', flag: '🇲🇽' },
  { id: 3, name: 'Argentina', code: 'AR', flag: '🇦🇷' },
  { id: 4, name: 'Colombia', code: 'CO', flag: '🇨🇴' },
  { id: 5, name: 'Chile', code: 'CL', flag: '🇨🇱' },
  { id: 6, name: 'Perú', code: 'PE', flag: '🇵🇪' },
  { id: 7, name: 'Brasil', code: 'BR', flag: '🇧🇷' },
  { id: 8, name: 'España', code: 'ES', flag: '🇪🇸' },
];

const userOptions: User[] = [
  { id: 1, name: 'Juan Pérez', email: 'juan@example.com', role: 'Admin' },
  { id: 2, name: 'María García', email: 'maria@example.com', role: 'Editor' },
  { id: 3, name: 'Carlos López', email: 'carlos@example.com', role: 'Viewer' },
  { id: 4, name: 'Ana Rodríguez', email: 'ana@example.com', role: 'Admin' },
  { id: 5, name: 'Pedro Sánchez', email: 'pedro@example.com', role: 'Editor' },
];

export default function AutoCompleteShowcase() {
  const [selectedFruit, setSelectedFruit] = useState<Fruit | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [simpleValue, setSimpleValue] = useState<string>('');

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--color-primary)' }}>
            AutoComplete Component
          </h1>
          <p style={{ color: 'var(--color-muted)' }}>
            Componente de autocompletado con búsqueda en tiempo real, filtrado automático y navegación por teclado
          </p>
        </div>

        {/* Basic Example */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            Ejemplo Básico
          </h2>
          <div className="bg-white rounded-lg border border-gray-300 p-8">
            <div className="space-y-6">
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Autocompletado simple con búsqueda de frutas.
              </p>

              <div className="max-w-md">
                <AutoComplete
                  options={fruitOptions}
                  value={selectedFruit}
                  onChange={setSelectedFruit}
                  placeholder="Busca una fruta..."
                  getOptionLabel={(option: Fruit) => option.name}
                  getOptionValue={(option: Fruit) => option.id}
                />
              </div>

              {selectedFruit && (
                <div className="p-4 rounded-lg bg-green-50 border border-green-200 max-w-md">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{selectedFruit.emoji}</span>
                    <div>
                      <p className="font-semibold text-green-800">{selectedFruit.name}</p>
                      <p className="text-sm text-green-600">Color: {selectedFruit.color}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Advanced Examples */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            Ejemplos Avanzados
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Countries with Flags */}
            <div className="bg-white rounded-lg border border-gray-300 p-6">
              <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-primary)' }}>
                Países con Banderas
              </h3>
              <p className="text-sm mb-4" style={{ color: 'var(--color-muted)' }}>
                Búsqueda de países con códigos y banderas.
              </p>

              <AutoComplete
                options={countryOptions}
                value={selectedCountry}
                onChange={setSelectedCountry}
                placeholder="Buscar país..."
                getOptionLabel={(option: Country) => `${option.flag} ${option.name}`}
                getOptionValue={(option: Country) => option.id}
              />

              {selectedCountry && (
                <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{selectedCountry.flag}</span>
                    <div>
                      <p className="font-medium text-blue-800">{selectedCountry.name}</p>
                      <p className="text-xs text-blue-600">Código: {selectedCountry.code}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Users with Details */}
            <div className="bg-white rounded-lg border border-gray-300 p-6">
              <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-primary)' }}>
                Usuarios con Detalles
              </h3>
              <p className="text-sm mb-4" style={{ color: 'var(--color-muted)' }}>
                Búsqueda de usuarios con email y rol.
              </p>

              <AutoComplete
                options={userOptions}
                value={selectedUser}
                onChange={setSelectedUser}
                placeholder="Buscar usuario..."
                getOptionLabel={(option: User) => option.name}
                getOptionValue={(option: User) => option.id}
              />

              {selectedUser && (
                <div className="mt-4 p-3 rounded-lg bg-purple-50 border border-purple-200">
                  <div>
                    <p className="font-medium text-purple-800">{selectedUser.name}</p>
                    <p className="text-sm text-purple-600">{selectedUser.email}</p>
                    <p className="text-xs text-purple-500">Rol: {selectedUser.role}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Simple String Array */}
            <div className="bg-white rounded-lg border border-gray-300 p-6">
              <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-primary)' }}>
                Array Simple
              </h3>
              <p className="text-sm mb-4" style={{ color: 'var(--color-muted)' }}>
                Autocompletado con array de strings simple.
              </p>

              <AutoComplete
                options={['React', 'Vue', 'Angular', 'Svelte', 'Next.js', 'Nuxt.js']}
                value={simpleValue}
                onChange={(value) => setSimpleValue(value || '')}
                placeholder="Buscar framework..."
              />

              {simpleValue && (
                <div className="mt-4 p-3 rounded-lg bg-orange-50 border border-orange-200">
                  <p className="font-medium text-orange-800">Framework seleccionado: {simpleValue}</p>
                </div>
              )}
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
                {/* Input State */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm">Estado: Input Vacío</h3>
                  <div className="relative flex items-center border border-gray-300 rounded-lg bg-white h-12">
                    <div className="flex-1 h-full flex items-center px-4">
                      <div className="w-32 h-3 bg-gray-200 rounded"></div>
                    </div>
                    <div className="absolute right-2 top-0 h-full flex items-center">
                      <div className="w-6 h-6 rounded-full bg-gray-300"></div>
                    </div>
                  </div>
                </div>

                {/* Typing State */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm">Estado: Escribiendo</h3>
                  <div className="relative flex items-center border border-gray-400 rounded-lg bg-white h-12 shadow-sm">
                    <div className="flex-1 h-full flex items-center px-4">
                      <div className="w-24 h-3 bg-gray-300 rounded"></div>
                      <div className="w-2 h-4 bg-gray-600 ml-1 animate-pulse"></div>
                    </div>
                    <div className="absolute right-2 top-0 h-full flex items-center">
                      <div className="w-6 h-6 rounded-full bg-gray-300"></div>
                    </div>
                  </div>
                </div>

                {/* Dropdown State */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm">Estado: Opciones Visibles</h3>
                  <div className="relative">
                    <div className="flex items-center border border-gray-400 rounded-lg bg-white h-12 shadow-sm">
                      <div className="flex-1 h-full flex items-center px-4">
                        <div className="w-20 h-3 bg-gray-300 rounded"></div>
                      </div>
                      <div className="absolute right-2 top-0 h-full flex items-center">
                        <div className="w-6 h-6 rounded-full bg-gray-300"></div>
                      </div>
                    </div>
                    {/* Dropdown */}
                    <div className="absolute top-14 left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                      <div className="p-2 space-y-1">
                        <div className="h-8 bg-gray-50 rounded flex items-center px-3 hover:bg-gray-100">
                          <div className="w-16 h-3 bg-gray-300 rounded"></div>
                        </div>
                        <div className="h-8 bg-gray-100 rounded flex items-center px-3 border border-gray-400">
                          <div className="w-20 h-3 bg-gray-500 rounded"></div>
                        </div>
                        <div className="h-8 bg-gray-50 rounded flex items-center px-3 hover:bg-gray-100">
                          <div className="w-14 h-3 bg-gray-300 rounded"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="p-6 rounded-lg" style={{ backgroundColor: 'var(--color-secondary)', color: 'var(--color-background)' }}>
            <h3 className="font-semibold mb-3">Características Principales</h3>
            <ul className="text-sm space-y-2">
              <li>✓ Búsqueda en tiempo real</li>
              <li>✓ Filtrado automático de opciones</li>
              <li>✓ Navegación con teclado (↑↓ Enter)</li>
              <li>✓ Soporte para objetos complejos</li>
              <li>✓ Funciones personalizables getOptionLabel/Value</li>
              <li>✓ Estados de carga y validación</li>
              <li>✓ Soporte para arrays de strings simples</li>
            </ul>
          </div>

          <div className="p-6 rounded-lg" style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-background)' }}>
            <h3 className="font-semibold mb-3">Casos de Uso</h3>
            <ul className="text-sm space-y-2">
              <li>✓ Búsqueda de usuarios</li>
              <li>✓ Selección de países/ciudades</li>
              <li>✓ Búsqueda de productos</li>
              <li>✓ Selección de categorías</li>
              <li>✓ Autocompletado de formularios</li>
              <li>✓ Filtros con opciones</li>
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
              <h3 className="font-semibold mb-3">Uso Básico con Objetos</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`interface User {
  id: number;
  name: string;
  email: string;
}

const users: User[] = [
  { id: 1, name: 'Juan Pérez', email: 'juan@example.com' },
  // ... más usuarios
];

const [selectedUser, setSelectedUser] = useState<User | null>(null);

<AutoComplete
  options={users}
  value={selectedUser}
  onChange={setSelectedUser}
  placeholder="Buscar usuario..."
  getOptionLabel={(user) => user.name}
  getOptionValue={(user) => user.id}
/>`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Uso típico con objetos complejos, especificando cómo obtener la etiqueta y valor.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Array de Strings Simple</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`const frameworks = ['React', 'Vue', 'Angular', 'Svelte'];
const [selected, setSelected] = useState<string>('');

<AutoComplete
  options={frameworks}
  value={selected}
  onChange={setSelected}
  placeholder="Buscar framework..."
/>`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Para arrays simples de strings, no necesitas especificar getOptionLabel/getOptionValue.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Con Formulario</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`<form onSubmit={handleSubmit}>
  <AutoComplete
    options={countries}
    value={selectedCountry}
    onChange={setSelectedCountry}
    placeholder="Selecciona tu país"
    required
    name="country"
    getOptionLabel={(country) => country.name}
    getOptionValue={(country) => country.id}
  />
  <button type="submit">Enviar</button>
</form>`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Integración con formularios, incluyendo validación required y atributo name.
              </p>
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
