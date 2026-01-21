'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import DataGrid, { type DataGridColumn } from '@/baseComponents/DataGrid/DataGrid';
import Select, { type Option } from '@/baseComponents/Select/Select';
import { TextField } from '@/baseComponents/TextField/TextField';
import Badge from '@/baseComponents/Badge/Badge';
import { useAlert } from '@/globalstate/alert/useAlert';
import { 
    listAccountsReceivable, 
    type AccountsReceivableQuota, 
    type AccountsReceivableFilters 
} from '@/actions/accountsReceivable';
import { formatDateTime } from '@/lib/dateTimeUtils';

const currencyFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  PAID: 'Pagado',
  OVERDUE: 'Vencido',
};

const STATUS_BADGE_VARIANT: Record<string, 'warning' | 'success' | 'error' | 'secondary'> = {
  PENDING: 'warning',
  PAID: 'success',
  OVERDUE: 'error',
};

const AccountsReceivableDataGrid = () => {
    const { error } = useAlert();
    const [rows, setRows] = useState<AccountsReceivableQuota[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [totalRows, setTotalRows] = useState<number>(0);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const pageSize = 50;

    const [filters, setFilters] = useState<AccountsReceivableFilters>({
        search: '',
        includePaid: false,
    });

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const response = await listAccountsReceivable({
                filters,
                page: currentPage,
                pageSize,
            });
            setRows(response.rows);
            setTotalRows(response.total); // Nota: total de transacciones, no cuotas
        } catch (err) {
            console.error('Error loading accounts receivable:', err);
            error('No se pudieron cargar las cuentas por cobrar');
        } finally {
            setLoading(false);
        }
    }, [filters, currentPage, error]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const handleFilterChange = (key: keyof AccountsReceivableFilters, value: any) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setCurrentPage(1);
    };

    const columns: DataGridColumn[] = useMemo(() => [
        {
            field: 'documentNumber',
            headerName: 'Venta/Ref',
            width: 160,
            renderCell: ({ value }) => (
                <span className="font-mono text-sm text-neutral-800">{value ?? '—'}</span>
            ),
        },
        {
            field: 'customerName',
            headerName: 'Cliente',
            width: 220,
            renderCell: ({ value }) => (
                <span className="font-medium text-neutral-900">{value ?? 'Consumidor Final'}</span>
            ),
        },
        {
            field: 'quotaNumber',
            headerName: 'Cuota',
            width: 100,
            renderCell: ({ row }) => (
                <span className="text-sm font-semibold text-neutral-600">
                    {row.quotaNumber} / {row.totalQuotas}
                </span>
            ),
        },
        {
            field: 'dueDate',
            headerName: 'Vencimiento',
            width: 140,
            renderCell: ({ value }) => (
                <span className="text-sm">{value as string}</span>
            ),
        },
        {
            field: 'quotaAmount',
            headerName: 'Monto Cuota',
            width: 140,
            align: 'right',
            renderCell: ({ value }) => (
                <span className="font-semibold text-neutral-900">
                    {currencyFormatter.format(value as number)}
                </span>
            ),
        },
        {
            field: 'status',
            headerName: 'Estado',
            width: 130,
            renderCell: ({ value }) => (
                <Badge variant={STATUS_BADGE_VARIANT[value as string] ?? 'secondary'}>
                    {STATUS_LABEL[value as string] ?? value}
                </Badge>
            ),
        },
        {
            field: 'createdAt',
            headerName: 'Fecha Venta',
            width: 180,
            renderCell: ({ value }) => (
                <span className="text-xs text-neutral-500">{formatDateTime(value as string)}</span>
            ),
        },
    ], []);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-4 items-end bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
                <div className="w-full md:w-80">
                    <TextField
                        label="Buscar por documento o cliente"
                        placeholder="Ej: PAY-VENTA-123 o Juan Perez..."
                        value={filters.search ?? ''}
                        onChange={(val) => handleFilterChange('search', val)}
                    />
                </div>
            </div>

            <DataGrid
                rows={rows}
                columns={columns}
                totalRows={totalRows}
            />
        </div>
    );
};

export default AccountsReceivableDataGrid;
