'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import DataGrid, { type DataGridColumn } from '@/app/baseComponents/DataGrid/DataGrid';
import Badge, { type BadgeVariant } from '@/app/baseComponents/Badge/Badge';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import DotProgress from '@/app/baseComponents/DotProgress/DotProgress';
import { Button } from '@/app/baseComponents/Button/Button';
import { useAlert } from '@/app/globalstate/alert/useAlert';
import {
    deletePurchaseOrder,
    getPurchaseOrders,
    type PurchaseOrderListItem,
} from '@/app/actions/purchaseOrders';
import { TransactionStatus } from '@/data/entities/Transaction';

const currencyFormatter = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short',
});

const statusVariant: Record<TransactionStatus, { label: string; variant: BadgeVariant }> = {
    [TransactionStatus.DRAFT]: { label: 'Borrador', variant: 'warning' },
    [TransactionStatus.CONFIRMED]: { label: 'Confirmada', variant: 'success' },
    [TransactionStatus.PARTIALLY_RECEIVED]: { label: 'Parcialmente Recibida', variant: 'info' },
    [TransactionStatus.RECEIVED]: { label: 'Recibida', variant: 'success' },
    [TransactionStatus.CANCELLED]: { label: 'Cancelada', variant: 'error' },
};

const PurchaseOrdersDataGrid = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { success, error } = useAlert();

    const [rows, setRows] = useState<PurchaseOrderListItem[]>([]);
    const [loading, setLoading] = useState(false);

    const search = searchParams.get('search') ?? '';

    const loadOrders = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getPurchaseOrders({ search: search || undefined });
            setRows(data);
        } catch (err) {
            console.error('Error loading purchase orders', err);
            error('No fue posible cargar las órdenes de compra');
        } finally {
            setLoading(false);
        }
    }, [search, error]);

    useEffect(() => {
        loadOrders();
    }, [loadOrders]);

    const handleDelete = useCallback(
        async (order: PurchaseOrderListItem) => {
            const confirmed = window.confirm(`¿Cancelar la orden ${order.documentNumber}?`);
            if (!confirmed) return;
            try {
                const result = await deletePurchaseOrder(order.id);
                if (!result.success) {
                    throw new Error(result.error || 'No fue posible cancelar la orden');
                }
                success('Orden cancelada');
                await loadOrders();
            } catch (err) {
                console.error('Error deleting purchase order', err);
                error(err instanceof Error ? err.message : 'Error al cancelar la orden');
            }
        },
        [success, error, loadOrders]
    );

    const columns: DataGridColumn[] = useMemo(() => {
        const ActionsCell = ({ row }: { row: PurchaseOrderListItem }) => (
            <div className="flex items-center justify-end gap-1">
                <IconButton
                    icon="delete"
                    variant="basicSecondary"
                    size="xs"
                    onClick={() => handleDelete(row)}
                    title="Cancelar orden"
                    disabled={row.status === TransactionStatus.CANCELLED}
                />
            </div>
        );

        return [
            {
                field: 'documentNumber',
                headerName: 'Folio',
                flex: 0.9,
                minWidth: 140,
                renderCell: ({ row }) => (
                    <div className="flex flex-col">
                        <span className="font-medium text-foreground">{row.documentNumber}</span>
                        <span className="text-xs text-muted-foreground">{row.lineCount} ítems</span>
                    </div>
                ),
            },
            {
                field: 'supplierName',
                headerName: 'Proveedor',
                flex: 2,
                minWidth: 220,
                renderCell: ({ row }) => (
                    <div className="flex flex-col">
                        <span className="font-medium text-foreground">{row.supplierName || 'Sin proveedor'}</span>
                        {row.branchName && (
                            <span className="text-xs text-muted-foreground">Sucursal: {row.branchName}</span>
                        )}
                    </div>
                ),
            },
            {
                field: 'createdAt',
                headerName: 'Fecha',
                flex: 1,
                minWidth: 160,
                renderCell: ({ value }) => {
                    if (!value) return '-';
                    const date = new Date(value as string);
                    return dateFormatter.format(date);
                },
            },
            {
                field: 'total',
                headerName: 'Total',
                flex: 0.8,
                minWidth: 130,
                align: 'left',
                headerAlign: 'left',
                renderCell: ({ value }) => currencyFormatter.format(Number(value || 0)),
            },
            {
                field: 'status',
                headerName: 'Estado',
                flex: 0.7,
                minWidth: 120,
                align: 'left',
                headerAlign: 'left',
                renderCell: ({ value }) => {
                    const status = value as TransactionStatus;
                    const meta = statusVariant[status] ?? { label: status, variant: 'secondary' as const };
                    return <Badge variant={meta.variant}>{meta.label}</Badge>;
                },
            },
            {
                field: 'userName',
                headerName: 'Creado por',
                flex: 0.9,
                minWidth: 140,
                renderCell: ({ value }) => value || '-',
            },
            {
                field: 'actions',
                headerName: '',
                flex: 0.4,
                minWidth: 80,
                align: 'left',
                sortable: false,
                filterable: false,
                renderCell: ({ row }) => <ActionsCell row={row as PurchaseOrderListItem} />,
            },
        ];
    }, [handleDelete]);


    return (
        <DataGrid
            title=""
            columns={columns}
            rows={rows}
            totalRows={rows.length}
            height="70vh"
        
            data-test-id="purchase-orders-grid"
        />
    );
};

export default PurchaseOrdersDataGrid;
