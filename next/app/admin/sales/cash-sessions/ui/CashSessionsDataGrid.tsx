'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import DataGrid, { type DataGridColumn } from '@/baseComponents/DataGrid/DataGrid';
import Select, { type Option } from '@/baseComponents/Select/Select';
import IconButton from '@/baseComponents/IconButton/IconButton';
import Badge, { type BadgeVariant } from '@/baseComponents/Badge/Badge';
import { Button } from '@/baseComponents/Button/Button';
import Dialog from '@/baseComponents/Dialog/Dialog';
import { useAlert } from '@/globalstate/alert/useAlert';
import {
  listCashSessions,
  type CashSessionListItem,
  type CashSessionListFilters,
  closeCashSessionFromAdmin,
  getCashSessionMovements,
  type CashSessionMovementItem,
} from '@/actions/cashSessions';
import { CashSessionStatus } from '@/data/entities/CashSession';
import { PaymentMethod, TransactionType } from '@/data/entities/Transaction';
import { formatDateTime } from '@/lib/dateTimeUtils';

const currencyFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

type StatusFilter = 'ALL' | CashSessionStatus;

const MOVEMENT_TYPE_LABELS: Record<TransactionType, string> = {
  [TransactionType.SALE]: 'Venta',
  [TransactionType.PURCHASE]: 'Compra',
  [TransactionType.PURCHASE_ORDER]: 'Orden de compra',
  [TransactionType.SALE_RETURN]: 'Devolución de venta',
  [TransactionType.PURCHASE_RETURN]: 'Devolución de compra',
  [TransactionType.TRANSFER_OUT]: 'Transferencia salida',
  [TransactionType.TRANSFER_IN]: 'Transferencia entrada',
  [TransactionType.ADJUSTMENT_IN]: 'Ajuste positivo',
  [TransactionType.ADJUSTMENT_OUT]: 'Ajuste negativo',
  [TransactionType.PAYMENT_IN]: 'Pago recibido',
  [TransactionType.PAYMENT_OUT]: 'Pago emitido',
  [TransactionType.CASH_DEPOSIT]: 'Depósito en efectivo',
  [TransactionType.OPERATING_EXPENSE]: 'Gasto operativo',
  [TransactionType.CASH_SESSION_OPENING]: 'Apertura de caja',
  [TransactionType.CASH_SESSION_WITHDRAWAL]: 'Retiro de caja',
  [TransactionType.CASH_SESSION_DEPOSIT]: 'Ingreso de caja',
};

const PAYMENT_METHOD_LABELS: Partial<Record<PaymentMethod, string>> = {
  [PaymentMethod.CASH]: 'Efectivo',
  [PaymentMethod.CREDIT_CARD]: 'Tarjeta de crédito',
  [PaymentMethod.DEBIT_CARD]: 'Tarjeta de débito',
  [PaymentMethod.TRANSFER]: 'Transferencia',
  [PaymentMethod.CHECK]: 'Cheque',
  [PaymentMethod.CREDIT]: 'Crédito',
  [PaymentMethod.INTERNAL_CREDIT]: 'Crédito interno',
  [PaymentMethod.MIXED]: 'Pago mixto',
};

const MOVEMENT_DIRECTION_META: Record<CashSessionMovementItem['direction'], { label: string; amountClass: string }> = {
  IN: { label: 'Entrada', amountClass: 'text-emerald-600' },
  OUT: { label: 'Salida', amountClass: 'text-rose-600' },
  NEUTRAL: { label: 'Neutral', amountClass: 'text-slate-500' },
};

const statusOptions: Option[] = [
  { id: 'ALL', label: 'Todas' },
  { id: CashSessionStatus.OPEN, label: 'Abiertas' },
  { id: CashSessionStatus.CLOSED, label: 'Cerradas' },
  { id: CashSessionStatus.RECONCILED, label: 'Conciliadas' },
];

const STATUS_BADGE_META: Record<CashSessionStatus, { label: string; variant: BadgeVariant }> = {
  [CashSessionStatus.OPEN]: { label: 'Abierta', variant: 'warning' },
  [CashSessionStatus.CLOSED]: { label: 'Cerrada', variant: 'secondary' },
  [CashSessionStatus.RECONCILED]: { label: 'Conciliada', variant: 'success' },
};

const buildUserLabel = (fullName: string | null, userName: string | null): string => {
  if (fullName && fullName.trim().length > 0) {
    return fullName;
  }
  if (userName && userName.trim().length > 0) {
    return userName;
  }
  return 'Usuario desconocido';
};

const mapFilters = (status: StatusFilter): CashSessionListFilters => ({
  status: status === 'ALL' ? undefined : status,
});

const CashSessionsDataGrid = () => {
  const { error, success, warning } = useAlert();
  const [rows, setRows] = useState<CashSessionListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [closingSessionId, setClosingSessionId] = useState<string | null>(null);
  const [movementsDialogOpen, setMovementsDialogOpen] = useState(false);
  const [movementsSession, setMovementsSession] = useState<CashSessionListItem | null>(null);
  const [movements, setMovements] = useState<CashSessionMovementItem[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [movementsLoadingSessionId, setMovementsLoadingSessionId] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listCashSessions({
        filters: mapFilters(statusFilter),
      });
      setRows(response.rows);
    } catch (err) {
      console.error('Error loading cash sessions:', err);
      error('No se pudieron cargar las sesiones de caja');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, error]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const handleCloseSession = useCallback(async (sessionId: string) => {
    setClosingSessionId(sessionId);
    try {
      const result = await closeCashSessionFromAdmin(sessionId);
      if (!result.success) {
        error(result.error ?? 'No se pudo cerrar la sesión de caja');
        return;
      }

      const difference = result.difference ?? 0;
      if (Math.abs(difference) > 0.009) {
        warning(`Sesión cerrada con diferencia de ${currencyFormatter.format(difference)}`);
      } else {
        success('Sesión cerrada correctamente');
      }

      await loadSessions();
    } catch (err) {
      console.error('Error closing cash session from admin:', err);
      error('No se pudo cerrar la sesión de caja');
    } finally {
      setClosingSessionId(null);
    }
  }, [error, success, warning, loadSessions]);

  const handleStatusChange = useCallback((value: string | number | null) => {
    const nextValue = (value ?? 'ALL') as StatusFilter;
    setStatusFilter(nextValue);
  }, []);

  const handleOpenMovements = useCallback(async (session: CashSessionListItem) => {
    setMovementsSession(session);
    setMovements([]);
    setMovementsDialogOpen(true);
    setMovementsLoading(true);
    setMovementsLoadingSessionId(session.id);
    try {
      const response = await getCashSessionMovements(session.id);
      setMovements(response.movements ?? []);
    } catch (err) {
      console.error('Error fetching cash session movements:', err);
      error('No se pudieron cargar los movimientos de la sesión');
      setMovements([]);
    } finally {
      setMovementsLoading(false);
      setMovementsLoadingSessionId(null);
    }
  }, [error]);

  const handleCloseMovementsDialog = useCallback(() => {
    setMovementsDialogOpen(false);
    setMovementsSession(null);
    setMovements([]);
  }, []);

  const columns: DataGridColumn[] = useMemo(() => [
    {
      field: 'status',
      headerName: 'Estado',
      width: 140,
      renderCell: ({ value }) => {
        const status = (value as CashSessionStatus) ?? CashSessionStatus.OPEN;
        const meta = STATUS_BADGE_META[status] ?? STATUS_BADGE_META[CashSessionStatus.OPEN];
        return <Badge variant={meta.variant}>{meta.label}</Badge>;
      },
    },
    {
      field: 'pointOfSaleName',
      headerName: 'Punto de venta',
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
      field: 'openedAt',
      headerName: 'Apertura',
      width: 190,
      renderCell: ({ value }) => {
        if (!value) return <span className="text-xs text-neutral-500">—</span>;
        const date = new Date(value as string);
        if (Number.isNaN(date.getTime())) {
          return <span className="text-xs text-neutral-500">—</span>;
        }
        return (
          <div className="flex flex-col text-sm">
            <span className="font-medium text-neutral-900">{formatDateTime(date)}</span>
          </div>
        );
      },
    },
    {
      field: 'closedAt',
      headerName: 'Cierre',
      width: 190,
      renderCell: ({ value }) => {
        if (!value) {
          return <span className="text-xs text-neutral-500">Pendiente</span>;
        }
        const date = new Date(value as string);
        if (Number.isNaN(date.getTime())) {
          return <span className="text-xs text-neutral-500">—</span>;
        }
        return (
          <div className="flex flex-col text-sm">
            <span className="font-medium text-neutral-900">{formatDateTime(date)}</span>
          </div>
        );
      },
    },
    {
      field: 'openingAmount',
      headerName: 'Apertura (CLP)',
      width: 150,
      align: 'left',
      headerAlign: 'left',
      renderCell: ({ value }) => (
        <span className="text-sm font-medium text-neutral-900">{currencyFormatter.format(Number(value ?? 0))}</span>
      ),
    },
    {
      field: 'expectedAmount',
      headerName: 'Esperado',
      width: 140,
      align: 'left',
      headerAlign: 'left',
      renderCell: ({ value }) => {
        if (value === null || value === undefined) {
          return <span className="text-xs text-neutral-500">—</span>;
        }
        return <span className="text-sm text-neutral-900">{currencyFormatter.format(Number(value))}</span>;
      },
    },
    {
      field: 'closingAmount',
      headerName: 'Cierre reportado',
      width: 160,
      align: 'left',
      headerAlign: 'left',
      renderCell: ({ value }) => {
        if (value === null || value === undefined) {
          return <span className="text-xs text-neutral-500">Sin datos</span>;
        }
        return <span className="text-sm text-neutral-900">{currencyFormatter.format(Number(value))}</span>;
      },
    },
    {
      field: 'difference',
      headerName: 'Diferencia',
      width: 140,
      align: 'left',
      headerAlign: 'left',
      renderCell: ({ value }) => {
        if (value === null || value === undefined) {
          return <span className="text-xs text-neutral-500">—</span>;
        }
        const amount = Number(value);
        const color = amount === 0 ? 'text-neutral-700' : amount > 0 ? 'text-green-600' : 'text-red-600';
        return <span className={`text-sm font-semibold ${color}`}>{currencyFormatter.format(amount)}</span>;
      },
    },
    {
      field: 'openedByUserName',
      headerName: 'Apertura por',
      width: 200,
      renderCell: ({ row }) => (
        <div className="flex flex-col text-sm">
          <span className="font-medium text-neutral-900">{buildUserLabel(row.openedByFullName, row.openedByUserName)}</span>
          {row.openedById && <span className="text-xs text-neutral-500">ID {row.openedById.slice(0, 6)}</span>}
        </div>
      ),
    },
    {
      field: 'closedByUserName',
      headerName: 'Cierre por',
      width: 200,
      renderCell: ({ row }) => {
        if (!row.closedByUserName && !row.closedByFullName) {
          return <span className="text-xs text-neutral-500">Sin cierre registrado</span>;
        }
        return (
          <div className="flex flex-col text-sm">
            <span className="font-medium text-neutral-900">{buildUserLabel(row.closedByFullName, row.closedByUserName)}</span>
            {row.closedById && <span className="text-xs text-neutral-500">ID {row.closedById.slice(0, 6)}</span>}
          </div>
        );
      },
    },
    {
      field: 'actions',
      headerName: 'Acciones',
      width: 160,
      renderCell: ({ row }) => {
        const isOpen = row.status === CashSessionStatus.OPEN;
        const isClosing = closingSessionId === row.id;
        return (
          <div className="flex items-center gap-2">
            <IconButton
              icon="more_horiz"
              variant="ghost"
              size="sm"
              ariaLabel="Ver movimientos de la sesión"
              onClick={() => void handleOpenMovements(row)}
              isLoading={movementsLoadingSessionId === row.id && movementsLoading}
            />
            {isOpen && (
              <IconButton
                icon="lock"
                variant="outlined"
                size="sm"
                ariaLabel="Cerrar sesión de caja"
                onClick={() => void handleCloseSession(row.id)}
                disabled={isClosing}
                isLoading={isClosing}
              />
            )}
          </div>
        );
      },
    },
  ], [closingSessionId, handleCloseSession, handleOpenMovements, movementsLoading, movementsLoadingSessionId]);

  const headerActions = (
    <div className="flex flex-wrap items-end gap-3">
      <Select
        label="Estado"
        options={statusOptions}
        value={statusFilter}
        onChange={handleStatusChange}
        allowClear
        variant="minimal"
        className="min-w-[180px]"
      />
      <IconButton
        icon="refresh"
        variant="ghost"
        size="sm"
        ariaLabel="Actualizar sesiones"
        onClick={() => void loadSessions()}
        isLoading={loading}
      />
      {statusFilter !== 'ALL' && (
        <Button type="button" variant="text" size="sm" onClick={() => setStatusFilter('ALL')}>
          Mostrar todas
        </Button>
      )}
    </div>
  );

  const selectedSessionSummary = useMemo(() => {
    if (!movementsSession) {
      return null;
    }

    const openedAtDate = movementsSession.openedAt ? new Date(movementsSession.openedAt) : null;
    const closedAtDate = movementsSession.closedAt ? new Date(movementsSession.closedAt) : null;

    const openedLabel = openedAtDate && !Number.isNaN(openedAtDate.getTime())
      ? formatDateTime(openedAtDate)
      : '—';
    const closedLabel = closedAtDate && !Number.isNaN(closedAtDate.getTime())
      ? formatDateTime(closedAtDate)
      : null;

    return {
      openedLabel,
      closedLabel,
    };
  }, [movementsSession]);

  return (
    <Fragment>
      <DataGrid
        title=""
        columns={columns}
        rows={rows}
        totalRows={rows.length}
        height="70vh"
        headerActions={headerActions}
      />

      <Dialog
        open={movementsDialogOpen}
        onClose={handleCloseMovementsDialog}
        title="Movimientos de la sesión"
        size="lg"
        scroll="paper"
        showCloseButton
      >
        {movementsSession ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-700">
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-slate-900">
                  {movementsSession.pointOfSaleName ?? 'Punto de venta desconocido'}
                </span>
                {movementsSession.branchName && (
                  <span className="text-xs text-slate-500">Sucursal {movementsSession.branchName}</span>
                )}
                <span>
                  Apertura: <strong>{selectedSessionSummary?.openedLabel ?? '—'}</strong>
                </span>
                {selectedSessionSummary?.closedLabel ? (
                  <span>
                    Cierre: <strong>{selectedSessionSummary.closedLabel}</strong>
                  </span>
                ) : (
                  <span>Cierre: <strong className="text-amber-600">Pendiente</strong></span>
                )}
                <span>
                  Saldo esperado actual:{' '}
                  <strong>{currencyFormatter.format(Number(movementsSession.expectedAmount ?? movementsSession.openingAmount ?? 0))}</strong>
                </span>
              </div>
            </div>

            {movementsLoading ? (
              <div className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-6 text-sm text-slate-600">
                <span className="material-symbols-outlined animate-spin text-base" aria-hidden>
                  progress_activity
                </span>
                Cargando movimientos…
              </div>
            ) : movements.length > 0 ? (
              <ul className="space-y-3">
                {movements.map((movement) => {
                  const movementDate = movement.createdAt ? new Date(movement.createdAt) : null;
                  const movementDateLabel = movementDate && !Number.isNaN(movementDate.getTime())
                    ? formatDateTime(movementDate)
                    : 'Fecha desconocida';
                  const directionMeta = MOVEMENT_DIRECTION_META[movement.direction];
                  const paymentLabel = movement.paymentMethodLabel
                    ?? (movement.paymentMethod ? PAYMENT_METHOD_LABELS[movement.paymentMethod] ?? movement.paymentMethod : null);
                  const operatorLabel = movement.userFullName
                    ?? movement.userUserName
                    ?? (movement.userId ? `Usuario ${movement.userId.slice(0, 6)}` : 'Usuario no registrado');
                  const notes = movement.notes?.trim?.() ?? '';
                  const reason = movement.reason?.trim?.() ?? '';

                  return (
                    <li
                      key={movement.id}
                      className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900">
                              {movement.documentNumber}
                            </span>
                            <Badge variant="info-outlined">
                              {MOVEMENT_TYPE_LABELS[movement.transactionType] ?? movement.transactionType}
                            </Badge>
                            <Badge variant={movement.direction === 'IN' ? 'success' : movement.direction === 'OUT' ? 'error' : 'secondary'}>
                              {directionMeta.label}
                            </Badge>
                          </div>
                          <span className="text-xs text-slate-500">
                            {movementDateLabel} · {operatorLabel}
                          </span>
                          {paymentLabel && (
                            <span className="text-xs text-slate-500">Medio de pago: {paymentLabel}</span>
                          )}
                          {reason && (
                            <span className="text-xs text-slate-500">Motivo: {reason}</span>
                          )}
                          {notes.length > 0 && (
                            <span className="text-xs text-slate-500">Notas: {notes}</span>
                          )}
                        </div>
                        <span className={`text-sm font-semibold ${directionMeta.amountClass}`}>
                          {currencyFormatter.format(movement.total)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500">
                <span className="material-symbols-outlined text-3xl text-slate-300" aria-hidden>
                  receipt_long
                </span>
                No se registran movimientos para esta sesión.
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 px-4 py-6 text-sm text-slate-500">
            Selecciona una sesión para visualizar sus movimientos.
          </div>
        )}
      </Dialog>
    </Fragment>
  );
};

export default CashSessionsDataGrid;
