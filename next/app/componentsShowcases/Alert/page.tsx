'use client';

import React from 'react';
import Alert from '@/app/baseComponents/Alert/Alert';
import { useAlert } from '@/app/globalstate/alert/useAlert';

export default function AlertShowcase() {
  const { success, error, info, warning, showAlert } = useAlert();

  const handleSuccess = () => {
    success('¡Operación completada exitosamente!');
  };

  const handleError = () => {
    error('Ha ocurrido un error inesperado');
  };

  const handleInfo = () => {
    info('Esta es una información importante');
  };

  const handleWarning = () => {
    warning('Advertencia: revisa los datos antes de continuar');
  };

  const handleCustomAlert = () => {
    showAlert({
      message: 'Esta es una alerta personalizada con duración específica',
      type: 'info',
      duration: 3000
    });
  };

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--color-primary)' }}>
            Alert Component & Context
          </h1>
          <p style={{ color: 'var(--color-muted)' }}>
            Sistema completo de alertas con Context, hook personalizado y componente visual
          </p>
        </div>

        {/* Hook Usage Examples */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            Uso del Hook useAlert()
          </h2>
          <div className="bg-white rounded-lg border border-gray-300 p-8">
            <div className="space-y-6">
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Haz clic en los botones para mostrar diferentes tipos de alertas usando el hook <code>useAlert()</code>.
                Las alertas aparecerán en la esquina superior derecha.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  onClick={handleSuccess}
                  className="px-4 py-2 rounded bg-green-500 text-white hover:bg-green-600 transition-colors"
                >
                  Success Alert
                </button>
                <button
                  onClick={handleError}
                  className="px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600 transition-colors"
                >
                  Error Alert
                </button>
                <button
                  onClick={handleInfo}
                  className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                >
                  Info Alert
                </button>
                <button
                  onClick={handleWarning}
                  className="px-4 py-2 rounded bg-yellow-500 text-white hover:bg-yellow-600 transition-colors"
                >
                  Warning Alert
                </button>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={handleCustomAlert}
                  className="px-4 py-2 rounded bg-purple-500 text-white hover:bg-purple-600 transition-colors"
                >
                  Custom Alert (3s duration)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Component Variants */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            Variantes del Componente Alert
          </h2>
          <div className="bg-white rounded-lg border border-gray-300 p-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-primary)' }}>
                  Success
                </h3>
                <Alert variant="success">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-600">check_circle</span>
                    Operación completada exitosamente
                  </div>
                </Alert>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-primary)' }}>
                  Error
                </h3>
                <Alert variant="error">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-red-600">error</span>
                    Ha ocurrido un error inesperado
                  </div>
                </Alert>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-primary)' }}>
                  Info
                </h3>
                <Alert variant="info">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-600">info</span>
                    Esta es una información importante
                  </div>
                </Alert>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-primary)' }}>
                  Warning
                </h3>
                <Alert variant="warning">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-yellow-600">warning</span>
                    Advertencia: revisa los datos antes de continuar
                  </div>
                </Alert>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="p-6 rounded-lg" style={{ backgroundColor: 'var(--color-secondary)', color: 'var(--color-background)' }}>
            <h3 className="font-semibold mb-3">Características</h3>
            <ul className="text-sm space-y-2">
              <li>✓ 4 variantes: success, error, info, warning</li>
              <li>✓ Context global para gestión de estado</li>
              <li>✓ Hook personalizado useAlert()</li>
              <li>✓ Alertas con duración automática</li>
              <li>✓ Posicionamiento fijo (top-right)</li>
              <li>✓ Soporte para iconos y contenido personalizado</li>
            </ul>
          </div>

          <div className="p-6 rounded-lg" style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-background)' }}>
            <h3 className="font-semibold mb-3">API del Hook</h3>
            <ul className="text-sm space-y-2">
              <li><code>success(message, options)</code> - Alerta verde</li>
              <li><code>error(message, options)</code> - Alerta roja</li>
              <li><code>info(message, options)</code> - Alerta azul</li>
              <li><code>warning(message, options)</code> - Alerta amarilla</li>
              <li><code>showAlert(alert)</code> - Alerta personalizada</li>
            </ul>
          </div>
        </div>

        {/* Usage Example */}
        <div className="bg-white rounded-lg border border-gray-300 p-8 mb-8">
          <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            Ejemplo de Uso
          </h2>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-4">
{`import { useAlert } from '@/app/state/hooks/useAlert';

function MyComponent() {
  const { success, error, info, warning } = useAlert();

  const handleSave = () => {
    try {
      // Lógica de guardado
      success('Datos guardados correctamente');
    } catch (err) {
      error('Error al guardar los datos');
    }
  };

  return (
    <button onClick={handleSave}>
      Guardar
    </button>
  );
}`}
          </pre>
          <p style={{ color: 'var(--color-muted)' }} className="text-sm">
            <strong>Nota:</strong> El AlertProvider ya está configurado globalmente en la aplicación.
            Solo necesitas importar y usar el hook <code>useAlert()</code> en cualquier componente.
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
                {/* Alert wireframe */}
                <div className="flex items-start gap-3 p-4 border border-gray-300 rounded-lg bg-gray-50">
                  {/* Icon */}
                  <div className="w-5 h-5 rounded-full bg-gray-400 flex-shrink-0 mt-0.5"></div>
                  {/* Content */}
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-24 bg-gray-300 rounded"></div>
                    <div className="h-3 w-48 bg-gray-200 rounded"></div>
                  </div>
                  {/* Close button */}
                  <div className="w-4 h-4 rounded bg-gray-300 flex-shrink-0"></div>
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