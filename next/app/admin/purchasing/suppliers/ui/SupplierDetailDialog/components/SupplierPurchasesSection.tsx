'use client';

import { useEffect, useMemo, useState } from 'react';
import Badge, { type BadgeVariant } from '@/app/baseComponents/Badge/Badge';
import { getSupplierPurchases, type SupplierPurchaseListItem } from '@/app/actions/supplierPurchases';
import { TransactionStatus } from '@/data/entities/Transaction';

interface SupplierPurchasesSectionProps {
    supplierId: string;
}

const currencyFormatter = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

const dateTimeFormatter = new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

const statusLabels: Record<TransactionStatus, string> = {
    [TransactionStatus.DRAFT]: 'Borrador',
    [TransactionStatus.CONFIRMED]: 'Confirmada',
    [TransactionStatus.PARTIALLY_RECEIVED]: 'Parcial',
    [TransactionStatus.RECEIVED]: 'Recepcionada',
    [TransactionStatus.CANCELLED]: 'Anulada',
};

const statusVariants: Record<TransactionStatus, BadgeVariant> = {
    [TransactionStatus.DRAFT]: 'warning',
    [TransactionStatus.CONFIRMED]: 'info',
    [TransactionStatus.PARTIALLY_RECEIVED]: 'warning',
    [TransactionStatus.RECEIVED]: 'success',
    [TransactionStatus.CANCELLED]: 'error',
};

export function SupplierPurchasesSection({ supplierId }: SupplierPurchasesSectionProps) {
    const [purchases, setPurchases] = useState<SupplierPurchaseListItem[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        if (!supplierId) {
            setPurchases([]);
            return () => {
                isMounted = false;
            };
        }

        setLoading(true);
        setError(null);

        getSupplierPurchases(supplierId, { includeCancelled: true, limit: 100 })
            .then((result) => {
                if (!isMounted) {
                    return;
                }
                setPurchases(result);
            })
            .catch((err) => {
                if (!isMounted) {
                    return;
                }
                console.error('Error fetching supplier purchases:', err);
                setError('No fue posible cargar el historial de compras');
            })
            .finally(() => {
                if (isMounted) {
                    setLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [supplierId]);

    const content = useMemo(() => {
        if (loading) {
            return (
                <div className="flex items-center justify-center rounded-lg border border-dashed border-neutral-200 bg-neutral-50 py-10 text-sm text-neutral-500">
                    Cargando compras…
                </div>
            );
        }

        if (error) {
            return (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-600">
                    {error}
                </div>
            );
        }

        if (!purchases.length) {
            return (
                <div className="flex items-center justify-center rounded-lg border border-dashed border-neutral-200 bg-neutral-50 py-10 text-sm text-neutral-500">
                    Aún no se registran compras para este proveedor.
                </div>
            );
        }

        return (
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200 text-sm">
                    <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                        <tr>
                            <th className="px-4 py-3 text-left font-medium">Folio</th>
                            <th className="px-4 py-3 text-left font-medium">Fecha</th>
                            <th className="px-4 py-3 text-left font-medium">Estado</th>
                            <th className="px-4 py-3 text-right font-medium">Subtotal</th>
                            <th className="px-4 py-3 text-right font-medium">IVA</th>
                            <th className="px-4 py-3 text-right font-medium">Total</th>
                            <th className="px-4 py-3 text-left font-medium">OC</th>
                            <th className="px-4 py-3 text-left font-medium">Notas</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 bg-white">
                        {purchases.map((purchase) => {
                            const formattedDate = dateTimeFormatter.format(new Date(purchase.createdAt));
                            return (
                                <tr key={purchase.id} className="hover:bg-neutral-50">
                                    <td className="px-4 py-3 font-mono text-xs font-semibold text-neutral-800">
                                        {purchase.documentNumber}
                                    </td>
                                    <td className="px-4 py-3 text-neutral-600">{formattedDate}</td>
                                    <td className="px-4 py-3">
                                        <Badge variant={statusVariants[purchase.status]}>
                                            {statusLabels[purchase.status]}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3 text-right text-neutral-700">
                                        {currencyFormatter.format(purchase.subtotal)}
                                    </td>
                                    <td className="px-4 py-3 text-right text-neutral-700">
                                        {currencyFormatter.format(purchase.taxAmount)}
                                    </td>
                                    <td className="px-4 py-3 text-right font-semibold text-neutral-900">
                                        {currencyFormatter.format(purchase.total)}
                                    </td>
                                    <td className="px-4 py-3 text-neutral-600">
                                        {purchase.purchaseOrderNumber ?? '—'}
                                    </td>
                                    <td className="px-4 py-3 text-neutral-600">
                                        {purchase.notes?.trim() || '—'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    }, [error, loading, purchases]);

    return (
        <section className="space-y-4">
            <header className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-neutral-900">Historial de compras</h3>
                    <p className="text-sm text-neutral-500">
                        Últimas compras registradas vinculadas a este proveedor.
                    </p>
                </div>
                {purchases.length > 0 && !loading ? (
                    <span className="text-xs font-medium uppercase text-neutral-400">
                        {purchases.length} {purchases.length === 1 ? 'resultado' : 'resultados'}
                    </span>
                ) : null}
            </header>
            {content}
        </section>
    );
}

export default SupplierPurchasesSection;
