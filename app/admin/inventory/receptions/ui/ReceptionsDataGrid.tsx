'use client';

import { useCallback, useEffect, useState } from 'react';
import DataGrid, { type DataGridColumn } from '@/app/baseComponents/DataGrid/DataGrid';
import Badge, { type BadgeVariant } from '@/app/baseComponents/Badge/Badge';
import { getReceptions, type ReceptionListItem } from '@/app/actions/receptions';
import { TransactionStatus } from '@/data/entities/Transaction';

const currencyFormatter = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat('es-CL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
});

const statusLabels: Record<TransactionStatus, string> = {
    [TransactionStatus.DRAFT]: 'Borrador',
    [TransactionStatus.CONFIRMED]: 'Confirmada',
    [TransactionStatus.PARTIALLY_RECEIVED]: 'Parcialmente Recibida',
    [TransactionStatus.RECEIVED]: 'Recibida',
    [TransactionStatus.CANCELLED]: 'Cancelada',
};

const statusColors: Record<TransactionStatus, BadgeVariant> = {
    [TransactionStatus.DRAFT]: 'warning',
    [TransactionStatus.CONFIRMED]: 'success',
    [TransactionStatus.PARTIALLY_RECEIVED]: 'info',
    [TransactionStatus.RECEIVED]: 'success',
    [TransactionStatus.CANCELLED]: 'error',
};

export default function ReceptionsDataGrid() {
    const [data, setData] = useState<ReceptionListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<Record<string, any>>({});

    const loadReceptions = useCallback(async () => {
        setLoading(true);
        try {
            const result = await getReceptions({
                search: filters.search,
                supplierId: filters.supplierId,
                storageId: filters.storageId,
                limit: filters.limit ?? 25,
            });
            setData(result);
        } catch (error) {
            console.error('Error loading receptions:', error);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        loadReceptions();
    }, [loadReceptions]);

    const columns: DataGridColumn[] = [
        {
            field: 'documentNumber',
            headerName: 'Número',
            width: 140,
            renderCell: (params) => (
                <div className="font-mono text-sm font-medium">{params.row.documentNumber}</div>
            ),
        },
        {
            field: 'createdAt',
            headerName: 'Fecha',
            width: 160,
            renderCell: (params) => (
                <div className="text-sm text-gray-600">
                    {dateFormatter.format(new Date(params.row.createdAt))}
                </div>
            ),
        },
        {
            field: 'supplierName',
            headerName: 'Proveedor',
            width: 200,
            renderCell: (params) => (
                <div className="text-sm font-medium text-gray-900">
                    {params.row.supplierName ?? 'Sin proveedor'}
                </div>
            ),
        },
        {
            field: 'storageName',
            headerName: 'Almacén',
            width: 160,
            renderCell: (params) => (
                <div className="text-sm text-gray-600">{params.row.storageName ?? 'Sin almacén'}</div>
            ),
        },
        {
            field: 'purchaseOrderNumber',
            headerName: 'Orden de Compra',
            width: 140,
            renderCell: (params) =>
                params.row.purchaseOrderNumber ? (
                    <div className="font-mono text-sm text-blue-600">{params.row.purchaseOrderNumber}</div>
                ) : (
                    <Badge variant="secondary">
                        Directa
                    </Badge>
                ),
        },
        {
            field: 'lineCount',
            headerName: 'Productos',
            width: 100,
            align: 'center',
            renderCell: (params) => <div className="text-sm font-medium">{params.row.lineCount}</div>,
        },
        {
            field: 'total',
            headerName: 'Total',
            width: 130,
            align: 'right',
            renderCell: (params) => (
                <div className="text-sm font-semibold text-gray-900">
                    {currencyFormatter.format(params.row.total)}
                </div>
            ),
        },
        {
            field: 'status',
            headerName: 'Estado',
            width: 120,
            renderCell: (params) => {
                const status = params.row.status as TransactionStatus;
                return (
                    <Badge variant={statusColors[status] ?? 'secondary'}>
                        {statusLabels[status] ?? status}
                    </Badge>
                );
            },
        },
        {
            field: 'hasDiscrepancies',
            headerName: 'Discrepancias',
            width: 120,
            renderCell: (params) =>
                params.row.hasDiscrepancies ? (
                    <Badge variant="warning">
                        Con diferencias
                    </Badge>
                ) : (
                    <Badge variant="success">
                        Sin diferencias
                    </Badge>
                ),
        },
        {
            field: 'userName',
            headerName: 'Usuario',
            width: 150,
            renderCell: (params) => <div className="text-sm text-gray-600">{params.row.userName ?? '-'}</div>,
        },
    ];

    return (
        <div className="h-full flex flex-col bg-gray-50">
            <DataGrid
                columns={columns}
                rows={data}
                title="Recepciones"
                search=""
                totalRows={data.length}
            />
        </div>
    );
}
