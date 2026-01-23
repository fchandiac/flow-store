'use client';

import { useEffect, useMemo, useState } from 'react';
import Badge from '@/app/baseComponents/Badge/Badge';
import { getTransactions } from '@/app/actions/transactions';
import { Transaction, TransactionType, PaymentMethod } from '@/data/entities/Transaction';
import { formatDateTime } from '@/lib/dateTimeUtils';

interface CustomerPaymentsSectionProps {
    customerId: string;
}

const currencyFormatter = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

const paymentMethodLabels: Record<string, string> = {
    [PaymentMethod.CASH]: 'Efectivo',
    [PaymentMethod.CREDIT_CARD]: 'T. Crédito',
    [PaymentMethod.DEBIT_CARD]: 'T. Débito',
    [PaymentMethod.TRANSFER]: 'Transferencia',
    [PaymentMethod.CHECK]: 'Cheque',
    [PaymentMethod.CREDIT]: 'Crédito',
    [PaymentMethod.INTERNAL_CREDIT]: 'Crédito Interno',
    [PaymentMethod.MIXED]: 'Mixto',
};

export function CustomerPaymentsSection({ customerId }: CustomerPaymentsSectionProps) {
    const [payments, setPayments] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        if (!customerId) {
            setPayments([]);
            return () => {
                isMounted = false;
            };
        }

        setLoading(true);
        setError(null);

        // Buscamos pagos recibidos de este cliente, excluyendo los de crédito interno que son solo registros de deuda
        getTransactions({ customerId, type: TransactionType.PAYMENT_IN, limit: 100 })
            .then((result) => {
                if (!isMounted) {
                    return;
                }
                // Filtramos para mostrar solo pagos reales (donde entró dinero)
                const realPayments = result.data.filter(p => p.paymentMethod !== PaymentMethod.INTERNAL_CREDIT);
                setPayments(realPayments);
            })
            .catch((err) => {
                if (!isMounted) {
                    return;
                }
                console.error('Error fetching customer payments:', err);
                setError('No fue posible cargar el historial de pagos');
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
                    Cargando pagos realizados…
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

        if (!payments.length) {
            return (
                <div className="flex items-center justify-center rounded-lg border border-dashed border-neutral-200 bg-neutral-50 py-10 text-sm text-neutral-500">
                    Aún no se registran pagos para este cliente.
                </div>
            );
        }

        return (
            <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead className="bg-neutral-50 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                        <tr>
                            <th className="px-4 py-3">Fecha</th>
                            <th className="px-4 py-3">Referencia Pago</th>
                            <th className="px-4 py-3">Venta Ref.</th>
                            <th className="px-4 py-3">Método</th>
                            <th className="px-4 py-3 text-right">Monto</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {payments.map((payment) => (
                            <tr key={payment.id} className="hover:bg-neutral-50/50">
                                <td className="whitespace-nowrap px-4 py-3 text-neutral-600">
                                    {formatDateTime(payment.createdAt)}
                                </td>
                                <td className="px-4 py-3 font-medium text-neutral-900">
                                    {payment.documentNumber || '-'}
                                </td>
                                <td className="px-4 py-3 text-neutral-600 font-mono text-xs uppercase tracking-tighter">
                                    {payment.externalReference || '-'}
                                </td>
                                <td className="px-4 py-3">
                                    <Badge variant="info">
                                        {payment.paymentMethod ? (paymentMethodLabels[payment.paymentMethod] || payment.paymentMethod) : 'Otro'}
                                    </Badge>
                                </td>
                                <td className="px-4 py-3 text-right font-medium text-neutral-900">
                                    {currencyFormatter.format(payment.total)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }, [loading, error, payments]);

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-600">
                Historial de pagos realizados
            </h3>
            {content}
        </div>
    );
}
