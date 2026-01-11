'use client';

import React, { useState } from 'react';
import Switch from '@/app/baseComponents/Switch/Switch';

export default function SwitchShowcase() {
  const [basicSwitch, setBasicSwitch] = useState(false);
  const [labeledSwitch, setLabeledSwitch] = useState(true);
  const [rightLabelSwitch, setRightLabelSwitch] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [autoSave, setAutoSave] = useState(true);

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--color-primary)' }}>
            Switch Component
          </h1>
          <p style={{ color: 'var(--color-muted)' }}>
            Componente de interruptor para activar/desactivar opciones booleanas con transiciones suaves
          </p>
        </div>

        {/* Basic Switch Showcase */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            Switch Básico
          </h2>
          <div className="bg-white rounded-lg border border-gray-300 p-8">
            <div className="space-y-8">
              {/* Estados Básicos */}
              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-primary)' }}>
                  Estados Básicos
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="text-center space-y-4">
                    <Switch
                      checked={basicSwitch}
                      onChange={setBasicSwitch}
                    />
                    <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                      Sin label - {basicSwitch ? 'Activado' : 'Desactivado'}
                    </p>
                  </div>
                  <div className="text-center space-y-4">
                    <Switch
                      checked={labeledSwitch}
                      onChange={setLabeledSwitch}
                      label="Con Label Izquierdo"
                    />
                    <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                      Label a la izquierda
                    </p>
                  </div>
                  <div className="text-center space-y-4">
                    <Switch
                      checked={rightLabelSwitch}
                      onChange={setRightLabelSwitch}
                      label="Label Derecho"
                      labelPosition="right"
                    />
                    <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                      Label a la derecha
                    </p>
                  </div>
                </div>
              </div>

              {/* Casos de Uso Comunes */}
              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-primary)' }}>
                  Casos de Uso Comunes
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium" style={{ color: 'var(--color-primary)' }}>Configuración de App</h4>
                    <div className="space-y-3">
                      <Switch
                        checked={notificationsEnabled}
                        onChange={setNotificationsEnabled}
                        label="Notificaciones Push"
                      />
                      <Switch
                        checked={darkMode}
                        onChange={setDarkMode}
                        label="Modo Oscuro"
                      />
                      <Switch
                        checked={autoSave}
                        onChange={setAutoSave}
                        label="Guardado Automático"
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-medium" style={{ color: 'var(--color-primary)' }}>Estados de Funcionalidades</h4>
                    <div className="space-y-3">
                      <Switch
                        checked={true}
                        onChange={() => {}}
                        label="Cuenta Premium"
                        labelPosition="right"
                      />
                      <Switch
                        checked={false}
                        onChange={() => {}}
                        label="Modo Offline"
                        labelPosition="right"
                      />
                      <Switch
                        checked={true}
                        onChange={() => {}}
                        label="Sincronización"
                        labelPosition="right"
                      />
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
              <li>✓ Estados booleanos (activado/desactivado)</li>
              <li>✓ Transiciones suaves de animación</li>
              <li>✓ Soporte para labels personalizables</li>
              <li>✓ Posición del label (izquierda/derecha)</li>
              <li>✓ Accesibilidad completa (ARIA)</li>
              <li>✓ Soporte para testing (data-test-id)</li>
            </ul>
          </div>

          <div className="p-6 rounded-lg" style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-background)' }}>
            <h3 className="font-semibold mb-3">Props Principales</h3>
            <ul className="text-sm space-y-2">
              <li>checked?: boolean - Estado inicial</li>
              <li>onChange?: (checked: boolean) =&gt; void</li>
              <li>label?: string - Texto del label</li>
              <li>labelPosition?: 'left' | 'right'</li>
              <li>data-test-id?: string - Para testing</li>
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
import Switch from '@/app/baseComponents/Switch/Switch';

function MyComponent() {
  const [isEnabled, setIsEnabled] = useState(false);

  return (
    <Switch
      checked={isEnabled}
      onChange={setIsEnabled}
    />
  );
}`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Importación básica y uso simple del componente Switch sin label.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Con Label Personalizado</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`// Label a la izquierda (por defecto)
<Switch
  checked={notifications}
  onChange={setNotifications}
  label="Recibir notificaciones"
/>

// Label a la derecha
<Switch
  checked={marketing}
  onChange={setMarketing}
  label="Email marketing"
  labelPosition="right"
/>

// Sin label (solo el switch)
<Switch
  checked={toggle}
  onChange={setToggle}
/>`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                El componente Switch soporta labels opcionales en ambas posiciones.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Estados Controlados</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`const [settings, setSettings] = useState({
  notifications: true,
  darkMode: false,
  autoSave: true
});

const updateSetting = (key: string, value: boolean) => {
  setSettings(prev => ({ ...prev, [key]: value }));
};

// Uso en configuración
<Switch
  checked={settings.notifications}
  onChange={(checked) => updateSetting('notifications', checked)}
  label="Notificaciones"
/>

<Switch
  checked={settings.darkMode}
  onChange={(checked) => updateSetting('darkMode', checked)}
  label="Modo oscuro"
/>`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Manejo de múltiples switches en un estado centralizado, común en configuraciones.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Con Testing</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`<Switch
  checked={isActive}
  onChange={setIsActive}
  label="Activar función"
  data-test-id="feature-toggle"
/>

// En tus tests
const switchElement = screen.getByTestId('feature-toggle');
const toggle = within(switchElement).getByRole('switch');

fireEvent.click(toggle);
expect(toggle).toHaveAttribute('aria-checked', 'true');`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                El componente incluye soporte completo para testing con data-test-id y atributos ARIA.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Integración con Formularios</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`<form onSubmit={handleSubmit}>
  <div className="space-y-4">
    <Switch
      checked={agreeToTerms}
      onChange={setAgreeToTerms}
      label="Acepto los términos y condiciones"
      required
    />

    <Switch
      checked={subscribeNewsletter}
      onChange={setSubscribeNewsletter}
      label="Suscribirme al newsletter"
    />

    <button type="submit" disabled={!agreeToTerms}>
      Crear cuenta
    </button>
  </div>
</form>`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Integración perfecta con formularios React, incluyendo validación required.
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
                {/* Switch wireframe */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm">Switch Component</h3>
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-12 bg-gray-200 rounded"></div>
                    <div className="relative w-10 h-6 flex items-center rounded-full border-2 border-gray-300 bg-gray-100">
                      <div className="absolute left-1 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-gray-400"></div>
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