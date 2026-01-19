'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import DataGrid, { type DataGridColumn } from '@/baseComponents/DataGrid/DataGrid';
import Select, { type Option } from '@/baseComponents/Select/Select';
import { TextField } from '@/baseComponents/TextField/TextField';
import IconButton from '@/baseComponents/IconButton/IconButton';
import Badge from '@/baseComponents/Badge/Badge';
import { Button } from '@/baseComponents/Button/Button';
import Dialog from '@/baseComponents/Dialog/Dialog';
import DotProgress from '@/baseComponents/DotProgress/DotProgress';
import { useAlert } from '@/globalstate/alert/useAlert';
import {
  listSaleTransactions,
  type SalesTransactionListItem,
  type SalesTransactionFilters,
  getSaleTransactionDetail,
  type SaleTransactionDetail,
} from '@/actions/transactions';
import { TransactionStatus, PaymentMethod } from '@/data/entities/Transaction';
import { formatDateTime } from '@/lib/dateTimeUtils';

const currencyFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const quantityFormatter = new Intl.NumberFormat('es-CL', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
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
  [PaymentMethod.INTERNAL_CREDIT]: 'Crédito interno',
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
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState<SaleTransactionDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

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

  const handleCloseDetail = useCallback(() => {
    setDetailDialogOpen(false);
    setDetailData(null);
    setDetailError(null);
  }, []);

  const handleOpenDetail = useCallback((transactionId: string) => {
    if (!transactionId) {
      return;
    }

    setDetailDialogOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setDetailData(null);

    void getSaleTransactionDetail(transactionId)
      .then((detail) => {
        if (!detail) {
          setDetailError('No se encontró el detalle de la venta.');
          return;
        }
        setDetailData(detail);
      })
      .catch((err) => {
        console.error('Error loading sale transaction detail:', err);
        setDetailError('No se pudo cargar el detalle de la venta.');
      })
      .finally(() => {
        setDetailLoading(false);
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
        const formatted = formatDateTime(date);
        return (
          <div className="flex flex-col text-sm">
            <span className="font-medium text-neutral-900">{formatted}</span>
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
      align: 'left',
      headerAlign: 'left',
      renderCell: ({ value }) => (
        <span className="text-sm font-semibold text-neutral-900">{currencyFormatter.format(Number(value ?? 0))}</span>
      ),
    },
    {
      field: 'taxAmount',
      headerName: 'IVA',
      width: 120,
      align: 'left',
      headerAlign: 'left',
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
    {
      field: 'actions',
      headerName: '',
      width: 72,
      align: 'left',
      headerAlign: 'left',
      renderCell: ({ row }) => (
        <IconButton
          icon="more_horiz"
          variant="ghost"
          size="sm"
          ariaLabel="Ver detalle de venta"
          onClick={() => handleOpenDetail(row.id)}
        />
      ),
    },
  ], [handleOpenDetail]);

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
      <div className="flex w-full gap-3">
        <TextField
          label="Desde"
          type="date"
          value={filters.dateFrom}
          onChange={(event) => handleFilterChange('dateFrom', event.target.value)}
          className="flex-1"
        />
        <TextField
          label="Hasta"
          type="date"
          value={filters.dateTo}
          onChange={(event) => handleFilterChange('dateTo', event.target.value)}
          className="flex-1"
        />
      </div>
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
    <>
      <DataGrid
        title=""
        columns={columns}
        rows={rows}
        totalRows={rows.length}
        height="70vh"
        headerActions={headerActions}
      />

      <Dialog
        open={detailDialogOpen}
        onClose={handleCloseDetail}
        title="Detalle de venta"
        size="xl"
        scroll="paper"
        fullWidth
        showCloseButton
      >
        {detailLoading && (
          <div className="flex justify-center py-10">
            <DotProgress />
          </div>
        )}

        {!detailLoading && detailError && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {detailError}
          </div>
        )}

        {!detailLoading && !detailError && detailData && (
          <div className="space-y-6 text-sm">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Documento</span>
                  <span className="font-semibold text-neutral-900">{detailData.documentNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Fecha</span>
                  <span className="font-medium text-neutral-900">
                    {(() => {
                      const date = new Date(detailData.createdAt);
                      return Number.isNaN(date.getTime()) ? '—' : formatDateTime(date);
                    })()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Estado</span>
                  <Badge variant={STATUS_BADGE_VARIANT[detailData.status] ?? 'secondary'}>
                    {STATUS_LABEL[detailData.status] ?? detailData.status}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <span className="text-neutral-500">Cliente</span>
                  <div className="font-medium text-neutral-900">
                    {detailData.customerName ?? 'Venta de mostrador'}
                  </div>
                  {(detailData.customerDocument || detailData.customerEmail) && (
                    <div className="text-xs text-neutral-500 space-y-0.5">
                      {detailData.customerDocument && <div>Documento: {detailData.customerDocument}</div>}
                      {detailData.customerEmail && <div>Correo: {detailData.customerEmail}</div>}
                    </div>
                  )}
                </div>
                {detailData.externalReference && (
                  <div className="space-y-1">
                    <span className="text-neutral-500">Referencia externa</span>
                    <div className="font-medium text-neutral-900">{detailData.externalReference}</div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Pago</span>
                  <span className="font-medium text-neutral-900">
                    {detailData.paymentMethod ? paymentMethodLabels[detailData.paymentMethod] ?? detailData.paymentMethod : 'Sin método registrado'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Sucursal</span>
                  <span className="font-medium text-neutral-900">{detailData.branchName ?? '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Caja / Punto de venta</span>
                  <span className="font-medium text-neutral-900">{detailData.pointOfSaleName ?? '—'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-neutral-500">Registrado por</span>
                  <div className="font-medium text-neutral-900">{detailData.userFullName ?? detailData.userName ?? 'Usuario sin alias'}</div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-neutral-500">
                    <th className="py-2 pr-3">Producto</th>
                    <th className="py-2 pr-3 text-right">Cantidad</th>
                    <th className="py-2 pr-3 text-right">Precio neto</th>
                    <th className="py-2 pr-3 text-right">Subtotal</th>
                    <th className="py-2 pr-3 text-right">IVA</th>
                    <th className="py-2 pr-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {detailData.lines.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-sm text-neutral-500">
                        Sin líneas de detalle.
                      </td>
                    </tr>
                  ) : (
                    detailData.lines.map((line) => (
                      <tr key={line.id} className="border-b border-border/70 align-top">
                        <td className="py-3 pr-3">
                          <div className="font-medium text-neutral-900">{line.productName}</div>
                          <div className="text-xs text-neutral-500">SKU {line.productSku}</div>
                          {line.variantName && (
                            <div className="text-xs text-neutral-500">{line.variantName}</div>
                          )}
                          {line.unitOfMeasure && (
                            <div className="text-xs text-neutral-500">Unidad: {line.unitOfMeasure}</div>
                          )}
                        </td>
                        <td className="py-3 pr-3 text-right text-neutral-900">
                          {quantityFormatter.format(line.quantity)}
                        </td>
                        <td className="py-3 pr-3 text-right text-neutral-900">
                          {currencyFormatter.format(line.unitPrice)}
                        </td>
                        <td className="py-3 pr-3 text-right text-neutral-900">
                          {currencyFormatter.format(line.subtotal)}
                        </td>
                        <td className="py-3 pr-3 text-right text-neutral-900">
                          {currencyFormatter.format(line.taxAmount)}
                          {line.taxRate > 0 && (
                            <span className="ml-1 text-xs text-neutral-500">({line.taxRate}%)</span>
                          )}
                        </td>
                        <td className="py-3 pr-3 text-right font-semibold text-neutral-900">
                          {currencyFormatter.format(line.total)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="space-y-2 rounded-md border border-border/60 bg-muted/30 p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-neutral-600">Subtotal</span>
                <span className="font-medium text-neutral-900">{currencyFormatter.format(detailData.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-600">IVA</span>
                <span className="font-medium text-neutral-900">{currencyFormatter.format(detailData.taxAmount)}</span>
              </div>
              {detailData.discountAmount > 0 && (
                <div className="flex items-center justify-between text-neutral-600">
                  <span>Descuento</span>
                  <span>-{currencyFormatter.format(detailData.discountAmount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-border/60 pt-2 text-base font-semibold text-neutral-900">
                <span>Total</span>
                <span>{currencyFormatter.format(detailData.total)}</span>
              </div>
            </div>

            {detailData.notes && detailData.notes.trim().length > 0 && (
              <div className="space-y-1 text-sm">
                <span className="text-neutral-500">Notas</span>
                <p className="whitespace-pre-line rounded-md border border-border/50 bg-background p-3 text-neutral-800">
                  {detailData.notes.trim()}
                </p>
              </div>
            )}
          </div>
        )}
      </Dialog>
    </>
  );
};

export default SalesTransactionsDataGrid;
