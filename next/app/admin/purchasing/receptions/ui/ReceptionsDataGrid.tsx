'use client';

import { useCallback, useEffect, useState } from 'react';
import moment from 'moment';
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
            headerName: 'Folio',
            flex: 0.8,
            minWidth: 140,
            renderCell: (params) => (
                <div className="font-mono text-sm font-medium">{params.row.documentNumber}</div>
            ),
        },
        {
            field: 'createdAt',
            headerName: 'Fecha',
            flex: 1,
            minWidth: 160,
            renderCell: (params) => (
                <div className="text-sm text-gray-600">
                    {moment(params.row.createdAt).format('DD-MM-YYYY HH:mm')}
                </div>
            ),
        },
        {
            field: 'supplierName',
            headerName: 'Proveedor',
            flex: 1.4,
            minWidth: 200,
            renderCell: (params) => (
                <div className="text-sm font-medium text-gray-900">
                    {params.row.supplierName ?? 'Sin proveedor'}
                </div>
            ),
        },
        {
            field: 'storageName',
            headerName: 'Almacén',
            flex: 1,
            minWidth: 160,
            renderCell: (params) => (
                <div className="text-sm text-gray-600">{params.row.storageName ?? 'Sin almacén'}</div>
            ),
        },
        {
            field: 'purchaseOrderNumber',
            headerName: 'Orden de Compra',
            flex: 0.9,
            minWidth: 140,
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
            flex: 0.6,
            minWidth: 100,
            align: 'center',
            renderCell: (params) => <div className="text-sm font-medium">{params.row.lineCount}</div>,
        },
        {
            field: 'total',
            headerName: 'Total',
            flex: 0.8,
            minWidth: 130,
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
            flex: 0.7,
            minWidth: 120,
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
            flex: 0.8,
            minWidth: 140,
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
            flex: 0.8,
            minWidth: 150,
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
