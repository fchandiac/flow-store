'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import DataGrid, { type DataGridColumn } from '@/baseComponents/DataGrid/DataGrid';
import Select, { type Option } from '@/baseComponents/Select/Select';
import { TextField } from '@/baseComponents/TextField/TextField';
import IconButton from '@/baseComponents/IconButton/IconButton';
import Badge from '@/baseComponents/Badge/Badge';
import { Button } from '@/baseComponents/Button/Button';
import { useAlert } from '@/globalstate/alert/useAlert';
import {
  listSaleTransactions,
  type SalesTransactionListItem,
  type SalesTransactionFilters,
} from '@/actions/transactions';
import { TransactionStatus, PaymentMethod } from '@/data/entities/Transaction';

const currencyFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const dateTimeFormatter = new Intl.DateTimeFormat('es-CL', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

type StatusFilterOption = 'ALL' | TransactionStatus;

type FiltersState = {
  status: StatusFilterOption;
  paymentMethod: PaymentMethod | 'ALL';
  dateFrom: string;
  dateTo: string;
  search: string;
};

const statusOptions: Option[] = [
  { id: 'ALL', label: 'Todas' },
  { id: TransactionStatus.CONFIRMED, label: 'Confirmadas' },
  { id: TransactionStatus.DRAFT, label: 'Borradores' },
  { id: TransactionStatus.CANCELLED, label: 'Anuladas' },
];

const paymentMethodLabels: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: 'Efectivo',
  [PaymentMethod.CREDIT_CARD]: 'Tarjeta crédito',
  [PaymentMethod.DEBIT_CARD]: 'Tarjeta débito',
  [PaymentMethod.TRANSFER]: 'Transferencia',
  [PaymentMethod.CHECK]: 'Cheque',
  [PaymentMethod.CREDIT]: 'Crédito',
  [PaymentMethod.MIXED]: 'Pago mixto',
};

const paymentMethodOptions: Option[] = [
  { id: 'ALL', label: 'Todos los métodos' },
  ...Object.values(PaymentMethod).map((method) => ({
    id: method,
    label: paymentMethodLabels[method] ?? method,
  })),
];

const STATUS_BADGE_VARIANT: Record<TransactionStatus, 'success' | 'warning' | 'error' | 'secondary'> = {
  [TransactionStatus.CONFIRMED]: 'success',
  [TransactionStatus.DRAFT]: 'warning',
  [TransactionStatus.PARTIALLY_RECEIVED]: 'warning',
  [TransactionStatus.RECEIVED]: 'success',
  [TransactionStatus.CANCELLED]: 'error',
};

const STATUS_LABEL: Record<TransactionStatus, string> = {
  [TransactionStatus.CONFIRMED]: 'Confirmada',
  [TransactionStatus.DRAFT]: 'Borrador',
  [TransactionStatus.PARTIALLY_RECEIVED]: 'Recepción parcial',
  [TransactionStatus.RECEIVED]: 'Recepcionada',
  [TransactionStatus.CANCELLED]: 'Anulada',
};

const mapFiltersToParams = (filters: FiltersState): SalesTransactionFilters => ({
  status: filters.status === 'ALL' ? undefined : filters.status,
  paymentMethod: filters.paymentMethod === 'ALL' ? undefined : filters.paymentMethod,
  dateFrom: filters.dateFrom || undefined,
  dateTo: filters.dateTo || undefined,
  search: filters.search.trim() || undefined,
});

const SalesTransactionsDataGrid = () => {
  const { error } = useAlert();
  const [rows, setRows] = useState<SalesTransactionListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [filters, setFilters] = useState<FiltersState>({
    status: 'ALL',
    paymentMethod: 'ALL',
    dateFrom: '',
    dateTo: '',
    search: '',
  });

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listSaleTransactions({
        filters: mapFiltersToParams(filters),
        page: 1,
        pageSize: 50,
      });
      setRows(response.rows);
    } catch (err) {
      console.error('Error loading sales transactions:', err);
      error('No se pudieron cargar las transacciones de ventas');
    } finally {
      setLoading(false);
    }
  }, [filters, error]);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  const handleFilterChange = useCallback(<Key extends keyof FiltersState>(key: Key, value: FiltersState[Key]) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters({
      status: 'ALL',
      paymentMethod: 'ALL',
      dateFrom: '',
      dateTo: '',
      search: '',
    });
  }, []);

  const columns: DataGridColumn[] = useMemo(() => [
    {
      field: 'documentNumber',
      headerName: 'Documento',
      width: 160,
      renderCell: ({ value }) => (
        <span className="font-mono text-sm text-neutral-800">{value ?? '—'}</span>
      ),
    },
    {
      field: 'createdAt',
      headerName: 'Fecha',
      width: 190,
      renderCell: ({ value }) => {
        if (!value) return <span className="text-xs text-neutral-500">—</span>;
        const date = new Date(value as string);
        if (Number.isNaN(date.getTime())) {
          return <span className="text-xs text-neutral-500">—</span>;
        }
        return (
          <div className="flex flex-col text-sm">
            <span className="font-medium text-neutral-900">{dateTimeFormatter.format(date)}</span>
            <span className="text-xs text-neutral-500">{date.toISOString().slice(0, 10)}</span>
          </div>
        );
      },
    },
    {
      field: 'customerName',
      headerName: 'Cliente',
      flex: 1,
      minWidth: 200,
      renderCell: ({ value }) => (
        <span className="text-sm text-neutral-800">{value ?? 'Sin cliente'}</span>
      ),
    },
    {
      field: 'total',
      headerName: 'Total',
      width: 140,
      align: 'right',
      headerAlign: 'right',
      renderCell: ({ value }) => (
        <span className="text-sm font-semibold text-neutral-900">{currencyFormatter.format(Number(value ?? 0))}</span>
      ),
    },
    {
      field: 'taxAmount',
      headerName: 'IVA',
      width: 120,
      align: 'right',
      headerAlign: 'right',
      renderCell: ({ value }) => (
        <span className="text-sm text-neutral-800">{currencyFormatter.format(Number(value ?? 0))}</span>
      ),
    },
    {
      field: 'paymentMethod',
      headerName: 'Método pago',
      width: 160,
      renderCell: ({ value }) => {
        if (!value) {
          return <span className="text-xs text-neutral-500">Sin método</span>;
        }
        const label = paymentMethodLabels[value as PaymentMethod] ?? String(value);
        return <span className="text-sm text-neutral-800">{label}</span>;
      },
    },
    {
      field: 'pointOfSaleName',
      headerName: 'Caja / Sucursal',
      flex: 1,
      minWidth: 220,
      renderCell: ({ row }) => (
        <div className="flex flex-col text-sm">
          <span className="font-medium text-neutral-900">{row.pointOfSaleName ?? 'Sin punto de venta'}</span>
          {row.branchName && <span className="text-xs text-neutral-500">{row.branchName}</span>}
        </div>
      ),
    },
    {
      field: 'status',
      headerName: 'Estado',
      width: 140,
      renderCell: ({ value }) => {
        const status = (value as TransactionStatus) ?? TransactionStatus.DRAFT;
        const variant = STATUS_BADGE_VARIANT[status] ?? 'secondary';
        return <Badge variant={variant}>{STATUS_LABEL[status] ?? status}</Badge>;
      },
    },
    {
      field: 'userFullName',
      headerName: 'Registrado por',
      width: 200,
      renderCell: ({ row }) => {
        const name = row.userFullName ?? row.userName ?? 'Usuario sin alias';
        return (
          <div className="flex flex-col text-sm">
            <span className="font-medium text-neutral-900">{name}</span>
            {row.userId && <span className="text-xs text-neutral-500">ID {row.userId.slice(0, 6)}</span>}
          </div>
        );
      },
    },
    {
      field: 'notes',
      headerName: 'Notas',
      flex: 1,
      minWidth: 220,
      renderCell: ({ value }) => {
        const notes = typeof value === 'string' ? value.trim() : '';
        return (
          <span className="text-sm text-neutral-700">
            {notes.length > 0 ? notes : '—'}
          </span>
        );
      },
    },
  ], []);

  const headerActions = (
    <div className="flex flex-wrap items-end gap-3">
      <Select
        label="Estado"
        options={statusOptions}
        value={filters.status}
        onChange={(value) => handleFilterChange('status', (value ?? 'ALL') as StatusFilterOption)}
        allowClear
        className="min-w-[180px]"
      />
      <Select
        label="Método de pago"
        options={paymentMethodOptions}
        value={filters.paymentMethod}
        onChange={(value) => handleFilterChange('paymentMethod', (value ?? 'ALL') as FiltersState['paymentMethod'])}
        allowClear
        className="min-w-[200px]"
      />
      <TextField
        label="Desde"
        type="date"
        value={filters.dateFrom}
        onChange={(event) => handleFilterChange('dateFrom', event.target.value)}
        className="w-40"
      />
      <TextField
        label="Hasta"
        type="date"
        value={filters.dateTo}
        onChange={(event) => handleFilterChange('dateTo', event.target.value)}
        className="w-40"
      />
      <TextField
        label="Buscar"
        value={filters.search}
        onChange={(event) => handleFilterChange('search', event.target.value)}
        placeholder="Documento o referencia"
        className="min-w-[220px]"
      />
      <IconButton
        icon="refresh"
        variant="ghost"
        size="sm"
        ariaLabel="Actualizar transacciones"
        onClick={() => void loadTransactions()}
        isLoading={loading}
      />
      <Button type="button" variant="text" size="sm" onClick={handleResetFilters}>
        Limpiar filtros
      </Button>
    </div>
  );

  return (
    <DataGrid
      title="Transacciones de venta"
      columns={columns}
      rows={rows}
      totalRows={rows.length}
      height="70vh"
      headerActions={headerActions}
      showBorder
    />
  );
};

export default SalesTransactionsDataGrid;
