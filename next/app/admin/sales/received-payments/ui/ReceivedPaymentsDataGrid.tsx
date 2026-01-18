'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import DataGrid, { type DataGridColumn } from '@/baseComponents/DataGrid/DataGrid';
import Select, { type Option } from '@/baseComponents/Select/Select';
import { TextField } from '@/baseComponents/TextField/TextField';
import IconButton from '@/baseComponents/IconButton/IconButton';
import { Button } from '@/baseComponents/Button/Button';
import { useAlert } from '@/globalstate/alert/useAlert';
import {
  listReceivedPayments,
  type ReceivedPaymentListItem,
} from '@/actions/receivedPayments';
import { getPointsOfSale } from '@/actions/pointsOfSale';
import { PaymentMethod } from '@/data/entities/Transaction';
import { formatDateTime } from '@/lib/dateTimeUtils';

const currencyFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: 'Efectivo',
  [PaymentMethod.CREDIT_CARD]: 'Tarjeta crédito',
  [PaymentMethod.DEBIT_CARD]: 'Tarjeta débito',
  [PaymentMethod.TRANSFER]: 'Transferencia',
  [PaymentMethod.CHECK]: 'Cheque',
  [PaymentMethod.CREDIT]: 'Crédito',
  [PaymentMethod.MIXED]: 'Mixto',
};

interface FilterState {
  dateFrom: string;
  dateTo: string;
  paymentMethod: PaymentMethod | null;
  pointOfSaleId: string | null;
  cashSessionId: string | null;
}

interface ReceivedPaymentRow extends ReceivedPaymentListItem {
  cashSessionRef?: string | null;
}

const paymentMethodOptions: Option[] = Object.values(PaymentMethod).map((method) => ({
  id: method,
  label: PAYMENT_METHOD_LABELS[method] ?? method,
}));

const buildCashSessionLabel = (row: ReceivedPaymentRow): string | null => {
  const metadata = row.metadata ?? {};
  if (metadata && typeof metadata === 'object') {
    const ref = (metadata as Record<string, unknown>).cashSessionRef;
    if (typeof ref === 'string' && ref.trim().length > 0) {
      return ref;
    }
  }
  if (row.cashSessionNotes) {
    return row.cashSessionNotes;
  }
  if (row.cashSessionId) {
    return `Sesión ${row.cashSessionId.slice(0, 8)}`;
  }
  return null;
};

const getUserLabel = (row: ReceivedPaymentListItem): string => {
  if (row.userFullName && row.userFullName.trim().length > 0) {
    return row.userFullName;
  }
  return row.userName ?? 'Usuario sin alias';
};

const mapPointOfSaleOptions = (entries: Array<{ id: string; name: string; branch?: { name?: string | null } | null }>): Option[] =>
  entries.map((pos) => ({
    id: pos.id,
    label: pos.branch?.name ? `${pos.name} · ${pos.branch.name}` : pos.name,
  }));

const ReceivedPaymentsDataGrid = () => {
  const searchParams = useSearchParams();
  const { error } = useAlert();

  const [rows, setRows] = useState<ReceivedPaymentRow[]>([]);
  const [totalRows, setTotalRows] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [pointOfSaleOptions, setPointOfSaleOptions] = useState<Option[]>([]);

  const cashSessionIdFromQuery = searchParams.get('cashSessionId');
  const searchTerm = searchParams.get('search')?.trim() ?? '';
  const page = Number.parseInt(searchParams.get('page') ?? '1', 10) || 1;
  const limit = Number.parseInt(searchParams.get('limit') ?? '25', 10) || 25;

  const [filters, setFilters] = useState<FilterState>({
    dateFrom: '',
    dateTo: '',
    paymentMethod: null,
    pointOfSaleId: null,
    cashSessionId: cashSessionIdFromQuery,
  });

  const cashSessionQueryRef = useRef<string | null>(cashSessionIdFromQuery);

  useEffect(() => {
    if (cashSessionIdFromQuery !== cashSessionQueryRef.current) {
      cashSessionQueryRef.current = cashSessionIdFromQuery;
      setFilters((prev) => ({
        ...prev,
        cashSessionId: cashSessionIdFromQuery,
      }));
    }
  }, [cashSessionIdFromQuery]);

  const loadPointsOfSale = useCallback(async () => {
    try {
      const result = await getPointsOfSale({ includeInactive: false });
      setPointOfSaleOptions(mapPointOfSaleOptions(result));
    } catch (err) {
      console.error('Error loading points of sale:', err);
      error('No se pudieron cargar los puntos de venta');
    }
  }, [error]);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listReceivedPayments({
        page,
        pageSize: limit,
        filters: {
          dateFrom: filters.dateFrom || undefined,
          dateTo: filters.dateTo || undefined,
          paymentMethod: filters.paymentMethod ?? undefined,
          pointOfSaleId: filters.pointOfSaleId ?? undefined,
          cashSessionId: filters.cashSessionId ?? undefined,
          search: searchTerm || undefined,
        },
      });

      const mappedRows: ReceivedPaymentRow[] = response.rows.map((row) => ({
        ...row,
        cashSessionRef: buildCashSessionLabel(row),
      }));

      setRows(mappedRows);
      setTotalRows(response.total);
    } catch (err) {
      console.error('Error loading received payments:', err);
      error('No se pudieron cargar los pagos recibidos');
    } finally {
      setLoading(false);
    }
  }, [page, limit, filters, searchTerm, error]);

  useEffect(() => {
    void loadPointsOfSale();
  }, [loadPointsOfSale]);

  useEffect(() => {
    void loadPayments();
  }, [loadPayments]);

  const handleFilterChange = useCallback(<Key extends keyof FilterState>(key: Key, value: FilterState[Key]) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      paymentMethod: null,
      pointOfSaleId: null,
      cashSessionId: cashSessionIdFromQuery,
    });
  }, [cashSessionIdFromQuery]);

  const columns: DataGridColumn[] = useMemo(() => [
    {
      field: 'createdAt',
      headerName: 'Fecha',
      width: 190,
      renderCell: ({ value }) => {
        if (!value) return '-';
        const date = new Date(value as string);
        if (Number.isNaN(date.getTime())) {
          return '-';
        }
        const formatted = formatDateTime(date);
        return (
          <div className="flex flex-col text-sm">
            <span className="font-medium text-neutral-900">{formatted}</span>
          </div>
        );
      },
    },
    {
      field: 'documentNumber',
      headerName: 'Documento',
      width: 150,
      renderCell: ({ value }) => (
        <span className="font-mono text-sm text-neutral-800">{value}</span>
      ),
    },
    {
      field: 'total',
      headerName: 'Monto',
      width: 140,
      align: 'right',
      headerAlign: 'right',
      renderCell: ({ row }) => (
        <div className="flex flex-col items-end text-sm">
          <span className="font-semibold text-neutral-900">{currencyFormatter.format(Number(row.total ?? 0))}</span>
          {Number(row.amountPaid ?? 0) !== Number(row.total ?? 0) && (
            <span className="text-xs text-neutral-500">
              Pagado {currencyFormatter.format(Number(row.amountPaid ?? 0))}
            </span>
          )}
        </div>
      ),
    },
    {
      field: 'paymentMethod',
      headerName: 'Método',
      width: 150,
      renderCell: ({ value }) => {
        if (!value) return <span className="text-neutral-500">Sin método</span>;
        const label = PAYMENT_METHOD_LABELS[value as PaymentMethod] ?? String(value);
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
          {row.branchName && (
            <span className="text-xs text-neutral-500">{row.branchName}</span>
          )}
        </div>
      ),
    },
    {
      field: 'cashSessionRef',
      headerName: 'Sesión de caja',
      flex: 1,
      minWidth: 220,
      renderCell: ({ row }) => {
        const label = (row as ReceivedPaymentRow).cashSessionRef;
        if (!label) {
          return <span className="text-xs text-neutral-500">Sin sesión vinculada</span>;
        }
        return (
          <div className="flex flex-col text-sm">
            <span className="font-medium text-neutral-900">{label}</span>
            {row.cashSessionOpenedAt && (
              <span className="text-xs text-neutral-500">
                Apertura {formatDateTime(row.cashSessionOpenedAt)}
              </span>
            )}
          </div>
        );
      },
    },
    {
      field: 'userFullName',
      headerName: 'Registrado por',
      width: 200,
      renderCell: ({ row }) => (
        <div className="flex flex-col text-sm">
          <span className="font-medium text-neutral-900">{getUserLabel(row as ReceivedPaymentListItem)}</span>
          <span className="text-xs text-neutral-500">ID {row.userId.slice(0, 6)}</span>
        </div>
      ),
    },
    {
      field: 'notes',
      headerName: 'Notas',
      flex: 1,
      minWidth: 240,
      renderCell: ({ value }) => (
        <span className="text-sm text-neutral-700">
          {value && String(value).trim().length > 0 ? value : '—'}
        </span>
      ),
    },
  ], []);

  const headerActions = (
    <div className="flex flex-wrap items-end gap-3">
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
      <Select
        label="Método"
        options={paymentMethodOptions}
        value={filters.paymentMethod}
        onChange={(value) => handleFilterChange('paymentMethod', value ? (value as PaymentMethod) : null)}
        allowClear
        className="min-w-[180px]"
      />
      <Select
        label="Punto de venta"
        options={pointOfSaleOptions}
        value={filters.pointOfSaleId}
        onChange={(value) => handleFilterChange('pointOfSaleId', value ? String(value) : null)}
        allowClear
        className="min-w-[220px]"
      />
      <TextField
        label="Sesión"
        value={filters.cashSessionId ?? ''}
        onChange={(event) => handleFilterChange('cashSessionId', event.target.value.trim() || null)}
        placeholder="ID sesión"
        className="w-48"
      />
      <IconButton
        icon="refresh"
        variant="ghost"
        size="sm"
        ariaLabel="Actualizar"
        onClick={() => void loadPayments()}
        isLoading={loading}
      />
      <Button
        type="button"
        variant="text"
        size="sm"
        onClick={handleResetFilters}
      >
        Limpiar filtros
      </Button>
    </div>
  );

  return (
    <DataGrid
      title="Pagos recibidos"
      columns={columns}
      rows={rows}
      totalRows={totalRows}
      height="70vh"
      headerActions={headerActions}
      showBorder
    />
  );
};

export default ReceivedPaymentsDataGrid;
