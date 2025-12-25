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
}) => {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  );
  const [cursorState, setCursorState] = useState<CursorState>('default');
  const [showClickEffect, setShowClickEffect] = useState(false);
  const [clickPosition, setClickPosition] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialLat && initialLng && !position) {
      setPosition({ lat: initialLat, lng: initialLng });
    }
  }, [initialLat, initialLng, position]);

  const handleMapClick = (e: L.LeafletMouseEvent) => {
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
        handleMapClick(e);
      },
      mousedown: () => setCursorState('grabbing'),
      mouseup: () => setCursorState('targeting'),
      dragstart: () => setCursorState('grabbing'),
      dragend: () => setCursorState('targeting'),
      mouseover: () => setCursorState('targeting'),
      mouseout: () => setCursorState('default'),
    });
    return null;
  };

  const containerClasses = [
    'location-container overflow-hidden relative',
    variantClasses[variant],
    roundedClasses[rounded],
    className,
  ].filter(Boolean).join(' ');

  return (
    <div 
      ref={containerRef}
      className={containerClasses} 
      style={{ zIndex: 1, height: '100%', width: '100%' }}
    >
      {/* Click ripple effect */}
      {showClickEffect && clickPosition && (
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
        center={[initialLat, initialLng]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        attributionControl={false}
        className={cursorClasses[cursorState]}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapEvents />
        {position && (
          <DraggableMarker 
            position={position}
            draggable={draggable}
            onDragEnd={(newPos) => {
              setPosition(newPos);
              onChange?.(newPos);
            }}
          />
        )}
      </MapContainer>
    </div>
  );
};

export default LocationPicker;