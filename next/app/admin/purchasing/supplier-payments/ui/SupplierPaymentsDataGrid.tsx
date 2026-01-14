'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import moment from 'moment';
import DataGrid, { type DataGridColumn } from '@/baseComponents/DataGrid/DataGrid';
import Badge, { type BadgeVariant } from '@/baseComponents/Badge/Badge';
import IconButton from '@/baseComponents/IconButton/IconButton';
import { getSupplierPayments, type SupplierPaymentListItem } from '@/actions/supplierPayments';
import { PaymentMethod, TransactionStatus } from '@/data/entities/Transaction';

const currencyFormatter = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

const transactionStatusLabels: Record<TransactionStatus, { label: string; variant: BadgeVariant }> = {
    [TransactionStatus.DRAFT]: { label: 'Borrador', variant: 'warning' },
    [TransactionStatus.CONFIRMED]: { label: 'Confirmada', variant: 'success' },
    [TransactionStatus.PARTIALLY_RECEIVED]: { label: 'Parcial', variant: 'info' },
    [TransactionStatus.RECEIVED]: { label: 'Recibida', variant: 'success' },
    [TransactionStatus.CANCELLED]: { label: 'Anulada', variant: 'error' },
};

const paymentStatusConfig: Record<string, { label: string; variant: BadgeVariant }> = {
    PENDING: { label: 'Pendiente', variant: 'warning' },
    PARTIAL: { label: 'Parcial', variant: 'info' },
    PAID: { label: 'Pagada', variant: 'success' },
    CANCELLED: { label: 'Cancelada', variant: 'secondary' },
    FAILED: { label: 'Fallida', variant: 'error' },
};

const originLabels: Record<string, { label: string; variant: BadgeVariant }> = {
    PURCHASE_RECEPTION: { label: 'Recepción OC', variant: 'info-outlined' },
    DIRECT_RECEPTION: { label: 'Recepción directa', variant: 'secondary-outlined' },
};

const paymentMethodLabels: Record<PaymentMethod, string> = {
    [PaymentMethod.CASH]: 'Efectivo',
    [PaymentMethod.CREDIT_CARD]: 'Tarjeta crédito',
    [PaymentMethod.DEBIT_CARD]: 'Tarjeta débito',
    [PaymentMethod.TRANSFER]: 'Transferencia',
    [PaymentMethod.CHECK]: 'Cheque',
    [PaymentMethod.CREDIT]: 'Crédito',
    [PaymentMethod.MIXED]: 'Mixto',
};

const normalizePaymentStatus = (status?: string | null) => {
    if (!status) return 'PENDING';
    return status.toUpperCase();
};

// Show due date context with badge that highlights urgency.
const buildDueDateDisplay = (payment: SupplierPaymentListItem) => {
    const dueDateRaw = payment.paymentDueDate;

    if (!dueDateRaw) {
        return (
            <Badge variant='secondary-outlined' className='mt-1 w-fit'>
                Sin vencimiento
            </Badge>
        );
    }

    const dueDate = moment(dueDateRaw, moment.ISO_8601, true).isValid()
        ? moment(dueDateRaw)
        : moment(dueDateRaw, 'YYYY-MM-DD');

    const today = moment().startOf('day');
    const dueAtStart = dueDate.clone().startOf('day');
    const diffDays = dueAtStart.diff(today, 'days');

    let variant: BadgeVariant;
    let label: string;

    if (diffDays < 0) {
        variant = 'error';
        label = `Atrasado ${Math.abs(diffDays)} día${Math.abs(diffDays) === 1 ? '' : 's'}`;
    } else if (diffDays === 0) {
        variant = 'warning';
        label = 'Vence hoy';
    } else if (diffDays <= 3) {
        variant = 'warning';
        label = `Vence en ${diffDays} día${diffDays === 1 ? '' : 's'}`;
    } else {
        variant = 'info';
        label = `Vence en ${diffDays} día${diffDays === 1 ? '' : 's'}`;
    }

    return (
        <div className='flex flex-col'>
            <span className='text-sm font-medium text-gray-900'>
                {dueDate.format('DD-MM-YYYY')}
            </span>
            <Badge variant={variant} className='mt-1 w-fit'>
                {label}
            </Badge>
        </div>
    );
};

const SupplierPaymentsDataGrid = () => {
    const [rows, setRows] = useState<SupplierPaymentListItem[]>([]);
    const [loading, setLoading] = useState(false);

    const loadPayments = useCallback(async () => {
        setLoading(true);
        try {
            const result = await getSupplierPayments({ limit: 100 });
            setRows(result);
        } catch (error) {
            console.error('Error cargando pagos a proveedores:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPayments();
    }, [loadPayments]);

    const columns: DataGridColumn[] = useMemo(() => [
        {
            field: 'documentNumber',
            headerName: 'Documento',
            flex: 0.9,
            minWidth: 160,
            renderCell: (params) => (
                <div className='flex flex-col'>
                    <span className='font-mono text-sm font-semibold text-gray-900'>
                        {(params.row as SupplierPaymentListItem).documentNumber}
                    </span>
                    {(params.row as SupplierPaymentListItem).externalReference && (
                        <span className='text-xs text-muted-foreground'>
                            Ref: {(params.row as SupplierPaymentListItem).externalReference}
                        </span>
                    )}
                </div>
            ),
        },
        {
            field: 'supplierName',
            headerName: 'Proveedor',
            flex: 1.4,
            minWidth: 220,
            renderCell: (params) => {
                const row = params.row as SupplierPaymentListItem;
                return (
                    <div className='flex flex-col'>
                        <span className='text-sm font-medium text-gray-900'>
                            {row.supplierName ?? 'Sin proveedor'}
                        </span>
                        {row.supplierAlias && (
                            <span className='text-xs text-muted-foreground'>
                                Alias: {row.supplierAlias}
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            field: 'total',
            headerName: 'Monto',
            flex: 0.8,
            minWidth: 140,
            align: 'right',
            renderCell: (params) => (
                <span className='text-sm font-semibold text-gray-900'>
                    {currencyFormatter.format((params.row as SupplierPaymentListItem).total)}
                </span>
            ),
        },
        {
            field: 'paymentStatus',
            headerName: 'Estado de pago',
            flex: 0.9,
            minWidth: 160,
            renderCell: (params) => {
                const row = params.row as SupplierPaymentListItem;
                const normalized = normalizePaymentStatus(row.paymentStatus);
                const config = paymentStatusConfig[normalized] ?? {
                    label: normalized,
                    variant: 'secondary' as BadgeVariant,
                };
                return <Badge variant={config.variant}>{config.label}</Badge>;
            },
        },
        {
            field: 'paymentDueDate',
            headerName: 'Vencimiento',
            flex: 1.1,
            minWidth: 180,
            renderCell: (params) => buildDueDateDisplay(params.row as SupplierPaymentListItem),
        },
        {
            field: 'createdAt',
            headerName: 'Creado',
            flex: 1,
            minWidth: 170,
            renderCell: (params) => (
                <span className='text-sm text-gray-600'>
                    {moment((params.row as SupplierPaymentListItem).createdAt).format('DD-MM-YYYY HH:mm')}
                </span>
            ),
        },
        {
            field: 'origin',
            headerName: 'Origen',
            flex: 1,
            minWidth: 170,
            renderCell: (params) => {
                const row = params.row as SupplierPaymentListItem;
                const origin = row.origin ? row.origin.toUpperCase() : null;
                const config = origin ? originLabels[origin] : null;
                return (
                    <div className='flex flex-col'>
                        {row.receptionDocumentNumber ? (
                            <span className='font-mono text-xs text-blue-600'>
                                {row.receptionDocumentNumber}
                            </span>
                        ) : (
                            <span className='text-xs text-muted-foreground'>Sin documento origen</span>
                        )}
                        {config ? (
                            <Badge variant={config.variant} className='mt-1 w-fit'>
                                {config.label}
                            </Badge>
                        ) : null}
                    </div>
                );
            },
        },
        {
            field: 'paymentMethod',
            headerName: 'Método',
            flex: 0.7,
            minWidth: 150,
            renderCell: (params) => {
                const row = params.row as SupplierPaymentListItem;
                const method = row.paymentMethod;
                const label = method
                    ? (Object.prototype.hasOwnProperty.call(paymentMethodLabels, method)
                        ? paymentMethodLabels[method as PaymentMethod]
                        : method)
                    : 'No asignado';
                return <span className='text-sm text-gray-700'>{label}</span>;
            },
        },
        {
            field: 'status',
            headerName: 'Estado trx',
            flex: 0.8,
            minWidth: 150,
            renderCell: (params) => {
                const row = params.row as SupplierPaymentListItem;
                const status = row.status;
                const config = Object.prototype.hasOwnProperty.call(transactionStatusLabels, status)
                    ? transactionStatusLabels[status as TransactionStatus]
                    : {
                        label: status,
                        variant: 'secondary' as BadgeVariant,
                    };
                return <Badge variant={config.variant}>{config.label}</Badge>;
            },
        },
    ], []);

    const headerActions = (
        <div className='flex items-center gap-2'>
            <IconButton
                icon='refresh'
                variant='ghost'
                size='sm'
                ariaLabel='Actualizar lista'
                onClick={loadPayments}
                isLoading={loading}
            />
        </div>
    );

    return (
        <DataGrid
            columns={columns}
            rows={rows}
            title='Pagos a proveedores'
            totalRows={rows.length}
            headerActions={headerActions}
        />
    );
};

export default SupplierPaymentsDataGrid;
