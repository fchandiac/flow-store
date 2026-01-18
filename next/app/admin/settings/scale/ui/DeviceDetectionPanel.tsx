'use client';

import { useState } from 'react';

interface DetectionResult {
    connected: boolean;
    message: string;
    matchedDevice?: {
        path: string;
        manufacturer?: string;
        vendorId?: string;
        productId?: string;
        serialNumber?: string;
        locationId?: string;
    };
    scannedPorts?: Array<{
        path: string;
        manufacturer?: string;
        vendorId?: string;
        productId?: string;
    }>;
    details?: string;
}

export default function DeviceDetectionPanel() {
    const [result, setResult] = useState<DetectionResult | null>(null);
    const [isChecking, setIsChecking] = useState(false);

    const handleDetect = async () => {
        setIsChecking(true);
        try {
            const response = await fetch('/api/scales/device');
            const payload = (await response.json()) as DetectionResult;
            setResult(payload);
        } catch (error) {
            const message =
                error instanceof Error ? error.message : 'La detección falló por un error desconocido.';
            setResult({ connected: false, message, details: message });
        } finally {
            setIsChecking(false);
        }
    };

    return (
        <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold">Puertos seriales</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Detecta los puertos disponibles y confirma si el convertidor USB-Serial está visible.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleDetect}
                    disabled={isChecking}
                    className="inline-flex items-center justify-center rounded-md border border-primary bg-transparent px-3 py-2 text-sm font-medium text-primary disabled:opacity-60"
                >
                    {isChecking ? 'Buscando…' : 'Buscar puertos'}
                </button>
            </div>

            {result ? (
                <div className="mt-4 space-y-4">
                    {result.scannedPorts && result.scannedPorts.length ? (
                        <div>
                            <p className="text-sm font-semibold text-foreground">Puertos detectados</p>
                            <ul className="mt-2 space-y-2">
                                {result.scannedPorts.map((port) => (
                                    <li
                                        key={`${port.path}-${port.vendorId ?? 'unknown'}`}
                                        className="rounded-md border border-muted-foreground/40 bg-background p-3 text-xs"
                                    >
                                        <span className="block font-mono text-sm text-foreground">{port.path}</span>
                                        <span className="block text-muted-foreground">
                                            {port.vendorId ?? '—'}/{port.productId ?? '—'}
                                            {port.manufacturer ? ` • ${port.manufacturer}` : ''}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <p className="rounded-md border border-dashed border-muted-foreground/60 p-4 text-sm text-muted-foreground">
                            No se encontraron puertos seriales. Verifica la conexión del convertidor.
                        </p>
                    )}

                    <div className="rounded-md border border-dashed border-muted-foreground/60 p-4 text-sm">
                        <p className="font-semibold text-foreground">
                            {result.connected ? 'Convertidor detectado' : 'Sin coincidencias'}
                        </p>
                        <p className="mt-1 text-muted-foreground">{result.message}</p>
                        {result.details ? (
                            <p className="mt-1 text-xs text-muted-foreground">{result.details}</p>
                        ) : null}

                        {result.matchedDevice ? (
                            <dl className="mt-3 space-y-1 text-xs">
                                <div className="flex items-center justify-between">
                                    <dt className="text-muted-foreground">Puerto</dt>
                                    <dd className="font-mono">{result.matchedDevice.path}</dd>
                                </div>
                                {result.matchedDevice.manufacturer ? (
                                    <div className="flex items-center justify-between">
                                        <dt className="text-muted-foreground">Fabricante</dt>
                                        <dd className="font-medium">{result.matchedDevice.manufacturer}</dd>
                                    </div>
                                ) : null}
                                {result.matchedDevice.vendorId ? (
                                    <div className="flex items-center justify-between">
                                        <dt className="text-muted-foreground">Vendor ID</dt>
                                        <dd className="font-mono">{result.matchedDevice.vendorId}</dd>
                                    </div>
                                ) : null}
                                {result.matchedDevice.productId ? (
                                    <div className="flex items-center justify-between">
                                        <dt className="text-muted-foreground">Product ID</dt>
                                        <dd className="font-mono">{result.matchedDevice.productId}</dd>
                                    </div>
                                ) : null}
                                {result.matchedDevice.serialNumber ? (
                                    <div className="flex items-center justify-between">
                                        <dt className="text-muted-foreground">Serial</dt>
                                        <dd className="font-mono">{result.matchedDevice.serialNumber}</dd>
                                    </div>
                                ) : null}
                                {result.matchedDevice.locationId ? (
                                    <div className="flex items-center justify-between">
                                        <dt className="text-muted-foreground">Location ID</dt>
                                        <dd className="font-mono">{result.matchedDevice.locationId}</dd>
                                    </div>
                                ) : null}
                            </dl>
                        ) : null}
                    </div>
                </div>
            ) : (
                <p className="mt-4 rounded-md border border-dashed border-muted-foreground/60 p-4 text-sm text-muted-foreground">
                    Aún no se realiza una búsqueda. Conecta la balanza y presiona “Buscar puertos”.
                </p>
            )}
        </section>
    );
}
