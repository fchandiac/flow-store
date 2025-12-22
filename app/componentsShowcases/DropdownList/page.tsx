'use client';

import React, { useState } from 'react';
import DropdownList from '@/app/baseComponents/DropdownList/DropdownList';

export default function DropdownListShowcase() {
  const [isOpen1, setIsOpen1] = useState(false);
  const [selectedItem1, setSelectedItem1] = useState<string | null>(null);

  const [isOpen2, setIsOpen2] = useState(false);
  const [selectedItem2, setSelectedItem2] = useState<string | null>(null);

  const [isOpen3, setIsOpen3] = useState(false);
  const [selectedItem3, setSelectedItem3] = useState<string | null>(null);

  const basicOptions = [
    'Opción 1',
    'Opción 2',
    'Opción 3',
    'Opción 4',
    'Opción 5',
  ];

  const actionOptions = [
    { label: 'Editar perfil', icon: 'edit', action: 'edit' },
    { label: 'Cambiar contraseña', icon: 'lock', action: 'password' },
    { label: 'Eliminar cuenta', icon: 'delete', action: 'delete', danger: true },
  ];

  const userOptions = [
    { name: 'Juan Pérez', role: 'Administrador', avatar: '👤' },
    { name: 'María García', role: 'Editor', avatar: '👩' },
    { name: 'Carlos López', role: 'Visor', avatar: '👨' },
  ];

  const handleSelect1 = (item: string) => {
    setSelectedItem1(item);
    setIsOpen1(false);
  };

  const handleSelect2 = (item: string) => {
    setSelectedItem2(item);
    setIsOpen2(false);
  };

  const handleActionSelect = (action: string) => {
    setSelectedItem3(`Acción: ${action}`);
    setIsOpen3(false);
  };

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--color-primary)' }}>
            DropdownList Component
          </h1>
          <p style={{ color: 'var(--color-muted)' }}>
            Componente versátil para listas desplegables con contenido personalizado y manejo de eventos
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
                Lista desplegable simple con opciones de texto básico.
              </p>

              <div className="relative">
                <button
                  onClick={() => setIsOpen1(!isOpen1)}
                  className="px-4 py-2 rounded-lg font-medium transition-all border border-gray-300 hover:border-gray-400"
                  style={{
                    backgroundColor: 'var(--color-background)',
                    color: 'var(--color-foreground)',
                  }}
                >
                  {selectedItem1 || 'Selecciona una opción'} ▼
                </button>

                {isOpen1 && (
                  <DropdownList open={isOpen1} testId="dropdown-basic">
                    {basicOptions.map((option, idx) => (
                      <li
                        key={idx}
                        onClick={() => handleSelect1(option)}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer transition-colors"
                        style={{ color: 'var(--color-foreground)' }}
                      >
                        {option}
                      </li>
                    ))}
                  </DropdownList>
                )}
              </div>

              {selectedItem1 && (
                <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                  <p className="text-sm text-green-800">
                    <strong>Seleccionado:</strong> {selectedItem1}
                  </p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Actions Menu */}
            <div className="bg-white rounded-lg border border-gray-300 p-8">
              <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-primary)' }}>
                Menú de Acciones
              </h3>
              <p className="text-sm mb-6" style={{ color: 'var(--color-muted)' }}>
                Lista con iconos y acciones específicas.
              </p>

              <div className="relative">
                <button
                  onClick={() => setIsOpen2(!isOpen2)}
                  className="px-4 py-2 rounded-lg font-medium transition-all border border-gray-300 hover:border-gray-400"
                  style={{
                    backgroundColor: 'var(--color-background)',
                    color: 'var(--color-foreground)',
                  }}
                >
                  {selectedItem2 || 'Acciones'} ▼
                </button>

                {isOpen2 && (
                  <DropdownList open={isOpen2} testId="dropdown-actions">
                    {actionOptions.map((option, idx) => (
                      <li
                        key={idx}
                        onClick={() => handleSelect2(option.label)}
                        className={`px-4 py-3 hover:bg-gray-100 cursor-pointer transition-colors flex items-center gap-3 ${
                          option.danger ? 'text-red-600 hover:bg-red-50' : ''
                        }`}
                        style={{ color: option.danger ? undefined : 'var(--color-foreground)' }}
                      >
                        <span className="material-symbols-outlined text-lg">
                          {option.icon}
                        </span>
                        <span>{option.label}</span>
                      </li>
                    ))}
                  </DropdownList>
                )}
              </div>

              {selectedItem2 && (
                <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <strong>Acción ejecutada:</strong> {selectedItem2}
                  </p>
                </div>
              )}
            </div>

            {/* User Selection */}
            <div className="bg-white rounded-lg border border-gray-300 p-8">
              <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-primary)' }}>
                Selección de Usuario
              </h3>
              <p className="text-sm mb-6" style={{ color: 'var(--color-muted)' }}>
                Lista con avatares y información adicional.
              </p>

              <div className="relative">
                <button
                  onClick={() => setIsOpen3(!isOpen3)}
                  className="px-4 py-2 rounded-lg font-medium transition-all border border-gray-300 hover:border-gray-400"
                  style={{
                    backgroundColor: 'var(--color-background)',
                    color: 'var(--color-foreground)',
                  }}
                >
                  {selectedItem3 || 'Seleccionar usuario'} ▼
                </button>

                {isOpen3 && (
                  <DropdownList open={isOpen3} testId="dropdown-users">
                    {userOptions.map((user, idx) => (
                      <li
                        key={idx}
                        onClick={() => handleActionSelect(user.name)}
                        className="px-4 py-3 hover:bg-gray-100 cursor-pointer transition-colors flex items-center gap-3"
                        style={{ color: 'var(--color-foreground)' }}
                      >
                        <span className="text-2xl">{user.avatar}</span>
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-xs opacity-70">{user.role}</div>
                        </div>
                      </li>
                    ))}
                  </DropdownList>
                )}
              </div>

              {selectedItem3 && (
                <div className="mt-4 p-3 rounded-lg bg-purple-50 border border-purple-200">
                  <p className="text-sm text-purple-800">
                    <strong>Usuario seleccionado:</strong> {selectedItem3}
                  </p>
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
              <div className="space-y-4">
                {/* Trigger Button */}
                <div className="flex justify-center">
                  <div className="w-48 h-10 bg-gray-200 border border-gray-300 rounded-lg flex items-center justify-between px-3">
                    <div className="w-24 h-3 bg-gray-300 rounded"></div>
                    <div className="w-3 h-3 bg-gray-400 rounded transform rotate-45"></div>
                  </div>
                </div>

                {/* Dropdown */}
                <div className="relative">
                  <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-48 bg-white border border-gray-300 rounded-lg shadow-lg">
                    <div className="p-2 space-y-1">
                      <div className="h-8 bg-gray-100 rounded flex items-center px-3">
                        <div className="w-16 h-3 bg-gray-300 rounded"></div>
                      </div>
                      <div className="h-8 bg-gray-100 rounded flex items-center px-3">
                        <div className="w-20 h-3 bg-gray-300 rounded"></div>
                      </div>
                      <div className="h-8 bg-gray-100 rounded flex items-center px-3">
                        <div className="w-14 h-3 bg-gray-300 rounded"></div>
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
              <li>✓ Control de visibilidad programático</li>
              <li>✓ Contenido completamente personalizable</li>
              <li>✓ Manejo de eventos click en items</li>
              <li>✓ Soporte para testing con testId</li>
              <li>✓ Posicionamiento absoluto flexible</li>
              <li>✓ Estilos personalizables con className</li>
            </ul>
          </div>

          <div className="p-6 rounded-lg" style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-background)' }}>
            <h3 className="font-semibold mb-3">Casos de Uso</h3>
            <ul className="text-sm space-y-2">
              <li>✓ Menús desplegables</li>
              <li>✓ Selectores de opciones</li>
              <li>✓ Listas de acciones</li>
              <li>✓ Navegación contextual</li>
              <li>✓ Selección de usuarios</li>
              <li>✓ Filtros y opciones</li>
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
{`const [isOpen, setIsOpen] = useState(false);
const [selected, setSelected] = useState(null);

return (
  <>
    <button onClick={() => setIsOpen(!isOpen)}>
      {selected || 'Seleccionar'} ▼
    </button>

    {isOpen && (
      <DropdownList open={isOpen} testId="my-dropdown">
        {options.map((option, idx) => (
          <li key={idx} onClick={() => {
            setSelected(option);
            setIsOpen(false);
          }}>
            {option}
          </li>
        ))}
      </DropdownList>
    )}
  </>
);`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Patrón básico de uso con estado local para controlar visibilidad y selección.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Con Contenido Complejo</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`<DropdownList open={isOpen} testId="user-menu">
  {users.map((user) => (
    <li
      key={user.id}
      onClick={() => handleUserSelect(user)}
      className="flex items-center gap-3 p-3 hover:bg-gray-100"
    >
      <img src={user.avatar} className="w-8 h-8 rounded-full" />
      <div>
        <div className="font-medium">{user.name}</div>
        <div className="text-sm text-gray-500">{user.role}</div>
      </div>
    </li>
  ))}
</DropdownList>`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Dropdown con contenido complejo incluyendo imágenes y múltiples elementos.
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
