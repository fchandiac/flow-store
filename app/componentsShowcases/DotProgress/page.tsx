'use client';

import React, { useState, useEffect } from 'react';
import DotProgress from '@/app/baseComponents/DotProgress/DotProgress';

export default function DotProgressShowcase() {
  const [manualStep, setManualStep] = useState(0);
  const [customSize, setCustomSize] = useState(16);
  const [customGap, setCustomGap] = useState(8);
  const [customInterval, setCustomInterval] = useState(350);
  const [totalSteps, setTotalSteps] = useState(5);
  const [isPlaying, setIsPlaying] = useState(true);

  // Simular progreso automático para el ejemplo de carga
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    if (loadingProgress < 100) {
      const timer = setTimeout(() => {
        setLoadingProgress(prev => Math.min(prev + 10, 100));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loadingProgress]);

  const resetLoading = () => {
    setLoadingProgress(0);
  };

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--color-primary)' }}>
            DotProgress Component
          </h1>
          <p style={{ color: 'var(--color-muted)' }}>
            Indicador de progreso animado con puntos (dots) altamente personalizable
          </p>
        </div>

        {/* Basic Animation */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            Animación Básica
          </h2>
          <div className="bg-white rounded-lg border border-gray-300 p-8">
            <div className="space-y-6">
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Animación automática que recorre todos los puntos con efecto de pulso.
              </p>

              <div className="flex justify-center py-8">
                <DotProgress />
              </div>

              <div className="text-center">
                <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                  Animación continua con 5 puntos por defecto
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Manual Control */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            Control Manual
          </h2>
          <div className="bg-white rounded-lg border border-gray-300 p-8">
            <div className="space-y-6">
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Controla manualmente qué punto está activo usando el prop <code>activeStep</code>.
              </p>

              <div className="flex justify-center py-8">
                <DotProgress activeStep={manualStep} />
              </div>

              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setManualStep(prev => Math.max(0, prev - 1))}
                  className="px-4 py-2 rounded bg-gray-500 text-white hover:bg-gray-600 transition-colors"
                  disabled={manualStep === 0}
                >
                  Anterior
                </button>

                <span className="flex items-center px-4 py-2 bg-gray-100 rounded">
                  Paso: {manualStep + 1}
                </span>

                <button
                  onClick={() => setManualStep(prev => Math.min(4, prev + 1))}
                  className="px-4 py-2 rounded bg-gray-500 text-white hover:bg-gray-600 transition-colors"
                  disabled={manualStep === 4}
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Loading Simulation */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            Simulación de Carga
          </h2>
          <div className="bg-white rounded-lg border border-gray-300 p-8">
            <div className="space-y-6">
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Ejemplo práctico: indicador de progreso durante una carga.
              </p>

              <div className="space-y-4">
                <div className="flex justify-center py-4">
                  <DotProgress
                    activeStep={Math.floor((loadingProgress / 100) * 4)}
                    totalSteps={5}
                  />
                </div>

                <div className="text-center space-y-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${loadingProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm font-medium">{loadingProgress}% completado</p>
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={resetLoading}
                    className="px-6 py-2 rounded bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                  >
                    Reiniciar Carga
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Size Variations */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            Variaciones de Tamaño
          </h2>
          <div className="bg-white rounded-lg border border-gray-300 p-8">
            <div className="space-y-6">
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Diferentes tamaños de puntos usando el prop <code>size</code>.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center space-y-4">
                  <h3 className="font-semibold">Pequeño (8px)</h3>
                  <DotProgress size={8} />
                </div>

                <div className="text-center space-y-4">
                  <h3 className="font-semibold">Mediano (16px)</h3>
                  <DotProgress size={16} />
                </div>

                <div className="text-center space-y-4">
                  <h3 className="font-semibold">Grande (24px)</h3>
                  <DotProgress size={24} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Custom Configuration */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            Configuración Personalizada
          </h2>
          <div className="bg-white rounded-lg border border-gray-300 p-8">
            <div className="space-y-6">
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Personaliza todos los aspectos del componente con controles interactivos.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Controls */}
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Tamaño de puntos: {customSize}px
                    </label>
                    <input
                      type="range"
                      min="8"
                      max="32"
                      value={customSize}
                      onChange={(e) => setCustomSize(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Espaciado: {customGap}px
                    </label>
                    <input
                      type="range"
                      min="4"
                      max="20"
                      value={customGap}
                      onChange={(e) => setCustomGap(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Intervalo: {customInterval}ms
                    </label>
                    <input
                      type="range"
                      min="200"
                      max="1000"
                      step="50"
                      value={customInterval}
                      onChange={(e) => setCustomInterval(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Número de pasos: {totalSteps}
                    </label>
                    <input
                      type="range"
                      min="3"
                      max="8"
                      value={totalSteps}
                      onChange={(e) => setTotalSteps(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="animation-toggle"
                      checked={isPlaying}
                      onChange={(e) => setIsPlaying(e.target.checked)}
                    />
                    <label htmlFor="animation-toggle" className="text-sm">
                      Animación activa
                    </label>
                  </div>
                </div>

                {/* Preview */}
                <div className="flex flex-col justify-center items-center space-y-4">
                  <h3 className="font-semibold">Vista Previa</h3>
                  <DotProgress
                    size={customSize}
                    gap={customGap}
                    interval={customInterval}
                    totalSteps={totalSteps}
                    activeStep={isPlaying ? undefined : 0}
                  />
                  <div className="text-center text-sm" style={{ color: 'var(--color-muted)' }}>
                    {isPlaying ? 'Animación activa' : 'Animación pausada'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Color Variations */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            Variaciones de Color
          </h2>
          <div className="bg-white rounded-lg border border-gray-300 p-8">
            <div className="space-y-6">
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Diferentes combinaciones de colores usando <code>colorPrimary</code> y <code>colorNeutral</code>.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="text-center space-y-4">
                  <h3 className="font-semibold">Azul/Rojo</h3>
                  <DotProgress colorPrimary="#3b82f6" colorNeutral="#ef4444" />
                </div>

                <div className="text-center space-y-4">
                  <h3 className="font-semibold">Verde/Gris</h3>
                  <DotProgress colorPrimary="#10b981" colorNeutral="#6b7280" />
                </div>

                <div className="text-center space-y-4">
                  <h3 className="font-semibold">Púrpura/Amarillo</h3>
                  <DotProgress colorPrimary="#8b5cf6" colorNeutral="#eab308" />
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
              <li>✓ Animación automática con pulso</li>
              <li>✓ Control manual de paso activo</li>
              <li>✓ Tamaño y espaciado personalizables</li>
              <li>✓ Colores completamente configurables</li>
              <li>✓ Número de pasos ajustable</li>
              <li>✓ Intervalo de animación configurable</li>
            </ul>
          </div>

          <div className="p-6 rounded-lg" style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-background)' }}>
            <h3 className="font-semibold mb-3">Casos de Uso</h3>
            <ul className="text-sm space-y-2">
              <li>✓ Indicadores de carga</li>
              <li>✓ Pasos de formularios</li>
              <li>✓ Estados de procesamiento</li>
              <li>✓ Navegación por secciones</li>
              <li>✓ Progreso de tareas</li>
              <li>✓ Estados de conexión</li>
            </ul>
          </div>
        </div>

        {/* Usage Example */}
        <div className="bg-white rounded-lg border border-gray-300 p-8 mb-8">
          <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            Ejemplos de Uso
          </h2>

          <div className="space-y-8">
            <div>
              <h3 className="font-semibold mb-3">Animación Automática</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`<DotProgress />`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Animación automática con configuración por defecto.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Control Manual</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`<DotProgress activeStep={currentStep} totalSteps={4} />`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Control manual del paso activo, sin animación automática.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Configuración Completa</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`<DotProgress
  size={20}
  gap={12}
  colorPrimary="#10b981"
  colorNeutral="#d1d5db"
  interval={500}
  totalSteps={6}
/>`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Configuración completa con todas las opciones personalizadas.
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
                {/* DotProgress wireframe */}
                <div className="flex justify-center items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                  <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                  <div className="w-3 h-3 rounded-full bg-gray-200"></div>
                  <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                  <div className="w-3 h-3 rounded-full bg-gray-200"></div>
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