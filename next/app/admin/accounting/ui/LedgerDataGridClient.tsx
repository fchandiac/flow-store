'use client';

import { useMemo } from 'react';
import DataGrid, { type DataGridColumn } from '@/baseComponents/DataGrid/DataGrid';
import { ACCOUNTING_CURRENCY_FORMAT } from '@/lib/accounting/format';
import type { LedgerEntry } from '@/actions/accounting';

interface LedgerDataGridClientProps {
  rows: LedgerEntry[];
}

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleDateString('es-CL');
};

const formatAmount = (value: unknown, showDash = true) => {
  const numeric = typeof value === 'number' ? value : Number(value ?? 0);
  if (showDash && Math.abs(numeric) < 0.0001) {
    return '—';
  }
  return ACCOUNTING_CURRENCY_FORMAT.format(numeric);
};

const LedgerDataGridClient = ({ rows }: LedgerDataGridClientProps) => {
  const columns = useMemo<DataGridColumn[]>(() => [
    {
      field: 'accountCode',
      headerName: 'Cuenta',
      width: 130,
      renderCell: ({ value }) => (
        <span className="font-mono text-xs text-muted-foreground">{value}</span>
      ),
    },
    {
      field: 'accountName',
      headerName: 'Nombre',
      flex: 1,
      minWidth: 220,
      renderCell: ({ value }) => (
        <span className="text-sm text-neutral-900">{value}</span>
      ),
    },
    {
      field: 'date',
      headerName: 'Fecha',
      width: 120,
      renderCell: ({ value }) => (
        <span className="text-xs text-muted-foreground">{formatDate(value as string)}</span>
      ),
    },
    {
      field: 'reference',
      headerName: 'Referencia',
      flex: 1,
      minWidth: 220,
      renderCell: ({ row }) => (
        <div className="flex flex-col text-sm text-neutral-800">
          <span className="font-medium text-neutral-900">{row.reference}</span>
          {row.description ? (
            <span className="text-[11px] text-muted-foreground">{row.description}</span>
          ) : null}
        </div>
      ),
    },
    {
      field: 'debit',
      headerName: 'Debe',
      width: 140,
      align: 'right',
      headerAlign: 'right',
      renderCell: ({ value }) => (
        <span className="text-sm font-semibold text-emerald-700">{formatAmount(value)}</span>
      ),
    },
    {
      field: 'credit',
      headerName: 'Haber',
      width: 140,
      align: 'right',
      headerAlign: 'right',
      renderCell: ({ value }) => (
        <span className="text-sm font-semibold text-rose-700">{formatAmount(value)}</span>
      ),
    },
    {
      field: 'balance',
      headerName: 'Saldo',
      width: 160,
      align: 'right',
      headerAlign: 'right',
      renderCell: ({ value }) => (
        <span className="text-sm font-semibold text-neutral-900">{formatAmount(value, false)}</span>
      ),
    },
  ], []);

  return (
    <div className="space-y-3">
      <DataGrid
        title="Previo Diario General"
        columns={columns}
        rows={rows}
        totalRows={rows.length}
        height="75vh"
      />
      <p className="text-xs text-muted-foreground">
        Filtraremos por periodo y centro de costo cuando el motor contable esté activo.
      </p>
    </div>
  );
};

export default LedgerDataGridClient;
