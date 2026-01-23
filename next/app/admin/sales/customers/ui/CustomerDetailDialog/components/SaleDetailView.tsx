'use client';

import { useEffect, useState } from 'react';
import { getSaleTransactionDetail, type SaleTransactionDetail } from '@/app/actions/transactions';
import { PaymentMethod } from '@/data/entities/Transaction';
import Badge from '@/app/baseComponents/Badge/Badge';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import { formatDateTime } from '@/lib/dateTimeUtils';

interface SaleDetailViewProps {
    transactionId: string;
    onBack: () => void;
}

const currencyFormatter = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

const paymentMethodLabels: Record<PaymentMethod, string> = {
    [PaymentMethod.CASH]: 'Efectivo',
    [PaymentMethod.CREDIT_CARD]: 'Tarjeta de Crédito',
    [PaymentMethod.DEBIT_CARD]: 'Tarjeta de Débito',
    [PaymentMethod.TRANSFER]: 'Transferencia',
    [PaymentMethod.CHECK]: 'Cheque',
    [PaymentMethod.CREDIT]: 'Crédito',
    [PaymentMethod.INTERNAL_CREDIT]: 'Crédito Interno',
    [PaymentMethod.MIXED]: 'Mixto',
};

export function SaleDetailView({ transactionId, onBack }: SaleDetailViewProps) {
    const [detail, setDetail] = useState<SaleTransactionDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        getSaleTransactionDetail(transactionId)
            .then((res) => {
                if (res) {
                    setDetail(res);
                } else {
                    setError('No se pudo encontrar el detalle de la venta');
                }
            })
            .catch((err) => {
                console.error('Error fetching sale detail:', err);
                setError('Error al cargar el detalle');
            })
            .finally(() => setLoading(false));
    }, [transactionId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <span className="text-sm text-neutral-500 font-medium">Cargando detalle…</span>
            </div>
        );
    }

    if (error || !detail) {
        return (
            <div className="p-6 text-center">
                <p className="text-red-500 mb-4">{error || 'Error desconocido'}</p>
                <button
                    onClick={onBack}
                    className="text-primary-600 hover:underline text-sm font-medium"
                >
                    Volver al listado
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <header className="flex items-center gap-4">
                <IconButton
                    icon="arrow_back"
                    variant="basicSecondary"
                    size="sm"
                    onClick={onBack}
                    title="Volver"
                />
                <div>
                    <h3 className="text-lg font-semibold text-neutral-900">
                        Detalle Venta: {detail.documentNumber}
                    </h3>
                    <p className="text-sm text-neutral-500">
                        {formatDateTime(detail.createdAt)}
                    </p>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-neutral-50 p-4 rounded-xl border border-neutral-200">
                <div className="space-y-1">
                    <span className="text-xs font-semibold uppercase text-neutral-500">Método de Pago</span>
                    <p className="text-sm font-medium text-neutral-800">
                        {detail.paymentMethod ? (paymentMethodLabels[detail.paymentMethod] || detail.paymentMethod) : 'No especificado'}
                    </p>
                </div>
                <div className="space-y-1 text-right md:text-left">
                    <span className="text-xs font-semibold uppercase text-neutral-500">Vendedor</span>
                    <p className="text-sm font-medium text-neutral-800">{detail.userFullName || detail.userName || '-'}</p>
                </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
                <table className="w-full text-left text-sm">
                    <thead className="bg-neutral-50 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                        <tr>
                            <th className="px-4 py-3">Producto</th>
                            <th className="px-4 py-3 text-center">Cant.</th>
                            <th className="px-4 py-3 text-right">Precio</th>
                            <th className="px-4 py-3 text-right">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {detail.lines.map((line) => (
                            <tr key={line.id} className="hover:bg-neutral-50/30">
                                <td className="px-4 py-3">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-neutral-900">{line.productName}</span>
                                        {line.variantName && (
                                            <span className="text-xs text-neutral-500">{line.variantName}</span>
                                        )}
                                        <span className="text-[10px] text-neutral-400 font-mono uppercase">{line.productSku}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-center text-neutral-600">
                                    {line.quantity} {line.unitOfMeasure}
                                </td>
                                <td className="px-4 py-3 text-right text-neutral-600">
                                    {currencyFormatter.format(line.unitPrice)}
                                </td>
                                <td className="px-4 py-3 text-right font-medium text-neutral-900">
                                    {currencyFormatter.format(line.subtotal)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-neutral-50/80 border-t border-neutral-200">
                        <tr>
                            <td colSpan={3} className="px-4 py-2 text-right text-neutral-500 font-medium">Subtotal</td>
                            <td className="px-4 py-2 text-right text-neutral-900 font-medium">
                                {currencyFormatter.format(detail.subtotal)}
                            </td>
                        </tr>
                        {detail.discountAmount > 0 && (
                            <tr>
                                <td colSpan={3} className="px-4 py-2 text-right text-neutral-500 font-medium">Descuento</td>
                                <td className="px-4 py-2 text-right text-red-600 font-medium">
                                    -{currencyFormatter.format(detail.discountAmount)}
                                </td>
                            </tr>
                        )}
                        {detail.taxAmount > 0 && (
                            <tr>
                                <td colSpan={3} className="px-4 py-2 text-right text-neutral-500 font-medium">IVA / Impuestos</td>
                                <td className="px-4 py-2 text-right text-neutral-900 font-medium">
                                    {currencyFormatter.format(detail.taxAmount)}
                                </td>
                            </tr>
                        )}
                        <tr className="border-t border-neutral-200 bg-neutral-100/50">
                            <td colSpan={3} className="px-4 py-3 text-right text-neutral-900 font-bold uppercase tracking-wider">Total</td>
                            <td className="px-4 py-3 text-right text-primary-700 font-bold text-lg">
                                {currencyFormatter.format(detail.total)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {detail.notes && (
                <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl">
                    <span className="text-xs font-semibold uppercase text-blue-600 block mb-1">Notas</span>
                    <p className="text-sm text-neutral-700 italic">"{detail.notes}"</p>
                </div>
            )}
        </div>
    );
}
