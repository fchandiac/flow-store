'use client';

import React, { useState } from 'react';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import { Button } from '@/app/baseComponents/Button/Button';
import { useAlert } from '../../state/hooks/useAlert';

export default function DialogShowcase() {
  const { success, error, info, warning } = useAlert();

  // Estados para controlar la visibilidad de cada dialog
  const [basicDialog, setBasicDialog] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [sizeDialog, setSizeDialog] = useState<'xs' | 'sm' | 'md' | 'lg' | 'xl' | null>(null);
  const [scrollDialog, setScrollDialog] = useState(false);
  const [persistentDialog, setPersistentDialog] = useState(false);
  const [customDialog, setCustomDialog] = useState(false);
  const [formDialog, setFormDialog] = useState(false);

  // Estados para el formulario
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const handleFormSubmit = () => {
    if (!formData.name || !formData.email) {
      error('Por favor completa todos los campos requeridos');
      return;
    }
    success('Formulario enviado correctamente');
    setFormDialog(false);
    setFormData({ name: '', email: '', message: '' });
  };

  const handleConfirm = () => {
    success('Acción confirmada exitosamente');
    setConfirmDialog(false);
  };

  const handleCancel = () => {
    info('Acción cancelada');
    setConfirmDialog(false);
  };

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--color-primary)' }}>
            Dialog Component
          </h1>
          <p style={{ color: 'var(--color-muted)' }}>
            Componente de diálogo modal altamente configurable con múltiples opciones de personalización
          </p>
        </div>

        {/* Basic Dialog */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            Diálogo Básico
          </h2>
          <div className="bg-white rounded-lg border border-gray-300 p-8">
            <div className="space-y-6">
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Un diálogo simple con título y contenido básico.
              </p>

              <Button onClick={() => setBasicDialog(true)} variant="primary">
                Abrir Diálogo Básico
              </Button>
            </div>
          </div>
        </div>

        {/* Confirmation Dialog */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            Diálogo de Confirmación
          </h2>
          <div className="bg-white rounded-lg border border-gray-300 p-8">
            <div className="space-y-6">
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Diálogo con acciones personalizadas para confirmar o cancelar una acción.
              </p>

              <Button onClick={() => setConfirmDialog(true)} variant="primary">
                Abrir Diálogo de Confirmación
              </Button>
            </div>
          </div>
        </div>

        {/* Size Variants */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            Variantes de Tamaño
          </h2>
          <div className="bg-white rounded-lg border border-gray-300 p-8">
            <div className="space-y-6">
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                El componente Dialog soporta diferentes tamaños predefinidos.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((size) => (
                  <Button
                    key={size}
                    onClick={() => setSizeDialog(size)}
                    variant="outlined"
                    className="capitalize"
                  >
                    {size.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Dialog */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            Diálogo con Scroll
          </h2>
          <div className="bg-white rounded-lg border border-gray-300 p-8">
            <div className="space-y-6">
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Diálogo con contenido largo que requiere scroll interno.
              </p>

              <Button onClick={() => setScrollDialog(true)} variant="primary">
                Abrir Diálogo con Scroll
              </Button>
            </div>
          </div>
        </div>

        {/* Persistent Dialog */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            Diálogo Persistente
          </h2>
          <div className="bg-white rounded-lg border border-gray-300 p-8">
            <div className="space-y-6">
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Diálogo que no se puede cerrar haciendo click en el backdrop o presionando ESC.
              </p>

              <Button onClick={() => setPersistentDialog(true)} variant="primary">
                Abrir Diálogo Persistente
              </Button>
            </div>
          </div>
        </div>

        {/* Custom Dialog */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            Diálogo Personalizado
          </h2>
          <div className="bg-white rounded-lg border border-gray-300 p-8">
            <div className="space-y-6">
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Diálogo con configuraciones personalizadas de tamaño y comportamiento.
              </p>

              <Button onClick={() => setCustomDialog(true)} variant="primary">
                Abrir Diálogo Personalizado
              </Button>
            </div>
          </div>
        </div>

        {/* Form Dialog */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            Diálogo con Formulario
          </h2>
          <div className="bg-white rounded-lg border border-gray-300 p-8">
            <div className="space-y-6">
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Diálogo que contiene un formulario interactivo.
              </p>

              <Button onClick={() => setFormDialog(true)} variant="primary">
                Abrir Formulario
              </Button>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="p-6 rounded-lg" style={{ backgroundColor: 'var(--color-secondary)', color: 'var(--color-background)' }}>
            <h3 className="font-semibold mb-3">Características Principales</h3>
            <ul className="text-sm space-y-2">
              <li>✓ 5 tamaños predefinidos (xs, sm, md, lg, xl)</li>
              <li>✓ Tamaños personalizados por breakpoint</li>
              <li>✓ Animaciones de entrada/salida</li>
              <li>✓ Scroll interno o del body</li>
              <li>✓ Modo persistente</li>
              <li>✓ Botón de cerrar opcional</li>
            </ul>
          </div>

          <div className="p-6 rounded-lg" style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-background)' }}>
            <h3 className="font-semibold mb-3">Opciones de Comportamiento</h3>
            <ul className="text-sm space-y-2">
              <li>✓ Cierre con ESC</li>
              <li>✓ Cierre con click en backdrop</li>
              <li>✓ Bloqueo de scroll del body</li>
              <li>✓ Z-index configurable</li>
              <li>✓ Acciones personalizadas</li>
              <li>✓ Contenido completamente personalizable</li>
            </ul>
          </div>
        </div>

        {/* Usage Example */}
        <div className="bg-white rounded-lg border border-gray-300 p-8 mb-8">
          <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            Ejemplo de Uso
          </h2>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-4">
{`import Dialog from '@/components/Dialog/Dialog';
import Button from '@/components/Button/Button';

function MyComponent() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        Abrir Diálogo
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Mi Diálogo"
        size="md"
        actions={
          <div className="flex gap-2 justify-end">
            <Button variant="outlined" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm}>
              Confirmar
            </Button>
          </div>
        }
      >
        <p>Contenido del diálogo...</p>
      </Dialog>
    </>
  );
}`}
          </pre>
          <p style={{ color: 'var(--color-muted)' }} className="text-sm">
            <strong>Nota:</strong> El componente Dialog maneja automáticamente el bloqueo del scroll del body,
            las animaciones, y el manejo de teclado (ESC).
          </p>
        </div>

        {/* Wireframe */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            Wireframe
          </h2>
          <div className="bg-white rounded-lg border border-gray-300 p-8">
            <div className="max-w-md mx-auto">
              <div className="space-y-4">
                {/* Dialog wireframe */}
                <div className="relative bg-white border border-gray-300 rounded-lg shadow-lg max-w-sm mx-auto">
                  {/* Header */}
                  <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <div className="h-4 w-24 bg-gray-300 rounded"></div>
                    <div className="w-6 h-6 rounded bg-gray-300"></div>
                  </div>
                  {/* Content */}
                  <div className="p-4 space-y-3">
                    <div className="h-3 w-32 bg-gray-200 rounded"></div>
                    <div className="h-3 w-40 bg-gray-200 rounded"></div>
                    <div className="h-3 w-28 bg-gray-200 rounded"></div>
                  </div>
                  {/* Actions */}
                  <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
                    <div className="h-8 w-16 bg-gray-300 rounded"></div>
                    <div className="h-8 w-16 bg-gray-400 rounded"></div>
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

      {/* Basic Dialog */}
      <Dialog
        open={basicDialog}
        onClose={() => setBasicDialog(false)}
        title="Diálogo Básico"
        size="md"
      >
        <p className="mb-4">
          Este es un diálogo básico con título y contenido simple.
          Se puede cerrar haciendo click en el backdrop o presionando ESC.
        </p>
        <p>
          El componente maneja automáticamente las animaciones de entrada y salida,
          así como el bloqueo del scroll del body.
        </p>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog}
        onClose={() => setConfirmDialog(false)}
        title="Confirmar Acción"
        size="sm"
        actions={
          <div className="flex gap-2 justify-end">
            <Button variant="outlined" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm}>
              Confirmar
            </Button>
          </div>
        }
      >
        <p className="mb-4">
          ¿Estás seguro de que quieres realizar esta acción?
          Esta acción no se puede deshacer.
        </p>
        <div className="flex items-center gap-2 text-yellow-600">
          <span className="material-symbols-outlined">warning</span>
          <span className="text-sm">Esta es una acción irreversible</span>
        </div>
      </Dialog>

      {/* Size Dialog */}
      {sizeDialog && (
        <Dialog
          open={!!sizeDialog}
          onClose={() => setSizeDialog(null)}
          title={`Diálogo ${sizeDialog.toUpperCase()}`}
          size={sizeDialog}
        >
          <p className="mb-4">
            Este diálogo tiene tamaño <strong>{sizeDialog.toUpperCase()}</strong>.
          </p>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            Los tamaños disponibles son: xs (extra pequeño), sm (pequeño),
            md (mediano), lg (grande), xl (extra grande).
          </p>
        </Dialog>
      )}

      {/* Scroll Dialog */}
      <Dialog
        open={scrollDialog}
        onClose={() => setScrollDialog(false)}
        title="Contenido con Scroll"
        size="md"
        scroll="paper"
        maxHeight="400px"
      >
        <div className="space-y-4">
          <p>
            Este diálogo tiene contenido largo que requiere scroll interno.
            El scroll está configurado en modo "paper", lo que significa que
            el contenido del diálogo tiene su propio scroll.
          </p>

          {Array.from({ length: 20 }, (_, i) => (
            <div key={i} className="p-3 bg-gray-50 rounded">
              <h4 className="font-semibold">Elemento {i + 1}</h4>
              <p className="text-sm">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
              </p>
            </div>
          ))}
        </div>
      </Dialog>

      {/* Persistent Dialog */}
      <Dialog
        open={persistentDialog}
        onClose={() => setPersistentDialog(false)}
        title="Diálogo Persistente"
        size="sm"
        persistent={true}
        showCloseButton={true}
        closeButtonText="Entendido"
      >
        <p className="mb-4">
          Este diálogo es persistente. No se puede cerrar haciendo click
          en el backdrop ni presionando la tecla ESC.
        </p>
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          Solo se puede cerrar usando el botón de cerrar en la esquina
          superior derecha o programáticamente.
        </p>
      </Dialog>

      {/* Custom Dialog */}
      <Dialog
        open={customDialog}
        onClose={() => setCustomDialog(false)}
        title="Diálogo Personalizado"
        size="custom"
        maxWidth="600px"
        minWidth="400px"
        height="300px"
        showCloseButton={true}
        closeButtonText="Cerrar"
      >
        <div className="space-y-4">
          <p>Este diálogo tiene configuraciones completamente personalizadas:</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Ancho máximo: 600px</li>
            <li>Ancho mínimo: 400px</li>
            <li>Alto fijo: 300px</li>
            <li>Botón de cerrar personalizado</li>
          </ul>
          <div className="mt-4 p-4 rounded" style={{ backgroundColor: 'var(--color-secondary)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-background)' }}>
              ¡Configuración completamente personalizable!
            </p>
          </div>
        </div>
      </Dialog>

      {/* Form Dialog */}
      <Dialog
        open={formDialog}
        onClose={() => setFormDialog(false)}
        title="Enviar Mensaje"
        size="lg"
        actions={
          <div className="flex gap-2 justify-end">
            <Button variant="outlined" onClick={() => setFormDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleFormSubmit}>
              Enviar
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nombre *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Tu nombre"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Mensaje</label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Tu mensaje..."
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}