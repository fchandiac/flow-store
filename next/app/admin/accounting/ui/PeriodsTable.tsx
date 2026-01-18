'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import DataGrid, { type DataGridColumn } from '@/baseComponents/DataGrid/DataGrid';
import Badge, { type BadgeVariant } from '@/baseComponents/Badge/Badge';
import Alert from '@/baseComponents/Alert/Alert';
import IconButton from '@/baseComponents/IconButton/IconButton';
import Dialog from '@/baseComponents/Dialog/Dialog';
import type { AccountingPeriodSummary } from '@/actions/accounting';
import { formatDateTime } from '@/lib/dateTimeUtils';
import CreateAccountingPeriodDialog from './CreateAccountingPeriodDialog';

interface PeriodsTableProps {
    periods: AccountingPeriodSummary[];
}

interface AccountingPeriodRow {
    id: string;
    name: string;
    dateRange: string;
    status: string;
    statusLabel: string;
    statusBadge: BadgeVariant;
    statusNote: string;
    closedAtLabel: string;
}

const formatRange = (start: string, end: string) => {
    return `${formatDateTime(start)} — ${formatDateTime(end)}`;
};

const getStatusInfo = (status: string, locked: boolean): { label: string; variant: BadgeVariant; note: string } => {
    if (locked || status.toUpperCase() === 'LOCKED') {
        return {
            label: 'Bloqueado',
            variant: 'warning',
            note: 'Los asientos se pueden visualizar pero no editar hasta reabrir el período.',
        };
    }

    if (status.toUpperCase() === 'OPEN') {
        return {
            label: 'Abierto',
            variant: 'success',
            note: 'Cuando cierres el período podrás bloquearlo para evitar ajustes no controlados.',
        };
    }

    return {
        label: 'Cerrado',
        variant: 'secondary',
        note: 'El período está cerrado. Reabrir solo con autorización contable.',
    };
};

export default function PeriodsTable({ periods }: PeriodsTableProps) {
    const router = useRouter();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);
    const [selectedPeriod, setSelectedPeriod] = useState<AccountingPeriodRow | null>(null);

    const rows: AccountingPeriodRow[] = useMemo(() => {
        return periods.map((period) => {
            const statusInfo = getStatusInfo(period.status, period.locked);
            return {
                id: period.id,
                name: period.name,
                dateRange: formatRange(period.startDate, period.endDate),
                status: period.status,
                statusLabel: statusInfo.label,
                statusBadge: statusInfo.variant,
                statusNote: statusInfo.note,
                closedAtLabel: period.closedAt ? formatDateTime(period.closedAt) : '—',
            };
        });
    }, [periods]);

    const openDetailDialog = useCallback((row: AccountingPeriodRow) => {
        setSelectedPeriod(row);
        setDetailDialogOpen(true);
    }, []);

    const closeDetailDialog = useCallback(() => {
        setDetailDialogOpen(false);
        setSelectedPeriod(null);
    }, []);

    const columns: DataGridColumn[] = useMemo(
        () => [
            { field: 'name', headerName: 'Período', minWidth: 160, flex: 1.1 },
            { field: 'dateRange', headerName: 'Fechas', minWidth: 220, flex: 1.3 },
            {
                field: 'status',
                headerName: 'Estado',
                minWidth: 160,
                flex: 0.8,
                align: 'center',
                headerAlign: 'center',
                renderCell: ({ row }) => <Badge variant={row.statusBadge}>{row.statusLabel}</Badge>,
            },
            { field: 'closedAtLabel', headerName: 'Cerrado el', minWidth: 200, flex: 1 },
            {
                field: 'actions',
                headerName: 'Acciones',
                minWidth: 120,
                flex: 0.6,
                align: 'center',
                headerAlign: 'center',
                renderCell: ({ row }) => (
                    <IconButton
                        icon="more_horiz"
                        variant="ghost"
                        size="sm"
                        ariaLabel="Ver detalles del período"
                        onClick={() => openDetailDialog(row as AccountingPeriodRow)}
                    />
                ),
            },
        ],
        [openDetailDialog],
    );

    const handleOpenDialog = useCallback(() => {
        setDialogOpen(true);
    }, []);

    const handleCloseDialog = useCallback(() => {
        setDialogOpen(false);
    }, []);

    const handleCreated = useCallback(() => {
        setDialogOpen(false);
        router.refresh();
    }, [router]);

    return (
        <div className="space-y-4">
            {rows.length === 0 && (
                <Alert variant="info">
                    Todavía no hay períodos contables registrados. Crea el primero para comenzar el control mensual.
                </Alert>
            )}

            <DataGrid
                title="Períodos contables"
                columns={columns}
                rows={rows}
                totalRows={rows.length}
                onAddClick={handleOpenDialog}
                height="80vh"
                data-test-id="accounting-periods-grid"
            />

            <CreateAccountingPeriodDialog
                open={dialogOpen}
                onClose={handleCloseDialog}
                onSuccess={handleCreated}
                existingPeriods={periods}
            />

            <Dialog
                open={detailDialogOpen}
                onClose={closeDetailDialog}
                title={selectedPeriod ? selectedPeriod.name : 'Detalle del período'}
                size="sm"
            >
                {selectedPeriod && (
                    <div className="space-y-4">
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-medium text-muted-foreground">Estado</span>
                            <div className="flex items-center gap-2">
                                <Badge variant={selectedPeriod.statusBadge}>{selectedPeriod.statusLabel}</Badge>
                                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                                    {selectedPeriod.status}
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-medium text-muted-foreground">Fechas</span>
                            <span className="text-sm font-semibold text-foreground">{selectedPeriod.dateRange}</span>
                        </div>

                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-medium text-muted-foreground">Cerrado el</span>
                            <span className="text-sm text-foreground">{selectedPeriod.closedAtLabel}</span>
                        </div>

                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-medium text-muted-foreground">Notas</span>
                            <span className="text-sm text-foreground">{selectedPeriod.statusNote}</span>
                        </div>
                    </div>
                )}
            </Dialog>
        </div>
    );
}
