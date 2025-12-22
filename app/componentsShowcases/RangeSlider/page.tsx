'use client';

import React, { useState } from 'react';
import RangeSlider from '@/app/baseComponents/RangeSlider/RangeSlider';

export default function RangeSliderShowcase() {
  const [basicRange, setBasicRange] = useState<[number, number]>([20, 80]);
  const [priceRange, setPriceRange] = useState<[number, number]>([100, 500]);
  const [percentageRange, setPercentageRange] = useState<[number, number]>([25, 75]);
  const [temperatureRange, setTemperatureRange] = useState<[number, number]>([15, 30]);
  const [controlledRange, setControlledRange] = useState<[number, number]>([10, 90]);
  const [dynamicRange, setDynamicRange] = useState<[number, number]>([0, 100]);

  const handleRangeChange = (values: [number, number]) => {
    console.log('Range changed:', values);
  };

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--color-primary)' }}>
            RangeSlider Component
          </h1>
          <p style={{ color: 'var(--color-muted)' }}>
            Componente de slider de rango dual con dos controles deslizantes para seleccionar un intervalo de valores
          </p>
        </div>

        {/* Basic Usage */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            Uso Básico
          </h2>
          <div className="bg-white rounded-lg border border-gray-300 p-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-primary)' }}>
                  Slider Básico (0-100)
                </h3>
                <div className="max-w-md">
                  <RangeSlider
                    value={basicRange}
                    onChange={setBasicRange}
                  />
                  <p className="text-sm mt-2" style={{ color: 'var(--color-muted)' }}>
                    Rango seleccionado: {basicRange[0]} - {basicRange[1]}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-primary)' }}>
                  Rango de Precios ($100-$1000)
                </h3>
                <div className="max-w-md">
                  <RangeSlider
                    min={100}
                    max={1000}
                    value={priceRange}
                    onChange={setPriceRange}
                  />
                  <p className="text-sm mt-2" style={{ color: 'var(--color-muted)' }}>
                    Precio: ${priceRange[0]} - ${priceRange[1]}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-primary)' }}>
                  Porcentaje (0-100%)
                </h3>
                <div className="max-w-md">
                  <RangeSlider
                    min={0}
                    max={100}
                    value={percentageRange}
                    onChange={setPercentageRange}
                  />
                  <p className="text-sm mt-2" style={{ color: 'var(--color-muted)' }}>
                    Porcentaje: {percentageRange[0]}% - {percentageRange[1]}%
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-primary)' }}>
                  Temperatura (0-50°C)
                </h3>
                <div className="max-w-md">
                  <RangeSlider
                    min={0}
                    max={50}
                    value={temperatureRange}
                    onChange={setTemperatureRange}
                  />
                  <p className="text-sm mt-2" style={{ color: 'var(--color-muted)' }}>
                    Temperatura: {temperatureRange[0]}°C - {temperatureRange[1]}°C
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Controlled vs Uncontrolled */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            Controlado vs No Controlado
          </h2>
          <div className="bg-white rounded-lg border border-gray-300 p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-primary)' }}>
                  Controlado (con estado)
                </h3>
                <div className="max-w-md">
                  <RangeSlider
                    value={controlledRange}
                    onChange={setControlledRange}
                  />
                  <p className="text-sm mt-2" style={{ color: 'var(--color-muted)' }}>
                    Valor controlado: [{controlledRange[0]}, {controlledRange[1]}]
                  </p>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => setControlledRange([20, 80])}
                      className="px-3 py-1 bg-primary text-white rounded text-sm"
                    >
                      Reset 20-80
                    </button>
                    <button
                      onClick={() => setControlledRange([0, 50])}
                      className="px-3 py-1 bg-secondary text-white rounded text-sm"
                    >
                      Set 0-50
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-primary)' }}>
                  No Controlado (interno)
                </h3>
                <div className="max-w-md">
                  <RangeSlider
                    min={0}
                    max={200}
                    onChange={handleRangeChange}
                  />
                  <p className="text-sm mt-2" style={{ color: 'var(--color-muted)' }}>
                    Sin estado externo - revisa la consola para ver cambios
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Updates */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            Actualizaciones Dinámicas
          </h2>
          <div className="bg-white rounded-lg border border-gray-300 p-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-primary)' }}>
                  Cambiar Rango Dinámicamente
                </h3>
                <div className="max-w-md">
                  <RangeSlider
                    value={dynamicRange}
                    onChange={setDynamicRange}
                  />
                  <p className="text-sm mt-2" style={{ color: 'var(--color-muted)' }}>
                    Rango actual: {dynamicRange[0]} - {dynamicRange[1]}
                  </p>
                  <div className="flex gap-2 mt-4 flex-wrap">
                    <button
                      onClick={() => setDynamicRange([0, 100])}
                      className="px-3 py-1 bg-primary text-white rounded text-sm"
                    >
                      0-100
                    </button>
                    <button
                      onClick={() => setDynamicRange([25, 75])}
                      className="px-3 py-1 bg-secondary text-white rounded text-sm"
                    >
                      25-75
                    </button>
                    <button
                      onClick={() => setDynamicRange([10, 90])}
                      className="px-3 py-1 bg-accent text-white rounded text-sm"
                    >
                      10-90
                    </button>
                    <button
                      onClick={() => setDynamicRange([40, 60])}
                      className="px-3 py-1 bg-neutral text-white rounded text-sm"
                    >
                      40-60
                    </button>
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
              <li>✓ Slider de rango dual con dos thumbs</li>
              <li>✓ Valores mínimo y máximo configurables</li>
              <li>✓ Soporte para modo controlado y no controlado</li>
              <li>✓ Callback onChange para cambios de valor</li>
              <li>✓ Diseño responsive y accesible</li>
              <li>✓ Estilos CSS variables para temas</li>
              <li>✓ Data attributes para testing</li>
            </ul>
          </div>

          <div className="p-6 rounded-lg" style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-background)' }}>
            <h3 className="font-semibold mb-3">Props Principales</h3>
            <ul className="text-sm space-y-2">
              <li>min: Valor mínimo del rango (default: 0)</li>
              <li>max: Valor máximo del rango (default: 100)</li>
              <li>value: Array [min, max] para control externo</li>
              <li>onChange: Callback con nuevos valores</li>
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
{`import RangeSlider from '@/app/baseComponents/RangeSlider/RangeSlider';

function MyComponent() {
  const [range, setRange] = useState([20, 80]);

  return (
    <RangeSlider
      value={range}
      onChange={setRange}
    />
  );
}`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Importación básica y uso controlado del componente RangeSlider.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Con Rango Personalizado</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`// Rango de precios
<RangeSlider
  min={100}
  max={1000}
  value={priceRange}
  onChange={setPriceRange}
/>

// Rango de porcentajes
<RangeSlider
  min={0}
  max={100}
  value={percentageRange}
  onChange={setPercentageRange}
/>

// Rango de temperatura
<RangeSlider
  min={-10}
  max={50}
  value={temperatureRange}
  onChange={setTemperatureRange}
/>`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Configuración de rangos personalizados para diferentes tipos de datos.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Modo No Controlado</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`function UncontrolledExample() {
  const handleChange = (values) => {
    console.log('Nuevos valores:', values);
    // Procesar los valores aquí
  };

  return (
    <RangeSlider
      min={0}
      max={200}
      onChange={handleChange}
    />
  );
}`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Uso sin estado externo. El componente maneja su propio estado interno.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Filtros y Búsqueda</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`function ProductFilters() {
  const [priceRange, setPriceRange] = useState([100, 500]);
  const [ratingRange, setRatingRange] = useState([3, 5]);

  const applyFilters = () => {
    // Aplicar filtros con los rangos seleccionados
    fetchProducts({
      minPrice: priceRange[0],
      maxPrice: priceRange[1],
      minRating: ratingRange[0],
      maxRating: ratingRange[1]
    });
  };

  return (
    <div>
      <h3>Precio</h3>
      <RangeSlider
        min={0}
        max={1000}
        value={priceRange}
        onChange={setPriceRange}
      />

      <h3>Calificación</h3>
      <RangeSlider
        min={1}
        max={5}
        value={ratingRange}
        onChange={setRatingRange}
      />

      <button onClick={applyFilters}>Aplicar Filtros</button>
    </div>
  );
}`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Ejemplo de uso en filtros de productos con múltiples rangos.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Actualización Dinámica</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`function DynamicRange() {
  const [range, setRange] = useState([25, 75]);

  const presets = [
    { label: 'Todo', value: [0, 100] },
    { label: 'Bajo', value: [0, 33] },
    { label: 'Medio', value: [34, 66] },
    { label: 'Alto', value: [67, 100] }
  ];

  return (
    <div>
      <RangeSlider
        value={range}
        onChange={setRange}
      />

      <div className="flex gap-2 mt-4">
        {presets.map(preset => (
          <button
            key={preset.label}
            onClick={() => setRange(preset.value)}
            className="px-3 py-1 bg-primary text-white rounded"
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Actualización del rango mediante botones de preset o controles externos.
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
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm">RangeSlider Component</h3>
                  <div className="relative w-full h-8">
                    {/* Track */}
                    <div className="absolute w-full h-2 top-1/2 -translate-y-1/2 rounded-lg bg-gray-300" />
                    {/* Filled Range */}
                    <div className="absolute h-2 top-1/2 -translate-y-1/2 bg-gray-500 rounded-lg left-1/4 w-1/2" />
                    {/* Thumbs */}
                    <div className="absolute w-6 h-6 bg-gray-400 rounded-full top-1/2 left-1/4 -translate-y-1/2 border-2 border-white shadow" />
                    <div className="absolute w-6 h-6 bg-gray-400 rounded-full top-1/2 left-3/4 -translate-y-1/2 border-2 border-white shadow" />
                  </div>
                  <div className="flex w-full justify-between">
                    <span className="text-xs text-gray-600">25</span>
                    <span className="text-xs text-gray-600">75</span>
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