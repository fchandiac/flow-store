import dynamic from 'next/dynamic';

const LocationPickerComponent = dynamic(() => import('./LocationPicker'), {
  ssr: false,
  loading: () => (
    <div className="p-4 text-center text-gray-500">
      Cargando mapa...
    </div>
  ),
});

export default LocationPickerComponent;
