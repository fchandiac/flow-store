'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import DotProgress from '@/app/baseComponents/DotProgress/DotProgress';
import Alert from '@/app/baseComponents/Alert/Alert';
import { Button } from '@/app/baseComponents/Button/Button';
import { useAlert } from '@/app/globalstate/alert/useAlert';

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

        {/* Mode Examples */}
        <div className="bg-white rounded-lg border border-gray-300 p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            Modos de Operación
          </h2>
          
          {/* Viewer Mode */}
          <div className="mb-8">
            <h3 className="text-lg font-medium mb-4">Modo Viewer (Solo Visualización)</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--color-muted)' }}>
              Modo de solo lectura para mostrar ubicaciones sin posibilidad de edición.
            </p>
            <LocationPicker
              mode="viewer"
              initialLat={-33.4489}
              initialLng={-70.6693}
              zoom={12}
            />
          </div>

          {/* Edit Mode */}
          <div className="mb-8">
            <h3 className="text-lg font-medium mb-4">Modo Edit (Edición con Geolocalización Automática)</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--color-muted)' }}>
              Obtiene automáticamente la ubicación actual del usuario al cargar y permite edición manual.
            </p>
            <LocationPicker
              mode="edit"
              onChange={handleLocationChange}
              initialLat={initialLocation.lat}
              initialLng={initialLocation.lng}
              zoom={13}
            />
            {selectedLocation && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
                <h4 className="font-semibold mb-2 text-blue-800">Ubicación Editada:</h4>
                <p className="text-blue-700">Latitud: {selectedLocation.lat.toFixed(6)}</p>
                <p className="text-blue-700">Longitud: {selectedLocation.lng.toFixed(6)}</p>
              </div>
            )}
          </div>

          {/* Update Mode */}
          <div className="mb-8">
            <h3 className="text-lg font-medium mb-4">Modo Update (Actualización desde Props)</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--color-muted)' }}>
              Recibe una ubicación externa por props y permite editarla. Útil para formularios de edición.
            </p>
            <LocationPicker
              mode="update"
              externalPosition={{ lat: -36.1431, lng: -71.8267 }}
              onChange={handleLocationChangeParral}
              zoom={14}
            />
            {selectedLocationParral && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
                <h4 className="font-semibold mb-2 text-green-800">Ubicación Actualizada:</h4>
                <p className="text-green-700">Latitud: {selectedLocationParral.lat.toFixed(6)}</p>
                <p className="text-green-700">Longitud: {selectedLocationParral.lng.toFixed(6)}</p>
              </div>
            )}
          </div>
        </div>


        {/* Usage Examples */}
        <div className="bg-white rounded-lg border border-gray-300 p-8 mb-8">
          <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            Ejemplos de Código
          </h2>

          <div className="space-y-8">
            <div>
              <h3 className="font-semibold mb-3">Modo Viewer (Solo Lectura)</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`import LocationPicker from '@/app/baseComponents/LocationPicker/LocationPicker';

function ViewLocation() {
  return (
    <LocationPicker
      mode="viewer"
      initialLat={-33.4489}
      initialLng={-70.6693}
      zoom={12}
    />
  );
}`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Muestra una ubicación sin posibilidad de edición. Ideal para vistas de detalle.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Modo Edit (Creación con Geolocalización)</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`import { useState } from 'react';
import LocationPicker from '@/app/baseComponents/LocationPicker/LocationPicker';

function CreateLocation() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  return (
    <LocationPicker
      mode="edit"
      onChange={setLocation}
      initialLat={-33.4489}
      initialLng={-70.6693}
      zoom={13}
    />
  );
}`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Crea nuevas ubicaciones obteniendo automáticamente la ubicación actual del usuario.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Modo Update (Edición de Ubicación Existente)</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`import { useState } from 'react';
import LocationPicker from '@/app/baseComponents/LocationPicker/LocationPicker';

function EditLocation({ existingLocation }: { existingLocation: { lat: number; lng: number } }) {
  const [location, setLocation] = useState(existingLocation);

  return (
    <LocationPicker
      mode="update"
      externalPosition={existingLocation}
      onChange={setLocation}
      zoom={14}
    />
  );
}`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Edita una ubicación existente recibida por props. Útil en formularios de edición.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Props Comunes</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`interface LocationPickerProps {
  // Modo de operación
  mode?: 'viewer' | 'edit' | 'update';
  
  // Callbacks
  onChange?: (position: { lat: number; lng: number } | null) => void;
  
  // Posicionamiento
  initialLat?: number;
  initialLng?: number;
  externalPosition?: { lat: number; lng: number };
  
  // Configuración visual
  zoom?: number;
  height?: number; // en vh
  variant?: 'flat' | 'outlined';
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  
  // Comportamiento
  draggable?: boolean;
  
  // Estilos
  className?: string;
}`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Interface completa del componente con todas las props disponibles.
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