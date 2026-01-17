'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/baseComponents/Button/Button';
import IconButton from '@/baseComponents/IconButton/IconButton';
import Badge from '@/baseComponents/Badge/Badge';
import Switch from '@/baseComponents/Switch/Switch';
import NumberStepper from '@/baseComponents/NumberStepper/NumberStepper';
import { usePointOfSale } from '../context/PointOfSaleContext';

const currencyFormatter = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

const formatCurrency = (value: number) => currencyFormatter.format(value);

export default function CartPanel() {
    const {
        cart,
        totals,
        removeItem,
        updateItemQuantity,
        toggleItemTaxes,
        clearCart,
        branchName,
        storageName,
        isLoading,
        isFetching,
        openPaymentDialog,
    } = usePointOfSale();

    const isEmpty = cart.length === 0;
    const isBusy = isLoading || isFetching;

    const summary = useMemo(
        () => [
            { label: 'Subtotal neto', value: formatCurrency(totals.subtotal) },
            { label: 'Impuestos', value: formatCurrency(totals.taxAmount) },
            { label: 'Total', value: formatCurrency(totals.total) },
        ],
        [totals]
    );

    return (
        <div className="flex h-full flex-col rounded-xl border border-border/60 bg-white shadow-sm">
            <header className="border-b border-border/40 px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Sucursal</p>
                        <p className="text-sm font-medium text-gray-900">{branchName ?? 'No asignada'}</p>
                        <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">Almacén</p>
                        <p className="text-sm font-medium text-gray-900">{storageName ?? 'No asignado'}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Total a cobrar</p>
                        <p className="text-2xl font-semibold text-gray-900" data-test-id="pos-cart-total">
                            {formatCurrency(totals.total)}
                        </p>
                        <Button
                            variant="outlined"
                            size="sm"
                            className="mt-2"
                            onClick={clearCart}
                            disabled={isEmpty || isBusy}
                            data-test-id="pos-clear-cart"
                        >
                            Vaciar carrito
                        </Button>
                    </div>
                </div>
                <dl className="mt-4 grid grid-cols-1 gap-2 text-sm text-muted-foreground">
                    {summary.map((item) => (
                        <div key={item.label} className="flex items-center justify-between">
                            <dt>{item.label}</dt>
                            <dd className="font-medium text-gray-900">{item.value}</dd>
                        </div>
                    ))}
                </dl>
            </header>

            <section className="flex-1 overflow-auto px-5 py-4">
                {isEmpty && !isBusy && (
                    <div className="rounded-lg border border-dashed border-border/60 bg-gray-50 px-4 py-3 text-sm text-muted-foreground">
                        Aún no agregas productos. Usa el buscador para construir la venta.
                    </div>
                )}

                {isBusy && (
                    <div className="mb-3 flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                        Preparando carrito…
                    </div>
                )}

                <div className="grid gap-3">
                    {cart.map((line) => {
                        const lineSubtotal = line.quantity * line.netPrice;
                        const lineTotal = line.applyTaxes
                            ? line.quantity * line.grossPrice
                            : lineSubtotal;
                        return (
                            <article
                                key={line.variantId}
                                className="flex flex-col gap-3 rounded-lg border border-border/50 bg-white px-4 py-3 shadow-sm"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex min-w-[200px] flex-1 flex-col gap-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="text-base font-semibold text-gray-900">
                                                {line.displayName}
                                            </h3>
                                            <Badge variant="secondary" className="font-mono text-[11px]">
                                                SKU {line.sku}
                                            </Badge>
                                        </div>
                                        {line.productBrand && (
                                            <p className="text-xs text-muted-foreground">{line.productBrand}</p>
                                        )}
                                        {line.attributeValues && (
                                            <p className="text-xs text-muted-foreground">
                                                {Object.values(line.attributeValues).join(' · ')}
                                            </p>
                                        )}
                                    </div>
                                    <IconButton
                                        icon="delete"
                                        variant="text"
                                        size="sm"
                                        ariaLabel="Eliminar línea"
                                        onClick={() => removeItem(line.variantId)}
                                        data-test-id="pos-remove-from-cart"
                                    />
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="flex flex-col gap-2">
                                        <span className="text-xs font-medium uppercase text-muted-foreground">
                                            Cantidad
                                        </span>
                                        <NumberStepper
                                            value={line.quantity}
                                            min={1}
                                            step={1}
                                            onChange={(value) => updateItemQuantity(line.variantId, value)}
                                            data-test-id="pos-cart-quantity"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Precio unitario neto: <span className="font-medium text-gray-900">{formatCurrency(line.netPrice)}</span>
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Precio unitario con impuestos: <span className="font-medium text-gray-900">{formatCurrency(line.grossPrice)}</span>
                                        </p>
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium uppercase text-muted-foreground">Aplicar impuestos</span>
                                            <Switch
                                                checked={line.applyTaxes}
                                                onChange={() => toggleItemTaxes(line.variantId)}
                                                data-test-id="pos-cart-toggle-tax"
                                            />
                                        </div>
                                        <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-muted-foreground">
                                            <div className="flex items-center justify-between">
                                                <span>Subtotal</span>
                                                <span className="font-medium text-gray-900">{formatCurrency(lineSubtotal)}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span>Total línea</span>
                                                <span className="font-medium text-gray-900">{formatCurrency(lineTotal)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                    {line.trackInventory ? (
                                        <Badge variant={line.stock > 0 ? 'success' : 'error'}>
                                            Stock disponible: {line.stock.toFixed(0)}
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary">Sin control de stock</Badge>
                                    )}
                                    {line.unitOfMeasure && (
                                        <Badge variant="info">Unidad: {line.unitOfMeasure}</Badge>
                                    )}
                                    {line.taxIds.length > 0 && (
                                        <Badge variant="secondary">{line.taxIds.length} impuesto(s)</Badge>
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </div>
            </section>

            <footer className="border-t border-border/40 px-5 py-4">
                <Button
                    variant="primary"
                    size="lg"
                    className="w-full"
                    disabled={isEmpty || isBusy}
                    data-test-id="pos-checkout"
                    onClick={openPaymentDialog}
                >
                    Continuar al cobro
                </Button>
            </footer>
        </div>
    );
}
