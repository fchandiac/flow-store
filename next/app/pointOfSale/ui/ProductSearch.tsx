'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { TextField } from '@/baseComponents/TextField/TextField';
import Select from '@/baseComponents/Select/Select';
import Badge from '@/baseComponents/Badge/Badge';
import IconButton from '@/baseComponents/IconButton/IconButton';
import { Button } from '@/baseComponents/Button/Button';
import { usePointOfSale } from '../context/PointOfSaleContext';
import { searchProductsForPOS } from '@/actions/pointOfSale';
import type { POSProductListItem } from '@/actions/pointOfSale';

const currencyFormatter = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

const buildStockBadge = (item: POSProductListItem) => {
    if (!item.trackInventory) {
        return <Badge variant="secondary">Sin control de stock</Badge>;
    }

    if (item.stock <= 0 && !item.allowNegativeStock) {
        return (
            <Badge variant="error" data-test-id="pos-stock-badge">
                Sin stock disponible
            </Badge>
        );
    }

    if (item.stock <= 0) {
        return (
            <Badge variant="warning" data-test-id="pos-stock-badge">
                Stock negativo permitido
            </Badge>
        );
    }

    if (item.stock <= 5) {
        return (
            <Badge variant="warning" data-test-id="pos-stock-badge">
                Stock bajo · {item.stock.toFixed(0)}
            </Badge>
        );
    }

    return (
        <Badge variant="success" data-test-id="pos-stock-badge">
            Stock: {item.stock.toFixed(0)}
        </Badge>
    );
};

export default function ProductSearch() {
    const {
        isLoading,
        isFetching,
        context,
        priceLists,
        selectedPriceListId,
        setSelectedPriceListId,
        addItemToCart,
        storageName,
    } = usePointOfSale();

    const storageId = context?.storage?.id;

    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedTerm, setDebouncedTerm] = useState('');
    const [products, setProducts] = useState<POSProductListItem[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isSearching, startTransition] = useTransition();
    const [requestId, setRequestId] = useState(0);

    const isBusy = isLoading || isFetching || isSearching;

    useEffect(() => {
        const handle = setTimeout(() => {
            setDebouncedTerm(searchTerm.trim());
        }, 250);
        return () => clearTimeout(handle);
    }, [searchTerm]);

    useEffect(() => {
        if (!storageId || !selectedPriceListId) {
            setProducts([]);
            return;
        }

        let cancelled = false;
        setError(null);

        startTransition(async () => {
            try {
                const result = await searchProductsForPOS({
                    search: debouncedTerm,
                    storageId,
                    priceListId: selectedPriceListId,
                    limit: 30,
                });
                if (!cancelled) {
                    setProducts(result);
                }
            } catch (err) {
                console.error('Error buscando productos para POS', err);
                if (!cancelled) {
                    setError('No fue posible obtener productos. Intenta nuevamente.');
                    setProducts([]);
                }
            }
        });

        return () => {
            cancelled = true;
        };
    }, [debouncedTerm, selectedPriceListId, storageId, requestId]);

    const priceListOptions = useMemo(
        () => priceLists.map((list) => ({ id: list.id, label: list.name })),
        [priceLists]
    );

    return (
        <div className="flex h-full flex-col rounded-xl border border-border/60 bg-white shadow-sm">
            <header className="flex flex-col gap-4 border-b border-border/40 px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Buscar productos</h2>
                        <p className="text-sm text-muted-foreground">
                            Selecciona artículos desde {storageName ?? 'el almacén asignado'} y agrégalos al carrito.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Select
                            label="Lista de precios"
                            options={priceListOptions}
                            value={selectedPriceListId ?? null}
                            onChange={(id) => {
                                if (id === null || id === undefined) {
                                    setSelectedPriceListId(null);
                                } else {
                                    setSelectedPriceListId(typeof id === 'string' ? id : String(id));
                                }
                            }}
                            placeholder="Selecciona lista"
                            data-test-id="pos-pricelist-select"
                            disabled={priceListOptions.length === 0 || isLoading}
                        />
                        <IconButton
                            icon="refresh"
                            ariaLabel="Recargar resultados"
                            variant="ghost"
                            size="sm"
                            onClick={() => setRequestId((prev) => prev + 1)}
                            isLoading={isBusy}
                        />
                    </div>
                </div>
                <TextField
                    label="Buscar producto, SKU o código"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Ej: Batería recargable, SKU-123"
                    startIcon="search"
                    data-test-id="pos-search-input"
                    disabled={isLoading}
                />
            </header>

            <section className="flex-1 overflow-auto px-5 py-4">
                {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                {!error && storageId == null && (
                    <div className="rounded-lg border border-dashed border-border/60 bg-gray-50 px-4 py-3 text-sm text-muted-foreground">
                        Aún no se asigna un almacén a este punto de venta. Configura uno para listar productos disponibles.
                    </div>
                )}

                {!error && storageId && products.length === 0 && !isBusy && (
                    <div className="rounded-lg border border-dashed border-border/60 bg-gray-50 px-4 py-3 text-sm text-muted-foreground">
                        No encontramos productos que coincidan con tu búsqueda.
                    </div>
                )}

                <div className="mt-4 grid gap-3">
                    {products.map((item) => {
                        const canAdd = !item.trackInventory || item.allowNegativeStock || item.stock > 0;
                        return (
                            <article
                                key={item.variantId}
                                className="flex flex-col gap-3 rounded-lg border border-border/50 bg-white px-4 py-3 shadow-sm transition hover:border-primary/40"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="flex min-w-[240px] flex-1 flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium uppercase text-primary">{item.productBrand ?? 'Producto'}</span>
                                            <Badge variant="secondary" className="font-mono text-xs">
                                                SKU {item.sku}
                                            </Badge>
                                        </div>
                                        <h3 className="text-base font-semibold text-gray-900">{item.displayName}</h3>
                                        {item.attributeValues && (
                                            <p className="text-xs text-muted-foreground">
                                                {Object.values(item.attributeValues).join(' · ')}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <div className="text-right text-sm text-muted-foreground">
                                            <p>Precio neto: <strong className="text-gray-900">{currencyFormatter.format(item.netPrice)}</strong></p>
                                            <p>Precio con impuestos: <strong className="text-gray-900">{currencyFormatter.format(item.grossPrice)}</strong></p>
                                        </div>
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            onClick={() => addItemToCart(item)}
                                            disabled={!canAdd}
                                            data-test-id="pos-add-to-cart"
                                        >
                                            {canAdd ? 'Agregar al carrito' : 'Sin stock'}
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                    {buildStockBadge(item)}
                                    {item.unitOfMeasure && (
                                        <Badge variant="secondary" data-test-id="pos-unit-badge">
                                            Unidad: {item.unitOfMeasure}
                                        </Badge>
                                    )}
                                    {item.taxIds.length > 0 && (
                                        <Badge variant="info" data-test-id="pos-tax-badge">
                                            {item.taxIds.length} impuesto(s)
                                        </Badge>
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </div>

                {isBusy && (
                    <div className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                        Actualizando resultados…
                    </div>
                )}
            </section>
        </div>
    );
}
