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
                <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
                    <h2 className="text-lg font-semibold">Dispositivo detectado</h2>
                    <dl className="mt-4 space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                            <dt className="text-muted-foreground">Fabricante</dt>
                            <dd className="font-medium">FTDI</dd>
                        </div>
                        <div className="flex items-center justify-between">
                            <dt className="text-muted-foreground">Product ID</dt>
                            <dd className="font-mono text-xs">0x6001</dd>
                        </div>
                        <div className="flex items-center justify-between">
                            <dt className="text-muted-foreground">Vendor ID</dt>
                            <dd className="font-mono text-xs">0x0403</dd>
                        </div>
                        <div className="flex items-center justify-between">
                            <dt className="text-muted-foreground">Serial</dt>
                            <dd className="font-mono text-xs">FTB6SPL3</dd>
                        </div>
                        <div className="flex items-center justify-between">
                            <dt className="text-muted-foreground">Velocidad</dt>
                            <dd className="font-medium">Hasta 12 Mb/s</dd>
                        </div>
                    </dl>
                    <p className="mt-4 text-xs text-muted-foreground">
                        Usa este panel para verificar disponibilidad del convertidor USB-Serial antes de configurar reglas de peso.
                    </p>
                </section>
                <TestConnectionPanel />
            </div>
        </div>
    );
}
