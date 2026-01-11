import { getTransactions } from '@/app/actions/transactions';
import Badge from '@/app/baseComponents/Badge/Badge';
import DataGrid from '@/app/baseComponents/DataGrid/DataGrid';
import type { DataGridColumn } from '@/app/baseComponents/DataGrid/DataGrid';

/**
 * Tabla compacta de transacciones recientes
 */
export default async function TransactionsTable() {
    const { data } = await getTransactions({ limit: 25 });

    const columns: DataGridColumn[] = [
        {
            field: 'documentNumber',
            headerName: 'Documento',
            minWidth: 160,
        },
        {
            field: 'transactionType',
            headerName: 'Tipo',
            renderCell: ({ value }) => typeof value === 'string' ? value.replace('_', ' ') : '—',
        },
        {
            field: 'total',
            headerName: 'Total',
            type: 'number',
            align: 'right',
            headerAlign: 'right',
            renderCell: ({ value }) => typeof value === 'number'
                ? value.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
                : '—',
        },
        {
            field: 'status',
            headerName: 'Estado',
            renderCell: ({ value }) => (
                <Badge variant={value === 'CONFIRMED' ? 'success' : 'warning'}>
                    {value === 'CONFIRMED' ? 'Confirmada' : 'Borrador'}
                </Badge>
            ),
        },
        {
            field: 'createdAt',
            headerName: 'Fecha',
            minWidth: 180,
            renderCell: ({ value }) => value ? new Date(value).toLocaleString('es-MX') : '—',
        },
    ];

    if (!data.length) {
        return (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-sm text-muted-foreground">
                <span className="material-symbols-outlined text-4xl text-neutral-300">receipt_long</span>
                <div>
                    <p className="font-medium text-foreground">Sin transacciones por ahora</p>
                    <p>Las operaciones confirmadas aparecerán aquí.</p>
                </div>
            </div>
        );
    }

    return (
        <DataGrid
            rows={data}
            columns={columns}
            title="Transacciones recientes"
        />
    );
}
