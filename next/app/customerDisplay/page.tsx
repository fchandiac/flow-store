'use client';

import { useEffect, useMemo, useState } from 'react';

interface DisplayCartItem {
    variantId: string;
    displayName: string;
    sku: string;
    quantity: number;
    grossPrice: number;
    netPrice: number;
    applyTaxes: boolean;
    attributeValues?: Record<string, string> | null;
}

interface DisplayTotals {
    subtotal: number;
    total: number;
    taxAmount: number;
    hasTaxesApplied: boolean;
}

interface BroadcastSnapshot {
    cart: DisplayCartItem[];
    totals: DisplayTotals;
    branchName: string | null;
    storageName: string | null;
    selectedCustomer: {
        displayName: string;
        documentNumber?: string | null;
    } | null;
    timestamp: number;
}

type BroadcastMessage =
    | { type: 'STATE_UPDATE'; source: 'pos-main'; payload: BroadcastSnapshot }
    | { type: 'POS_SHUTDOWN'; source: 'pos-main' }
    | { type: 'REQUEST_STATE'; source?: 'pos-display' | 'pos-main' };

const POS_BROADCAST_CHANNEL = 'flowstore-pos-cart-channel';

const currencyFormatter = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

const roundToPeso = (value: number): number => {
    if (!Number.isFinite(value)) {
        return 0;
    }
    return Math.round(value);
};

const roundToNearestTen = (value: number): number => {
    const pesos = roundToPeso(value);
    return Math.round(pesos / 10) * 10;
};

const formatLineCurrency = (value: number) => currencyFormatter.format(Math.max(roundToPeso(value), 0));

const formatSummaryCurrency = (value: number) => currencyFormatter.format(Math.max(roundToNearestTen(value), 0));

function buildAttributes(item: DisplayCartItem): string | null {
    if (!item.attributeValues) {
        return null;
    }
    const values = Object.values(item.attributeValues).filter((entry) => entry && entry.trim().length > 0);
    return values.length > 0 ? values.join(' · ') : null;
}

export default function CustomerDisplayPage() {
    const [snapshot, setSnapshot] = useState<BroadcastSnapshot | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<number | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
            return undefined;
        }

        const channel = new BroadcastChannel(POS_BROADCAST_CHANNEL);

        const requestState = () => {
            try {
                channel.postMessage({ type: 'REQUEST_STATE', source: 'pos-display' });
            } catch (error) {
                console.warn('[CustomerDisplay] No fue posible solicitar estado POS:', error);
            }
        };

        const handleMessage = (event: MessageEvent<BroadcastMessage>) => {
            const data = event.data;
            if (!data || typeof data !== 'object') {
                return;
            }

            if (data.type === 'STATE_UPDATE') {
                setSnapshot(data.payload);
                setIsConnected(true);
                setLastUpdate(Date.now());
            }

            if (data.type === 'POS_SHUTDOWN') {
                setIsConnected(false);
            }
        };

        channel.addEventListener('message', handleMessage);
        requestState();

        const visibilityHandler = () => {
            if (!document.hidden) {
                requestState();
            }
        };

        document.addEventListener('visibilitychange', visibilityHandler);

        const pollHandle = window.setInterval(() => {
            requestState();
        }, 15000);

        return () => {
            document.removeEventListener('visibilitychange', visibilityHandler);
            window.clearInterval(pollHandle);
            channel.removeEventListener('message', handleMessage);
            channel.close();
        };
    }, []);

    const cartLines = snapshot?.cart ?? [];
    const totals = snapshot?.totals ?? { subtotal: 0, total: 0, taxAmount: 0, hasTaxesApplied: false };
    const hasItems = cartLines.length > 0;

    const lastUpdatedLabel = useMemo(() => {
        if (!lastUpdate) {
            return null;
        }
        const diffSeconds = Math.round((Date.now() - lastUpdate) / 1000);
        if (diffSeconds < 5) {
            return 'Actualizado hace instantes';
        }
        if (diffSeconds < 60) {
            return `Actualizado hace ${diffSeconds} segundos`;
        }
        const minutes = Math.floor(diffSeconds / 60);
        return `Actualizado hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    }, [lastUpdate]);

    return (
        <div className="flex min-h-screen flex-col bg-white text-slate-900">
            <header className="border-b border-border/50 bg-white px-12 py-8">
                <div className="flex flex-wrap items-end justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900">Gracias por tu compra</h1>
                        <p className="mt-2 text-lg text-muted-foreground">
                            Revisa el detalle de tu pedido antes de confirmar.
                        </p>
                    </div>
                    <div className="text-right text-sm uppercase tracking-wide text-muted-foreground">
                        <div>{snapshot?.branchName ?? 'Sucursal no asignada'}</div>
                        <div>{snapshot?.storageName ? `Almacén ${snapshot.storageName}` : 'Sin almacén asociado'}</div>
                        {snapshot?.selectedCustomer && (
                            <div className="mt-1 text-gray-700">
                                Cliente: <span className="font-semibold text-gray-900">{snapshot.selectedCustomer.displayName}</span>
                            </div>
                        )}
                        {lastUpdatedLabel && (
                            <div className="mt-2 text-xs text-muted-foreground/80">{lastUpdatedLabel}</div>
                        )}
                        {!isConnected && (
                            <div className="mt-2 text-xs text-amber-600">
                                Conectando con caja principal…
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="flex flex-1 flex-col gap-8 px-12 pb-12">
                <section className="flex-1 overflow-hidden rounded-3xl border border-border/60 bg-white shadow-lg">
                    <div className="grid grid-cols-12 border-b border-border/40 bg-gray-50 px-10 py-5 text-lg font-semibold uppercase tracking-widest text-muted-foreground">
                        <span className="col-span-7">Producto</span>
                        <span className="col-span-3 text-center">Cantidad</span>
                        <span className="col-span-2 text-right">Total</span>
                    </div>
                    <div className="h-[58vh] overflow-y-auto px-10 py-6">
                        {hasItems ? (
                            <ul className="flex flex-col gap-4 text-xl">
                                {cartLines.map((item) => {
                                    const lineTotalRaw = item.quantity * (item.applyTaxes ? item.grossPrice : item.netPrice);
                                    const lineTotal = roundToPeso(lineTotalRaw);
                                    const attributes = buildAttributes(item);
                                    return (
                                        <li
                                            key={item.variantId}
                                            className="grid grid-cols-12 items-center rounded-2xl border border-border/50 bg-white px-6 py-4 shadow-sm"
                                        >
                                            <div className="col-span-7 pr-6">
                                                <p className="text-2xl font-semibold text-gray-900">{item.displayName}</p>
                                                <p className="mt-1 text-base text-muted-foreground">SKU {item.sku}</p>
                                                {attributes && (
                                                    <p className="mt-1 text-sm text-muted-foreground/80">{attributes}</p>
                                                )}
                                            </div>
                                            <div className="col-span-3 text-center text-3xl font-bold text-gray-900">
                                                {item.quantity.toFixed(0)}
                                            </div>
                                            <div className="col-span-2 text-right text-3xl font-semibold text-emerald-600">
                                                {formatLineCurrency(lineTotal)}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-gray-50 text-center text-xl text-muted-foreground">
                                <span className="text-6xl">🛒</span>
                                <p className="mt-4 font-semibold">Aún no hay productos en tu pedido.</p>
                                <p className="mt-2 text-base text-muted-foreground/80">
                                    Espera mientras el equipo agrega artículos a tu compra.
                                </p>
                            </div>
                        )}
                    </div>
                </section>

                <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
                    <div className="rounded-3xl border border-border/60 bg-white px-8 py-6 text-xl text-gray-700 shadow-lg">
                        <div className="flex items-center justify-between text-3xl font-bold text-emerald-600">
                            <span>Total a pagar</span>
                            <span>{formatSummaryCurrency(totals.total)}</span>
                        </div>
                    </div>
                    <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-8 py-6 text-center shadow-lg">
                        <h2 className="text-3xl font-semibold text-emerald-700">Estamos preparando tu compra</h2>
                        <p className="mt-3 text-lg text-emerald-700/80">
                            Confirma que todos los productos y montos sean correctos.
                        </p>
                        <p className="mt-6 text-sm uppercase tracking-widest text-emerald-600">
                            La caja principal finalizará tu compra en breve.
                        </p>
                    </div>
                </section>
            </main>
        </div>
    );
}
