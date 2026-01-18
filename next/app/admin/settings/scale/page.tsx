import DeviceDetectionPanel from './ui/DeviceDetectionPanel';
import TestConnectionPanel from './ui/TestConnectionPanel';

export const dynamic = 'force-dynamic';

export default function ScalePage() {
    return (
        <div className="p-6 space-y-6">
            <div className="space-y-2">
                <h1 className="text-2xl font-bold">Configuración de Balanza</h1>
                <p className="text-sm text-muted-foreground">
                    Conecta y prueba la balanza USB antes de habilitarla en el punto de venta.
                </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                <DeviceDetectionPanel />
                <TestConnectionPanel />
            </div>
        </div>
    );
}
