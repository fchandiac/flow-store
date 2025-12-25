'use client'
import React, { useState, useEffect, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });

// Import Leaflet CSS in component to ensure it's loaded
import 'leaflet/dist/leaflet.css';

// Custom draggable marker icon - will be created on client side
let customIcon: L.Icon | null = null;
let draggingIcon: L.Icon | null = null;

// Fix for default markers in react-leaflet - Only on client side
if (typeof window !== 'undefined') {
  import('leaflet').then(L => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: '',  // No shadow
    });
    
    // Create custom icon for normal state - NO SHADOW
    customIcon = new L.Icon({
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      shadowUrl: '',  // No shadow
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [0, 0],
    });
    
    // Create larger icon for dragging state - NO SHADOW
    draggingIcon = new L.Icon({
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      shadowUrl: '',  // No shadow
      iconSize: [30, 49],
      iconAnchor: [15, 49],
      popupAnchor: [1, -34],
      shadowSize: [0, 0],
    });
  });
}

type LocationPickerVariant = 'default' | 'flat' | 'borderless';
type LocationPickerRounded = 'none' | 'sm' | 'md' | 'lg' | 'full';
type CursorState = 'default' | 'targeting' | 'grabbing' | 'clicked';
type LocationPickerMode = 'viewer' | 'edit' | 'update';

interface LocationPickerProps {
  onChange?: (coordinates: { lat: number; lng: number } | null) => void;
  initialLat?: number;
  initialLng?: number;
  /** Estilo predefinido: default (borde + rounded), flat (sin borde), borderless (sin borde ni fondo) */
  variant?: LocationPickerVariant;
  /** Control del border-radius: none, sm, md, lg, full */
  rounded?: LocationPickerRounded;
  /** Clases CSS adicionales para el contenedor */
  className?: string;
  /** Permite arrastrar el marcador para reposicionarlo (default: true) */
  draggable?: boolean;
  /** Modo del componente: viewer (solo visualización), edit (definir ubicación), update (editar ubicación existente) */
  mode?: LocationPickerMode;
  /** Zoom inicial del mapa (default: 13) */
  zoom?: number;
  /** Altura del mapa en vh. Si no se especifica, usa aspect-ratio 16:9 */
  height?: number;
  /** Posición externa para modo update (se ignora en otros modos) */
  externalPosition?: { lat: number; lng: number };
}

const roundedClasses: Record<LocationPickerRounded, string> = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-xl',
};

const variantClasses: Record<LocationPickerVariant, string> = {
  default: 'border border-gray-200',
  flat: '',
  borderless: '',
};

// Cursor classes para diferentes estados de interacción
const cursorClasses: Record<CursorState, string> = {
  default: 'cursor-default',
  targeting: 'cursor-crosshair',   // Buscando dónde hacer click
  grabbing: 'cursor-grabbing',     // Arrastrando el mapa
  clicked: 'cursor-crosshair',     // Click realizado
};

/**
 * Componente interno para manejar el marcador arrastrable
 */
const DraggableMarker = ({ 
  position, 
  draggable, 
  onDragEnd,
}: { 
  position: { lat: number; lng: number }; 
  draggable: boolean;
  onDragEnd: (newPos: { lat: number; lng: number }) => void;
}) => {
  const markerRef = useRef<L.Marker | null>(null);

  const eventHandlers = useMemo(() => ({
    dragstart: () => {
      const marker = markerRef.current;
      if (marker && draggingIcon) {
        marker.setIcon(draggingIcon);
      }
    },
    dragend: () => {
      const marker = markerRef.current;
      if (marker) {
        if (customIcon) {
          marker.setIcon(customIcon);
        }
        const latlng = marker.getLatLng();
        onDragEnd({ lat: latlng.lat, lng: latlng.lng });
      }
    },
  }), [onDragEnd]);

  return (
    <Marker
      position={[position.lat, position.lng]}
      draggable={draggable}
      eventHandlers={eventHandlers}
      ref={markerRef}
    />
  );
};

const LocationPicker: React.FC<LocationPickerProps> = ({ 
  onChange, 
  initialLat = 19.4326, 
  initialLng = -99.1332,
  variant = 'default',
  rounded = 'md',
  className = '',
  draggable = true,
  mode = 'viewer',
  zoom = 13,
  height,
  externalPosition,
}) => {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [cursorState, setCursorState] = useState<CursorState>('default');
  const [showClickEffect, setShowClickEffect] = useState(false);
  const [clickPosition, setClickPosition] = useState<{ x: number; y: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Determinar si es modo edición (permite interacción)
  const isEditable = mode === 'edit' || mode === 'update';
  
  // Determinar posición inicial basada en el modo
  useEffect(() => {
    if (mode === 'update' && externalPosition) {
      // Modo update: usar posición externa
      setPosition(externalPosition);
    } else if (mode === 'edit' && !position) {
      // Modo edit: intentar obtener ubicación actual del usuario

      // Verificar que estamos en el cliente
      if (typeof window === 'undefined') {
        return;
      }

      // Pequeño delay para asegurar que el componente esté completamente montado
      const timer = setTimeout(() => {
        getCurrentLocation();
      }, 100);

      return () => clearTimeout(timer);
    } else if (initialLat && initialLng && !position) {
      // Usar coordenadas iniciales si no hay posición
      setPosition({ lat: initialLat, lng: initialLng });
    } else if (!position) {
      // Última opción: usar ubicación por defecto si no hay nada
      const defaultPos = { lat: -33.4489, lng: -70.6693 }; // Santiago, Chile
      setPosition(defaultPos);
      onChange?.(defaultPos);
    }
  }, [mode, externalPosition, initialLat, initialLng, position]);

  // Función para obtener la ubicación actual del usuario
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('La geolocalización no está soportada por este navegador');
      return;
    }

    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newPos = { lat: position.coords.latitude, lng: position.coords.longitude };
        setPosition(newPos);
        onChange?.(newPos);
      },
      (error) => {
        let errorMessage = 'Error al obtener la ubicación';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permiso de ubicación denegado';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Ubicación no disponible';
            break;
          case error.TIMEOUT:
            errorMessage = 'Tiempo de espera agotado';
            break;
        }
        setLocationError(errorMessage);

        // Si falla la geolocalización, usar una ubicación por defecto
        const fallbackPos = { lat: -33.4489, lng: -70.6693 }; // Santiago, Chile
        setPosition(fallbackPos);
        onChange?.(fallbackPos);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutos
      }
    );
  };

  const handleMapClick = (e: L.LeafletMouseEvent) => {
    if (!isEditable) return; // No hacer nada en modo viewer
    
    const newPosition = { lat: e.latlng.lat, lng: e.latlng.lng };
    setPosition(newPosition);
    onChange?.(newPosition);
    
    // Efecto visual de click
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setClickPosition({
        x: e.originalEvent.clientX - rect.left,
        y: e.originalEvent.clientY - rect.top,
      });
      setShowClickEffect(true);
      setTimeout(() => setShowClickEffect(false), 800);
    }
  };

  // Component to handle map events
  const MapEvents = () => {
    const map = (require('react-leaflet') as any).useMapEvents({
      click: (e: L.LeafletMouseEvent) => {
        if (isEditable) handleMapClick(e);
      },
      mousedown: () => isEditable && setCursorState('grabbing'),
      mouseup: () => isEditable && setCursorState('targeting'),
      dragstart: () => isEditable && setCursorState('grabbing'),
      dragend: () => isEditable && setCursorState('targeting'),
      mouseover: () => isEditable && setCursorState('targeting'),
      mouseout: () => setCursorState('default'),
    });
    return null;
  };

  // Component to handle map centering when position changes
  const MapCenterController = () => {
    const map = (require('react-leaflet') as any).useMap();
    
    useEffect(() => {
      if (position && map) {
        // Centrar el mapa en la nueva posición con animación suave
        map.flyTo([position.lat, position.lng], zoom, {
          animate: true,
          duration: 1.5
        });
      }
    }, [position, map]);
    
    return null;
  };

  const containerClasses = [
    'location-container overflow-hidden relative',
    variantClasses[variant],
    roundedClasses[rounded],
    !isEditable ? 'pointer-events-none' : '',
    className,
  ].filter(Boolean).join(' ');

  // Si se pasa height, usar vh; si no, usar altura fija para formularios
  // Usamos zIndex 0 para evitar que el mapa tape elementos del footer
  const containerStyle: React.CSSProperties = height 
    ? { zIndex: 0, height: `${height}vh`, width: '100%' }
    : { zIndex: 0, height: '200px', width: '100%' };

  return (
    <div 
      ref={containerRef}
      className={containerClasses} 
      style={containerStyle}
    >
      {/* Mensaje de error de ubicación */}
      {locationError && (
        <div className="absolute top-2 right-2 z-[1000] max-w-xs">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-red-500 text-lg">error</span>
              <span className="text-red-700 text-sm font-medium">{locationError}</span>
            </div>
          </div>
        </div>
      )}

      {/* Click ripple effect */}
      {isEditable && showClickEffect && clickPosition && (
        <div
          className="absolute pointer-events-none z-[1000]"
          style={{
            left: clickPosition.x - 20,
            top: clickPosition.y - 20,
          }}
        >
          <div className="w-10 h-10 rounded-full border-2 border-primary animate-ping opacity-75" />
          <div 
            className="absolute top-1/2 left-1/2 w-2 h-2 -mt-1 -ml-1 rounded-full bg-primary animate-pulse"
          />
        </div>
      )}
      
      <MapContainer
        center={position ? [position.lat, position.lng] : [initialLat, initialLng]}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        attributionControl={false}
        className={!isEditable ? 'cursor-default' : cursorClasses[cursorState]}
        dragging={isEditable}
        zoomControl={isEditable}
        scrollWheelZoom={isEditable}
        doubleClickZoom={isEditable}
        touchZoom={isEditable}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {isEditable && <MapEvents />}
        <MapCenterController />
        {position && (
          <DraggableMarker 
            position={position}
            draggable={isEditable && draggable}
            onDragEnd={(newPos) => {
              if (isEditable) {
                setPosition(newPos);
                onChange?.(newPos);
              }
            }}
          />
        )}
      </MapContainer>
    </div>
  );
};

export default LocationPicker;