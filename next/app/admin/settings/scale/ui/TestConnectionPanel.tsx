'use client';

import { useState } from 'react';

interface TestResult {
    connected: boolean;
    message: string;
    device?: {
        manufacturer: string;
        productId: string;
        vendorId: string;
        serialNumber: string;
        maxSpeed: string;
        requiredCurrentmA: number;
    };
    timestamp?: string;
    rawFrame?: string;
    numericValue?: number | null;
    unit?: string | null;
    portPath?: string;
    details?: string;
    commandSent?: string | null;
}

const initialResult: TestResult = {
    connected: false,
    message: 'Aún no se realiza una prueba de conexión.',
    portPath: undefined,
};

export default function TestConnectionPanel() {
    const [result, setResult] = useState<TestResult>(initialResult);
    const [isTesting, setIsTesting] = useState(false);

    const handleTestConnection = async () => {
        setIsTesting(true);
        try {
            const response = await fetch('/api/scales/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const payload = (await response.json()) as TestResult;
            setResult(payload);
            if (!response.ok) {
                return;
            }
        } catch (error) {
            const message =
                error instanceof Error ? error.message : 'La prueba falló por un error desconocido.';
            setResult((prev) => ({
                connected: false,
                message,
                details: message,
                portPath: prev.portPath,
            }));
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <h2 className="text-lg font-semibold">Prueba de conexión</h2>
            <p className="mt-2 text-sm text-muted-foreground">
                Ejecuta una prueba rápida para confirmar la comunicación con el conversor USB-Serial.
            </p>
            <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="mt-4 inline-flex items-center justify-center rounded-md border border-primary bg-transparent px-4 py-2 text-sm font-medium text-primary disabled:opacity-60"
            >
                {isTesting ? 'Probando…' : 'Probar conexión'}
            </button>

            <div className="mt-4 rounded-md border border-dashed border-muted-foreground/40 p-4 text-sm">
                <p className="font-medium">Estado: {result.connected ? 'Conectado' : 'No conectado'}</p>
                <p className="mt-1 text-muted-foreground">{result.message}</p>
                {result.portPath ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                        Puerto: <span className="font-mono">{result.portPath}</span>
                    </p>
                ) : null}
                {result.commandSent ? (
                    <p className="text-xs text-muted-foreground">
                        Comando enviado: <span className="font-mono">{JSON.stringify(result.commandSent)}</span>
                    </p>
                ) : null}
                {result.rawFrame ? (
                    <div className="mt-3 rounded-lg border border-border bg-background p-3">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                            Lectura cruda
                        </p>
                        <p className="mt-1 font-mono text-lg text-foreground whitespace-pre-wrap break-all">{result.rawFrame}</p>
                        {typeof result.numericValue === 'number' ? (
                            <p className="mt-2 text-sm text-foreground">
                                Peso interpretado: <span className="font-semibold">{result.numericValue}</span>
                                {result.unit ? <span className="ml-1 font-semibold">{result.unit}</span> : null}
                            </p>
                        ) : null}
                    </div>
                ) : null}
                {!result.connected && result.details ? (
                    <p className="mt-3 text-xs text-red-300">Detalle: {result.details}</p>
                ) : null}
                {result.device ? (
                    <dl className="mt-3 grid gap-2 text-xs">
                        <div className="flex items-center justify-between">
                            <dt className="text-muted-foreground">Fabricante</dt>
                            <dd className="font-medium">{result.device.manufacturer}</dd>
                        </div>
                        <div className="flex items-center justify-between">
                            <dt className="text-muted-foreground">Product ID</dt>
                            <dd className="font-mono">{result.device.productId}</dd>
                        </div>
                        <div className="flex items-center justify-between">
                            <dt className="text-muted-foreground">Vendor ID</dt>
                            <dd className="font-mono">{result.device.vendorId}</dd>
                        </div>
                        <div className="flex items-center justify-between">
                            <dt className="text-muted-foreground">Serial</dt>
                            <dd className="font-mono">{result.device.serialNumber}</dd>
                        </div>
                        <div className="flex items-center justify-between">
                            <dt className="text-muted-foreground">Velocidad</dt>
                            <dd className="font-medium">{result.device.maxSpeed}</dd>
                        </div>
                        <div className="flex items-center justify-between">
                            <dt className="text-muted-foreground">Consumo</dt>
                            <dd className="font-medium">{result.device.requiredCurrentmA} mA</dd>
                        </div>
                    </dl>
                ) : null}
                {result.timestamp ? (
                    <p className="mt-3 text-[11px] text-muted-foreground">
                        Última prueba: {new Date(result.timestamp).toLocaleString()}
                    </p>
                ) : null}
            </div>
        </section>
    );
}
