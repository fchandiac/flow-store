'use client'
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });

// Import Leaflet CSS in component to ensure it's loaded
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet - Only on client side
if (typeof window !== 'undefined') {
  import('leaflet').then(L => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
  });
}

interface LocationPickerProps {
  onChange?: (coordinates: { lat: number; lng: number } | null) => void;
  initialLat?: number;
  initialLng?: number;
}

const LocationPicker: React.FC<LocationPickerProps> = ({ onChange, initialLat = 19.4326, initialLng = -99.1332 }) => {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  );

  useEffect(() => {
    if (initialLat && initialLng && !position) {
      setPosition({ lat: initialLat, lng: initialLng });
    }
  }, [initialLat, initialLng, position]);

  const handleMapClick = (e: L.LeafletMouseEvent) => {
    const newPosition = { lat: e.latlng.lat, lng: e.latlng.lng };
    setPosition(newPosition);
    onChange?.(newPosition);
  };

  // Component to handle map events
  const MapEvents = () => {
    const map = (require('react-leaflet') as any).useMapEvents({
      click: handleMapClick,
    });
    return null;
  };

  return (
    <div className="location-container" style={{ zIndex: 1 }}>
      <MapContainer
        center={[initialLat, initialLng]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapEvents />
        {position && (
          <Marker position={[position.lat, position.lng]} />
        )}
      </MapContainer>
    </div>
  );
};

export default LocationPicker;