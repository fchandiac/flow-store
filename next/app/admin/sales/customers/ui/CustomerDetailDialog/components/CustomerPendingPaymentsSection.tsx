'use client';

import { useEffect, useMemo, useState } from 'react';
import Badge from '@/app/baseComponents/Badge/Badge';
import { listAccountsReceivable, type AccountsReceivableQuota } from '@/app/actions/accountsReceivable';
import { formatDateTime } from '@/lib/dateTimeUtils';

interface CustomerPendingPaymentsSectionProps {
    customerId: string;
}

const currencyFormatter = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

export function CustomerPendingPaymentsSection({ customerId }: CustomerPendingPaymentsSectionProps) {
    const [quotas, setQuotas] = useState<AccountsReceivableQuota[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        if (!customerId) {
            setQuotas([]);
            return () => {
                isMounted = false;
            };
        }

        setLoading(true);
        setError(null);

        listAccountsReceivable({ filters: { customerId, includePaid: false }, pageSize: 100 })
            .then((result) => {
                if (!isMounted) {
                    return;
                }
                setQuotas(result.rows);
            })
            .catch((err) => {
                if (!isMounted) {
                    return;
                }
                console.error('Error fetching pending payments:', err);
                setError('No fue posible cargar los pagos pendientes');
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
        if (loading) {
            return (
                <div className="flex items-center justify-center rounded-lg border border-dashed border-neutral-200 bg-neutral-50 py-10 text-sm text-neutral-500">
                    Cargando pagos pendientes…
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

        if (!quotas.length) {
            return (
                <div className="flex items-center justify-center rounded-lg border border-dashed border-neutral-200 bg-neutral-50 py-10 text-sm text-neutral-500">
                    No hay pagos pendientes para este cliente.
                </div>
            );
        }

        return (
            <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead className="bg-neutral-50 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                        <tr>
                            <th className="px-4 py-3">Referencia</th>
                            <th className="px-4 py-3">Vencimiento</th>
                            <th className="px-4 py-3">Cuota</th>
                            <th className="px-4 py-3">Estado</th>
                            <th className="px-4 py-3 text-right">Monto</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {quotas.map((quota) => (
                            <tr key={quota.id} className="hover:bg-neutral-50/50">
                                <td className="px-4 py-3 font-medium text-neutral-900">
                                    {quota.documentNumber || '-'}
                                </td>
                                <td className="whitespace-nowrap px-4 py-3 text-neutral-600">
                                    {formatDateTime(quota.dueDate)}
                                </td>
                                <td className="px-4 py-3 text-neutral-600">
                                    {quota.quotaNumber} / {quota.totalQuotas}
                                </td>
                                <td className="px-4 py-3">
                                    <Badge variant={quota.status === 'OVERDUE' ? 'error' : 'warning'}>
                                        {quota.status === 'OVERDUE' ? 'Vencido' : 'Pendiente'}
                                    </Badge>
                                </td>
                                <td className="px-4 py-3 text-right font-medium text-neutral-900">
                                    {currencyFormatter.format(quota.quotaAmount)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }, [loading, error, quotas]);

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-600">
                Pagos pendientes (Cuentas por cobrar)
            </h3>
            {content}
        </div>
    );
}
