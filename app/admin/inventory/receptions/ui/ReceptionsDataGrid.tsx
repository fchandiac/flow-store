'use client';

import { useCallback, useEffect, useState } from 'react';
import DataGrid, {
    type Column,
    type FilterDef,
} from '@/app/baseComponents/DataGrid/DataGrid';
import Badge from '@/app/baseComponents/Badge/Badge';
import { getReceptions, type ReceptionListItem } from '@/app/actions/receptions';

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

const statusLabels: Record<string, string> = {
    DRAFT: 'Borrador',
    CONFIRMED: 'Confirmada',
    CANCELLED: 'Cancelada',
};

const statusColors: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
    DRAFT: 'warning',
    CONFIRMED: 'success',
    CANCELLED: 'error',
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

    const columns: Column<ReceptionListItem>[] = [
        {
            key: 'documentNumber',
            label: 'Número',
            width: 140,
            render: (row) => (
                <div className="font-mono text-sm font-medium">{row.documentNumber}</div>
            ),
        },
        {
            key: 'createdAt',
            label: 'Fecha',
            width: 160,
            render: (row) => (
                <div className="text-sm text-gray-600">
                    {dateFormatter.format(new Date(row.createdAt))}
                </div>
            ),
        },
        {
            key: 'supplierName',
            label: 'Proveedor',
            width: 200,
            render: (row) => (
                <div className="text-sm font-medium text-gray-900">
                    {row.supplierName ?? 'Sin proveedor'}
                </div>
            ),
        },
        {
            key: 'storageName',
            label: 'Bodega',
            width: 160,
            render: (row) => (
                <div className="text-sm text-gray-600">{row.storageName ?? 'Sin bodega'}</div>
            ),
        },
        {
            key: 'purchaseOrderNumber',
            label: 'Orden de Compra',
            width: 140,
            render: (row) =>
                row.purchaseOrderNumber ? (
                    <div className="font-mono text-sm text-blue-600">{row.purchaseOrderNumber}</div>
                ) : (
                    <Badge color="default" size="sm">
                        Directa
                    </Badge>
                ),
        },
        {
            key: 'lineCount',
            label: 'Productos',
            width: 100,
            align: 'center',
            render: (row) => <div className="text-sm font-medium">{row.lineCount}</div>,
        },
        {
            key: 'total',
            label: 'Total',
            width: 130,
            align: 'right',
            render: (row) => (
                <div className="text-sm font-semibold text-gray-900">
                    {currencyFormatter.format(row.total)}
                </div>
            ),
        },
        {
            key: 'status',
            label: 'Estado',
            width: 120,
            render: (row) => (
                <Badge color={statusColors[row.status] ?? 'default'} size="sm">
                    {statusLabels[row.status] ?? row.status}
                </Badge>
            ),
        },
        {
            key: 'hasDiscrepancies',
            label: 'Discrepancias',
            width: 120,
            render: (row) =>
                row.hasDiscrepancies ? (
                    <Badge color="warning" size="sm">
                        Con diferencias
                    </Badge>
                ) : (
                    <Badge color="success" size="sm">
                        Sin diferencias
                    </Badge>
                ),
        },
        {
            key: 'userName',
            label: 'Usuario',
            width: 150,
            render: (row) => <div className="text-sm text-gray-600">{row.userName ?? '-'}</div>,
        },
    ];

    const filterDefs: FilterDef[] = [
        {
            key: 'search',
            label: 'Buscar',
            type: 'text',
            placeholder: 'Buscar por número...',
        },
    ];

    return (
        <div className="h-full flex flex-col bg-gray-50">
            <DataGrid
                columns={columns}
                data={data}
                loading={loading}
                filterDefs={filterDefs}
                onFiltersChange={setFilters}
                onRefresh={loadReceptions}
                emptyMessage="No hay recepciones registradas"
            />
        </div>
    );
}
