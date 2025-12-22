'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import DotProgress from '@/app/baseComponents/DotProgress/DotProgress';
import Alert from '@/app/baseComponents/Alert/Alert';
import { Button } from '@/app/baseComponents/Button/Button';
import { useAlert } from '../../state/hooks/useAlert';

// Wrapper para evitar hydration mismatch
function ElectronDetector({ children }: { children: (isElectron: boolean) => React.ReactNode }) {
  const [isElectron, setIsElectron] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Solo ejecutar en el cliente
    const electronDetected = typeof window !== 'undefined' && !!(window as any).electronAPI;
    setIsElectron(electronDetected);
    setIsHydrated(true);
    console.log('🌐 Entorno detectado:', electronDetected ? 'Electron' : 'Navegador web');
  }, []);

  // Durante SSR y el primer render, mostrar estado neutral
  if (!isHydrated) {
    return <>{children(false)}</>;
  }

  return <>{children(isElectron)}</>;
}

// Dynamically import LocationPicker to avoid SSR issues
const LocationPicker = dynamic(() => import('@/app/baseComponents/LocationPicker/LocationPicker'), { ssr: false });

export default function LocationPickerShowcase() {
  return (
    <ElectronDetector>
      {(isElectron) => <LocationPickerShowcaseInner isElectron={isElectron} />}
    </ElectronDetector>
  );
}

function LocationPickerShowcaseInner({ isElectron }: { isElectron: boolean }) {
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedLocationParral, setSelectedLocationParral] = useState<{ lat: number; lng: number } | null>(null);
  const [initialLocation, setInitialLocation] = useState<{ lat: number; lng: number }>({ lat: -33.4489, lng: -70.6693 });
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [showPermissionAlert, setShowPermissionAlert] = useState(false);
  const { showAlert } = useAlert();

  useEffect(() => {
    // Verificar si ya tenemos permisos
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'granted') {
          getCurrentPosition();
        } else if (result.state === 'denied') {
          setShowPermissionAlert(true);
          setIsLoadingLocation(false);
        } else {
          getCurrentPosition();
        }
      }).catch(() => {
        getCurrentPosition();
      });
    } else {
      getCurrentPosition();
    }

    function getCurrentPosition() {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setInitialLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
            setIsLoadingLocation(false);
          },
          (error) => {
            // Verificación defensiva del objeto error
            if (!error) {
              showAlert({
                message: 'Error desconocido obteniendo ubicación. Se usará Santiago de Chile como ubicación por defecto.',
                type: 'warning'
              });
              setIsLoadingLocation(false);
              return;
            }
            
            // Manejo específico de errores con validación
            const errorCode = error.code;
            
            // Verificar permisos denegados (código 1 o comparación con constante)
            if (errorCode === 1 || errorCode === error.PERMISSION_DENIED) {
              setShowPermissionAlert(true);
            } else {
              showAlert({
                message: 'No se pudo obtener tu ubicación actual. Se usará Santiago de Chile como ubicación por defecto.',
                type: 'warning'
              });
            }
            
            // Usar ubicación por defecto
            setIsLoadingLocation(false);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutos
          }
        );
      } else {
        showAlert({
          message: 'Tu navegador no soporta geolocalización. Se usará Santiago de Chile como ubicación por defecto.',
          type: 'info'
        });
        setIsLoadingLocation(false);
      }
    }
  }, [showAlert]);

  const handleLocationChange = (coordinates: { lat: number; lng: number } | null) => {
    setSelectedLocation(coordinates);
  };

  const handleLocationChangeParral = (coordinates: { lat: number; lng: number } | null) => {
    setSelectedLocationParral(coordinates);
  };

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--color-primary)' }}>
            LocationPicker Component
          </h1>
          <p style={{ color: 'var(--color-muted)' }}>
            Componente interactivo para seleccionar ubicaciones en un mapa usando Leaflet
          </p>
        </div>

        {/* Permission Alert */}
        {showPermissionAlert && (
          <Alert variant="warning" className="mb-6">
            <div>
              <strong>Permiso de Ubicación Denegado</strong>
              <p style={{ margin: '8px 0' }}>
                El navegador ha denegado permanentemente el acceso a tu ubicación. Para obtener tu ubicación actual, necesitas habilitar los permisos de localización.
              </p>
              <div style={{ marginBottom: '12px' }}>
                <strong>Instrucciones:</strong><br/>
                <strong>macOS:</strong> Preferencias del Sistema → Seguridad y Privacidad → Privacidad → Localización<br/>
                <strong>Windows:</strong> Configuración → Privacidad → Ubicación<br/>
                <strong>Chrome:</strong> Haz clic en el candado (🔒) en la barra de direcciones → Configuración del sitio → Ubicación
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    const electronAPI = window.electronAPI as any;
                    if (electronAPI?.openLocationSettings) {
                      electronAPI.openLocationSettings();
                    } else {
                      // Fallback: intentar abrir configuración general
                      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
                      if (isMac) {
                        window.open('x-apple.systempreferences:com.apple.preference.security?Privacy_LocationServices', '_blank');
                      } else {
                        window.open('ms-settings:privacy-location', '_blank');
                      }
                    }
                  }}
                >
                  Abrir Configuración del Sistema
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => {
                    // Resetear estado y volver a intentar
                    setShowPermissionAlert(false);
                    setIsLoadingLocation(true);
                    // Recargar la página para forzar nuevo prompt
                    window.location.reload();
                  }}
                >
                  Probar de Nuevo
                </Button>
              </div>
            </div>
          </Alert>
        )}

        {/* Basic Usage */}
        <div className="bg-white rounded-lg border border-gray-300 p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            Uso Básico
          </h2>
          <div className="space-y-4">
            {isLoadingLocation ? (
              <div className="w-full h-96 border border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                <DotProgress />
              </div>
            ) : (
              <LocationPicker
                onChange={handleLocationChange}
                initialLat={initialLocation.lat}
                initialLng={initialLocation.lng}
              />
            )}
            {selectedLocation && (
              <div className="mt-4 p-4 bg-gray-100 rounded">
                <h3 className="font-semibold mb-2">Ubicación Seleccionada:</h3>
                <p>Latitud: {selectedLocation.lat.toFixed(6)}</p>
                <p>Longitud: {selectedLocation.lng.toFixed(6)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Preloaded Location Example */}
        <div className="bg-white rounded-lg border border-gray-300 p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            Con Ubicación Precargada (Parral, Maule)
          </h2>
          <div className="space-y-4">
            <LocationPicker
              onChange={handleLocationChangeParral}
              initialLat={-36.1431}
              initialLng={-71.8267}
            />
            {selectedLocationParral && (
              <div className="mt-4 p-4 bg-gray-100 rounded">
                <h3 className="font-semibold mb-2">Ubicación Seleccionada:</h3>
                <p>Latitud: {selectedLocationParral.lat.toFixed(6)}</p>
                <p>Longitud: {selectedLocationParral.lng.toFixed(6)}</p>
              </div>
            )}
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
              Este mapa se inicializa automáticamente centrado en Parral, Región del Maule, Chile.
            </p>
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
import LocationPicker from '@/app/baseComponents/LocationPicker/LocationPicker';

function MyComponent() {
  const [location, setLocation] = useState(null);

  return (
    <LocationPicker
      onChange={setLocation}
    />
  );
}`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Componente básico que permite seleccionar una ubicación haciendo clic en el mapa.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Con Ubicación Actual</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`import { useState, useEffect } from 'react';
import LocationPicker from '@/app/baseComponents/LocationPicker/LocationPicker';

function MyComponent() {
  const [currentLocation, setCurrentLocation] = useState({ lat: -33.4489, lng: -70.6693 });

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => console.warn('Geolocalización no disponible:', error)
      );
    }
  }, []);

  return (
    <LocationPicker
      onChange={(coords) => console.log(coords)}
      initialLat={currentLocation.lat}
      initialLng={currentLocation.lng}
    />
  );
}`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Obtiene automáticamente la ubicación actual del usuario usando la Geolocation API nativa del navegador.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Con Ubicación Inicial Personalizada</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`import LocationPicker from '@/app/baseComponents/LocationPicker/LocationPicker';

function MyComponent() {
  return (
    <LocationPicker
      onChange={(coords) => console.log(coords)}
      initialLat={-33.4489}
      initialLng={-70.6693}
    />
  );
}`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Inicializa el mapa centrado en coordenadas específicas (Santiago de Chile en este ejemplo).
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Con Ubicación Precargada (Parral, Maule)</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`import LocationPicker from '@/app/baseComponents/LocationPicker/LocationPicker';

function MyComponent() {
  return (
    <LocationPicker
      onChange={(coords) => console.log(coords)}
      initialLat={-36.1431}
      initialLng={-71.8267}
    />
  );
}`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Inicializa el mapa centrado en Parral, Región del Maule, Chile. Útil para aplicaciones que necesitan ubicaciones específicas predefinidas.
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
                {/* Map wireframe */}
                <div className="relative border border-gray-400 rounded-lg bg-gray-100 h-64">
                  {/* Simulated map tiles */}
                  <div className="absolute inset-0 grid grid-cols-4 grid-rows-4">
                    {Array.from({ length: 16 }).map((_, i) => (
                      <div key={i} className="border border-gray-300 bg-gray-200"></div>
                    ))}
                  </div>
                  {/* Simulated marker */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-lg"></div>
                    <div className="w-1 h-4 bg-gray-600 mx-auto"></div>
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