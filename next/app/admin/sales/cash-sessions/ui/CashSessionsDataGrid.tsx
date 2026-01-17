'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import DataGrid, { type DataGridColumn } from '@/baseComponents/DataGrid/DataGrid';
import Select, { type Option } from '@/baseComponents/Select/Select';
import IconButton from '@/baseComponents/IconButton/IconButton';
import Badge, { type BadgeVariant } from '@/baseComponents/Badge/Badge';
import { Button } from '@/baseComponents/Button/Button';
import { useAlert } from '@/globalstate/alert/useAlert';
import {
  listCashSessions,
  type CashSessionListItem,
  type CashSessionListFilters,
  closeCashSessionFromAdmin,
} from '@/actions/cashSessions';
import { CashSessionStatus } from '@/data/entities/CashSession';

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

type StatusFilter = 'ALL' | CashSessionStatus;

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
            <span className="font-medium text-neutral-900">{dateTimeFormatter.format(date)}</span>
            <span className="text-xs text-neutral-500">{date.toISOString().slice(0, 10)}</span>
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
            <span className="font-medium text-neutral-900">{dateTimeFormatter.format(date)}</span>
            <span className="text-xs text-neutral-500">{date.toISOString().slice(0, 10)}</span>
          </div>
        );
      },
    },
    {
      field: 'openingAmount',
      headerName: 'Apertura (CLP)',
      width: 150,
      align: 'right',
      headerAlign: 'right',
      renderCell: ({ value }) => (
        <span className="text-sm font-medium text-neutral-900">{currencyFormatter.format(Number(value ?? 0))}</span>
      ),
    },
    {
      field: 'expectedAmount',
      headerName: 'Esperado',
      width: 140,
      align: 'right',
      headerAlign: 'right',
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
      align: 'right',
      headerAlign: 'right',
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
      align: 'right',
      headerAlign: 'right',
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
      headerName: 'Acciones',
      width: 180,
      renderCell: ({ row }) => {
        const isOpen = row.status === CashSessionStatus.OPEN;
        if (!isOpen) {
          return <span className="text-xs text-neutral-500">Sin acciones</span>;
        }
        const isClosing = closingSessionId === row.id;
        return (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void handleCloseSession(row.id)}
            disabled={isClosing}
          >
            {isClosing ? 'Cerrando…' : 'Cerrar sesión'}
          </Button>
        );
      },
    },
  ], [closingSessionId, handleCloseSession]);

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

  return (
    <DataGrid
      title="Sesiones de caja"
      columns={columns}
      rows={rows}
      totalRows={rows.length}
      height="70vh"
      headerActions={headerActions}
      showBorder
    />
  );
};

export default CashSessionsDataGrid;
