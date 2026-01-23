'use client';

import { useEffect, useMemo, useState } from 'react';
import Badge, { type BadgeVariant } from '@/app/baseComponents/Badge/Badge';
import { getTransactions } from '@/app/actions/transactions';
import { Transaction, TransactionStatus, TransactionType } from '@/data/entities/Transaction';
import { formatDateTime } from '@/lib/dateTimeUtils';
import { SaleDetailView } from './SaleDetailView';

interface CustomerPurchasesSectionProps {
    customerId: string;
}

const currencyFormatter = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

const statusLabels: Record<TransactionStatus, string> = {
    [TransactionStatus.DRAFT]: 'Borrador',
    [TransactionStatus.CONFIRMED]: 'Confirmada',
    [TransactionStatus.PARTIALLY_RECEIVED]: 'Parcial',
    [TransactionStatus.RECEIVED]: 'Finalizada',
    [TransactionStatus.CANCELLED]: 'Anulada',
};

const statusVariants: Record<TransactionStatus, BadgeVariant> = {
    [TransactionStatus.DRAFT]: 'warning',
    [TransactionStatus.CONFIRMED]: 'info',
    [TransactionStatus.PARTIALLY_RECEIVED]: 'warning',
    [TransactionStatus.RECEIVED]: 'success',
    [TransactionStatus.CANCELLED]: 'error',
};

export function CustomerPurchasesSection({ customerId }: CustomerPurchasesSectionProps) {
    const [sales, setSales] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        if (!customerId) {
            setSales([]);
            setSelectedSaleId(null);
            return () => {
                isMounted = false;
            };
        }

        setLoading(true);
        setError(null);
        setSelectedSaleId(null);

        getTransactions({ customerId, type: TransactionType.SALE, limit: 100 })
            .then((result) => {
                if (!isMounted) {
                    return;
                }
                setSales(result.data);
            })
            .catch((err) => {
                if (!isMounted) {
                    return;
                }
                console.error('Error fetching customer sales:', err);
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
    }, [customerId]);

    const content = useMemo(() => {
        if (selectedSaleId) {
            return (
                <SaleDetailView
                    transactionId={selectedSaleId}
                    onBack={() => setSelectedSaleId(null)}
                />
            );
        }

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

        if (!sales.length) {
            return (
                <div className="flex items-center justify-center rounded-lg border border-dashed border-neutral-200 bg-neutral-50 py-10 text-sm text-neutral-500">
                    Aún no se registran compras para este cliente.
                </div>
            );
        }

        return (
            <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead className="bg-neutral-50 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                        <tr>
                            <th className="px-4 py-3">Fecha</th>
                            <th className="px-4 py-3">Documento</th>
                            <th className="px-4 py-3">Estado</th>
                            <th className="px-4 py-3 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {sales.map((sale) => (
                            <tr
                                key={sale.id}
                                className="hover:bg-neutral-50/50 cursor-pointer transition-colors"
                                onClick={() => setSelectedSaleId(sale.id)}
                            >
                                <td className="whitespace-nowrap px-4 py-3 text-neutral-600">
                                    {formatDateTime(sale.createdAt)}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-neutral-900">
                                            {sale.documentNumber || '-'}
                                        </span>
                                        <span className="material-symbols-outlined text-[16px] text-neutral-400">
                                            visibility
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <Badge variant={statusVariants[sale.status] ?? 'info'}>
                                        {statusLabels[sale.status] ?? sale.status}
                                    </Badge>
                                </td>
                                <td className="px-4 py-3 text-right font-medium text-neutral-900">
                                    {currencyFormatter.format(sale.total)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }, [loading, error, sales, selectedSaleId]);

    return (
        <div className="space-y-4">
            {!selectedSaleId && (
                <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-600">
                    Historial de compras
                </h3>
            )}
            {content}
        </div>
    );
}
