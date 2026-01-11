'use client';

import { useState } from 'react';
import LocationPicker from '@/app/baseComponents/LocationPicker/LocationPicker';

/**
 * Showcases - Ejemplos de uso de componentes
 * Ruta: /admin/showcases
 * 
 * Esta página contiene ejemplos interactivos de los componentes base
 * para referencia y pruebas durante el desarrollo.
 */
export default function ShowcasesPage() {
    return (
        <div className="p-6 h-full overflow-auto">
            <h1 className="text-2xl font-bold text-foreground mb-6">
                Showcases - Ejemplos de Componentes
            </h1>
            
            <div className="space-y-8">
                {/* LocationPicker Showcase */}
                <LocationPickerShowcase />
            </div>
        </div>
    );
}

/**
 * Showcase del componente LocationPicker
 */
function LocationPickerShowcase() {
    const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);

    return (
        <section className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-foreground">LocationPicker</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Componente para seleccionar ubicaciones en un mapa interactivo usando Leaflet.
                </p>
            </div>

            {/* Content */}
            <div className="p-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Mapa */}
                    <div>
                        <h3 className="text-sm font-medium text-foreground mb-2">Mapa Interactivo</h3>
                        <p className="text-xs text-muted-foreground mb-3">
                            Haz clic en el mapa para seleccionar una ubicación.
                        </p>
                        <div className="h-[400px] rounded-lg overflow-hidden border border-gray-200">
                            <LocationPicker
                                onChange={setSelectedLocation}
                                initialLat={-33.4489}
                                initialLng={-70.6693}
                            />
                        </div>
                    </div>

                    {/* Info y código */}
                    <div className="space-y-4">
                        {/* Ubicación seleccionada */}
                        <div>
                            <h3 className="text-sm font-medium text-foreground mb-2">Ubicación Seleccionada</h3>
                            {selectedLocation ? (
                                <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Latitud:</span>
                                        <span className="text-foreground">{selectedLocation.lat.toFixed(6)}</span>
                                    </div>
                                    <div className="flex justify-between mt-1">
                                        <span className="text-muted-foreground">Longitud:</span>
                                        <span className="text-foreground">{selectedLocation.lng.toFixed(6)}</span>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground italic">
                                    Ninguna ubicación seleccionada. Haz clic en el mapa.
                                </p>
                            )}
                        </div>

                        {/* Props */}
                        <div>
                            <h3 className="text-sm font-medium text-foreground mb-2">Props</h3>
                            <div className="bg-gray-50 rounded-lg overflow-hidden">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-gray-200">
                                            <th className="text-left p-2 font-medium">Prop</th>
                                            <th className="text-left p-2 font-medium">Tipo</th>
                                            <th className="text-left p-2 font-medium">Descripción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="border-b border-gray-100">
                                            <td className="p-2 font-mono text-primary">onChange</td>
                                            <td className="p-2 text-muted-foreground">{`(coords) => void`}</td>
                                            <td className="p-2">Callback cuando se selecciona ubicación</td>
                                        </tr>
                                        <tr className="border-b border-gray-100">
                                            <td className="p-2 font-mono text-primary">initialLat</td>
                                            <td className="p-2 text-muted-foreground">number</td>
                                            <td className="p-2">Latitud inicial del mapa (default: 19.4326)</td>
                                        </tr>
                                        <tr className="border-b border-gray-100">
                                            <td className="p-2 font-mono text-primary">initialLng</td>
                                            <td className="p-2 text-muted-foreground">number</td>
                                            <td className="p-2">Longitud inicial del mapa (default: -99.1332)</td>
                                        </tr>
                                        <tr className="border-b border-gray-100">
                                            <td className="p-2 font-mono text-primary">variant</td>
                                            <td className="p-2 text-muted-foreground">'default' | 'flat' | 'borderless'</td>
                                            <td className="p-2">Estilo del contenedor (default: 'default')</td>
                                        </tr>
                                        <tr className="border-b border-gray-100">
                                            <td className="p-2 font-mono text-primary">rounded</td>
                                            <td className="p-2 text-muted-foreground">'none' | 'sm' | 'md' | 'lg' | 'full'</td>
                                            <td className="p-2">Border radius (default: 'md')</td>
                                        </tr>
                                        <tr className="border-b border-gray-100">
                                            <td className="p-2 font-mono text-primary">draggable</td>
                                            <td className="p-2 text-muted-foreground">boolean</td>
                                            <td className="p-2">Permite arrastrar el marcador (default: true)</td>
                                        </tr>
                                        <tr>
                                            <td className="p-2 font-mono text-primary">className</td>
                                            <td className="p-2 text-muted-foreground">string</td>
                                            <td className="p-2">Clases CSS adicionales</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Ejemplo de código */}
                        <div>
                            <h3 className="text-sm font-medium text-foreground mb-2">Ejemplo de Uso</h3>
                            <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs overflow-x-auto">
{`import LocationPicker from '@/app/baseComponents/LocationPicker/LocationPicker';

function MyComponent() {
  const [location, setLocation] = useState(null);

  return (
    <LocationPicker
      onChange={setLocation}
      initialLat={-33.4489}
      initialLng={-70.6693}
      variant="flat"      // sin borde
      rounded="none"      // sin esquinas redondeadas
    />
  );
}`}
                            </pre>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
