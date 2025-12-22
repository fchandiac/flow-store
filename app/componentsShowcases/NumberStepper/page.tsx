'use client';

import React, { useState } from 'react';
import NumberStepper from '@/app/baseComponents/NumberStepper/NumberStepper';

export default function NumberStepperShowcase() {
  const [basicValue, setBasicValue] = useState(0);
  const [limitedValue, setLimitedValue] = useState(5);
  const [floatValue, setFloatValue] = useState(10.5);
  const [negativeValue, setNegativeValue] = useState(-3);
  const [disabledValue, setDisabledValue] = useState(42);
  const [requiredValue, setRequiredValue] = useState(0);
  const [stepValue, setStepValue] = useState(0);
  const [largeStepValue, setLargeStepValue] = useState(100);
  const [iconOnlyValue, setIconOnlyValue] = useState(5);
  const [iconAboveValue, setIconAboveValue] = useState(3);
  const [iconBesideValue, setIconBesideValue] = useState(2);
  const [noLabelValue, setNoLabelValue] = useState(1);

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--color-primary)' }}>
            NumberStepper Component
          </h1>
          <p style={{ color: 'var(--color-muted)' }}>
            Componente de stepper numérico compacto con botones de incremento/decremento y validaciones avanzadas
          </p>
        </div>

        {/* Basic NumberStepper Showcase */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            NumberStepper Básico
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
                    <NumberStepper
                      label="Cantidad"
                      value={basicValue}
                      onChange={setBasicValue}
                    />
                    <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                      Básico - Valor: {basicValue}
                    </p>
                  </div>
                  <div className="text-center space-y-4">
                    <NumberStepper
                      label="Edad"
                      value={limitedValue}
                      onChange={setLimitedValue}
                      min={0}
                      max={120}
                    />
                    <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                      Con límites (0-120)
                    </p>
                  </div>
                  <div className="text-center space-y-4">
                    <NumberStepper
                      label="Precio"
                      value={floatValue}
                      onChange={setFloatValue}
                      step={0.5}
                      allowFloat={true}
                      min={0}
                    />
                    <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                      Números decimales
                    </p>
                  </div>
                </div>
              </div>

              {/* Estados Especiales */}
              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-primary)' }}>
                  Estados Especiales
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="text-center space-y-4">
                    <NumberStepper
                      label="Temperatura"
                      value={negativeValue}
                      onChange={setNegativeValue}
                      min={-50}
                      max={50}
                      allowNegative={true}
                    />
                    <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                      Permite negativos
                    </p>
                  </div>
                  <div className="text-center space-y-4">
                    <NumberStepper
                      label="Deshabilitado"
                      value={disabledValue}
                      onChange={setDisabledValue}
                      disabled={true}
                    />
                    <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                      Estado deshabilitado
                    </p>
                  </div>
                  <div className="text-center space-y-4">
                    <NumberStepper
                      label="Requerido"
                      value={requiredValue}
                      onChange={setRequiredValue}
                      required={true}
                      min={1}
                    />
                    <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                      Campo requerido
                    </p>
                  </div>
                </div>
              </div>

              {/* Configuraciones de Icono y Label */}
              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-primary)' }}>
                  Configuraciones de Icono y Label
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="text-center space-y-4">
                    <NumberStepper
                      icon="shopping_cart"
                      value={iconOnlyValue}
                      onChange={setIconOnlyValue}
                      min={0}
                      max={20}
                    />
                    <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                      Solo icono
                    </p>
                  </div>
                  <div className="text-center space-y-4">
                    <NumberStepper
                      icon="person"
                      label="Personas"
                      iconPosition="above"
                      value={iconAboveValue}
                      onChange={setIconAboveValue}
                      min={1}
                      max={10}
                    />
                    <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                      Icono arriba del label
                    </p>
                  </div>
                  <div className="text-center space-y-4">
                    <NumberStepper
                      icon="attach_money"
                      label="Precio"
                      iconPosition="beside"
                      value={iconBesideValue}
                      onChange={setIconBesideValue}
                      step={0.5}
                      allowFloat={true}
                      min={0}
                    />
                    <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                      Icono al lado del label
                    </p>
                  </div>
                  <div className="text-center space-y-4">
                    <NumberStepper
                      value={noLabelValue}
                      onChange={setNoLabelValue}
                      min={0}
                      max={10}
                    />
                    <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                      Sin label ni icono
                    </p>
                  </div>
                  <div className="text-center space-y-4">
                    <NumberStepper
                      label="Temperatura"
                      value={negativeValue}
                      onChange={setNegativeValue}
                      min={-10}
                      max={40}
                      allowNegative={true}
                    />
                    <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                      Solo label (compatibilidad)
                    </p>
                  </div>
                </div>
              </div>

              {/* Diferentes Steps */}
              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-primary)' }}>
                  Diferentes Pasos (Steps)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="text-center space-y-4">
                    <NumberStepper
                      label="Paso 5"
                      value={stepValue}
                      onChange={setStepValue}
                      step={5}
                      min={0}
                      max={100}
                    />
                    <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                      Incremento de 5 en 5
                    </p>
                  </div>
                  <div className="text-center space-y-4">
                    <NumberStepper
                      label="Paso 10"
                      value={largeStepValue}
                      onChange={setLargeStepValue}
                      step={10}
                      min={0}
                      max={1000}
                    />
                    <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                      Incremento de 10 en 10
                    </p>
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
              <li>✓ Botones de incremento/decremento</li>
              <li>✓ Input numérico editable manualmente</li>
              <li>✓ Validaciones automáticas (mín/máx)</li>
              <li>✓ Soporte para números enteros y decimales</li>
              <li>✓ Números negativos opcionales</li>
              <li>✓ Pasos personalizables</li>
              <li>✓ Estados disabled y required</li>
              <li>✓ Soporte completo para testing</li>
              <li>✓ Configuraciones flexibles de icono y label</li>
              <li>✓ Iconos de Material Symbols integrados</li>
              <li>✓ Diseño compacto por defecto</li>
            </ul>
          </div>

          <div className="p-6 rounded-lg" style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-background)' }}>
            <h3 className="font-semibold mb-3">Props Principales</h3>
            <ul className="text-sm space-y-2">
              <li>label?: string - Etiqueta del campo (opcional)</li>
              <li>icon?: string - Nombre del icono Material Symbols (opcional)</li>
              <li>iconPosition?: 'above'|'beside' - Posición del icono (default: 'above')</li>
              <li>value: number - Valor actual</li>
              <li>onChange: (value: number) =&gt; void</li>
              <li>step?: number - Incremento (default: 1)</li>
              <li>min?: number - Valor mínimo</li>
              <li>max?: number - Valor máximo</li>
              <li>allowFloat?: boolean - Permitir decimales</li>
              <li>allowNegative?: boolean - Permitir negativos</li>
              <li>required?: boolean - Campo obligatorio</li>
              <li>disabled?: boolean - Deshabilitar componente</li>
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
import NumberStepper from '@/app/baseComponents/NumberStepper/NumberStepper';

function MyComponent() {
  const [quantity, setQuantity] = useState(1);

  return (
    <NumberStepper
      label="Cantidad"
      value={quantity}
      onChange={setQuantity}
      min={1}
      max={99}
    />
  );
}`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Importación básica y uso simple con límites mínimo y máximo.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Con Números Decimales</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`<NumberStepper
  label="Precio"
  value={price}
  onChange={setPrice}
  step={0.25}
  allowFloat={true}
  min={0}
  placeholder="0.00"
/>

// Para monedas
<NumberStepper
  label="Descuento (%)"
  value={discount}
  onChange={setDiscount}
  step={0.5}
  allowFloat={true}
  min={0}
  max={100}
/>`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                <strong>allowFloat=true</strong> habilita números decimales. Útil para precios, porcentajes, medidas, etc.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Validaciones y Límites</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`// Edad con límites realistas
<NumberStepper
  label="Edad"
  value={age}
  onChange={setAge}
  min={0}
  max={120}
  allowNegative={false}
/>

// Cantidad de productos
<NumberStepper
  label="Unidades"
  value={units}
  onChange={setUnits}
  min={1}
  max={1000}
  step={1}
  required={true}
/>

// Temperatura (permite negativos)
<NumberStepper
  label="Temperatura (°C)"
  value={temperature}
  onChange={setTemperature}
  min={-50}
  max={50}
  step={0.1}
  allowFloat={true}
  allowNegative={true}
/>`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Configuración de límites con <code>min</code> y <code>max</code>. Los botones se deshabilitan automáticamente en los límites.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Diferentes Pasos (Steps)</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`// Paso estándar (1)
<NumberStepper
  label="Personas"
  value={people}
  onChange={setPeople}
  min={1}
  max={20}
/>

// Paso personalizado
<NumberStepper
  label="Volumen (L)"
  value={volume}
  onChange={setVolume}
  step={0.5}
  allowFloat={true}
  min={0.5}
  max={10}
/>

// Paso grande para valores altos
<NumberStepper
  label="Presupuesto ($)"
  value={budget}
  onChange={setBudget}
  step={1000}
  min={0}
  max={100000}
/>`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                El prop <code>step</code> controla cuánto se incrementa/decrementa con cada click. Por defecto es 1.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Estados y Formularios</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`const [formData, setFormData] = useState({
  quantity: 1,
  price: 0,
  discount: 0
});

const updateField = (field: string, value: number) => {
  setFormData(prev => ({ ...prev, [field]: value }));
};

// En formulario
<form onSubmit={handleSubmit}>
  <NumberStepper
    label="Cantidad"
    value={formData.quantity}
    onChange={(value) => updateField('quantity', value)}
    min={1}
    required
  />

  <NumberStepper
    label="Precio unitario"
    value={formData.price}
    onChange={(value) => updateField('price', value)}
    step={0.01}
    allowFloat={true}
    min={0}
  />

  <NumberStepper
    label="Descuento (%)"
    value={formData.discount}
    onChange={(value) => updateField('discount', value)}
    min={0}
    max={50}
    disabled={formData.price === 0}
  />
</form>`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Integración perfecta con formularios React. Los valores se pueden controlar desde un estado centralizado.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Con Testing</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`<NumberStepper
  label="Test Component"
  value={testValue}
  onChange={setTestValue}
  data-test-id="quantity-stepper"
  min={0}
  max={10}
/>

// En tus tests
const stepper = screen.getByTestId('quantity-stepper');
const incrementBtn = screen.getByTestId('quantity-stepper-increment');
const decrementBtn = screen.getByTestId('quantity-stepper-decrement');
const input = screen.getByDisplayValue('5');

// Simular clicks
fireEvent.click(incrementBtn);
fireEvent.click(decrementBtn);

// Cambiar valor directamente
fireEvent.change(input, { target: { value: '7' } });`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Soporte completo para testing con <code>data-test-id</code> en el componente raíz, botones y input.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Configuraciones de Icono y Label</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`// Solo icono (sin label)
<NumberStepper
  icon="shopping_cart"
  value={cartItems}
  onChange={setCartItems}
  min={0}
  max={99}
/>

// Icono arriba del label
<NumberStepper
  icon="person"
  label="Personas"
  iconPosition="above"
  value={people}
  onChange={setPeople}
  min={1}
  max={20}
/>

// Icono al lado del label
<NumberStepper
  icon="attach_money"
  label="Precio"
  iconPosition="beside"
  value={price}
  onChange={setPrice}
  step={0.5}
  allowFloat={true}
  min={0}
/>

// Solo label (compatibilidad)
<NumberStepper
  label="Cantidad"
  value={quantity}
  onChange={setQuantity}
  min={1}
  max={100}
/>

// Sin label ni icono (input puro)
<NumberStepper
  value={number}
  onChange={setNumber}
  min={0}
  max={10}
/>`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Las props <code>label</code>, <code>icon</code> e <code>iconPosition</code> son opcionales y permiten flexibilidad en la presentación. Los iconos usan Material Symbols.
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
                {/* NumberStepper wireframe */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm">NumberStepper Component</h3>
                  <div className="flex items-center border border-gray-400 rounded-md bg-gray-100">
                    {/* Botón decrementar */}
                    <div className="flex items-center justify-center px-3 py-2 border-r border-gray-400">
                      <div className="w-4 h-4 bg-gray-300 rounded"></div>
                    </div>
                    {/* Área central */}
                    <div className="flex flex-col items-center justify-center flex-1 py-2">
                      <div className="h-4 w-8 bg-gray-300 rounded mb-1"></div>
                      <div className="h-3 w-12 bg-gray-200 rounded"></div>
                    </div>
                    {/* Botón incrementar */}
                    <div className="flex items-center justify-center px-3 py-2 border-l border-gray-400">
                      <div className="w-4 h-4 bg-gray-300 rounded"></div>
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