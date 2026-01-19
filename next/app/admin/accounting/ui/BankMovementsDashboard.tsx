'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { BankMovementsOverview, BankMovementRecord } from '@/actions/bankMovements';
import { formatDateTime } from '@/lib/dateTimeUtils';
import DataGrid, { type DataGridColumn } from '@/baseComponents/DataGrid/DataGrid';
import Select, { type Option as SelectOption } from '@/baseComponents/Select/Select';
import { Button } from '@/baseComponents/Button/Button';
import CreateCapitalContributionDialog from './CreateCapitalContributionDialog';
import CreateBankToCashTransferDialog from './CreateBankToCashTransferDialog';
import CreateCashDepositDialog from './CreateCashDepositDialog';

const currencyFormatter = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP'
});

const movementKindLabels: Record<string, string> = {
    CAPITAL_CONTRIBUTION: 'Aporte de capital',
    BANK_TO_CASH_TRANSFER: 'Transferencia a caja',
    CUSTOMER_PAYMENT: 'Cobro registrado',
    SUPPLIER_PAYMENT: 'Pago a proveedor',
    OPERATING_EXPENSE: 'Gasto operativo',
    CASH_DEPOSIT: 'Depósito en banco',
    GENERAL: 'Movimiento general'
};

function formatCurrency(value: number): string {
    return currencyFormatter.format(Number(value || 0));
}

function formatDate(value: string): string {
    return formatDateTime(value);
}
const directionToneClasses: Record<string, string> = {
    IN: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    OUT: 'bg-rose-50 text-rose-700 border border-rose-200'
};

interface SimpleOption {
    id: string;
    label: string;
}

interface BankMovementsDashboardProps {
    overview: BankMovementsOverview;
    cashBalance: number;
    shareholderOptions: SimpleOption[];
    bankAccountOptions: SimpleOption[];
}

export default function BankMovementsDashboard({
    overview,
    cashBalance,
    shareholderOptions,
    bankAccountOptions,
}: BankMovementsDashboardProps) {
    const router = useRouter();
    const baseMovements = useMemo<BankMovementRecord[]>(() => {
        if (Array.isArray(overview.monthMovements) && overview.monthMovements.length > 0) {
            return overview.monthMovements;
        }
        return overview.recentMovements ?? [];
    }, [overview.monthMovements, overview.recentMovements]);

    const accountFilterOptions = useMemo<SelectOption[]>(() => {
        const map = new Map<string, { label: string; balance?: number | null }>();
        baseMovements.forEach((movement) => {
            const key = movement.bankAccountKey ?? movement.bankAccountLabel ?? 'sin-cuenta';
            const label = movement.bankAccountLabel ?? movement.bankAccountNumber ?? 'Cuenta sin registrar';
            const balance = movement.bankAccountBalance ?? null;
            if (!map.has(key)) {
                map.set(key, { label, balance });
            }
        });
        const entries = Array.from(map.entries()).map(([id, data]) => ({ id, label: data.balance != null ? `${data.label} · Saldo ${formatCurrency(data.balance)}` : data.label }));
        entries.sort((a, b) => a.label.localeCompare(b.label, 'es'));
        return [{ id: '__all__', label: 'Todas las cuentas' }, ...entries];
    }, [baseMovements]);

    const [selectedAccount, setSelectedAccount] = useState<string>('__all__');
    const [capitalDialogOpen, setCapitalDialogOpen] = useState(false);
    const [bankToCashDialogOpen, setBankToCashDialogOpen] = useState(false);
    const [cashDepositDialogOpen, setCashDepositDialogOpen] = useState(false);

    useEffect(() => {
        if (selectedAccount === '__all__') {
            return;
        }
        const exists = accountFilterOptions.some((option) => option.id === selectedAccount);
        if (!exists) {
            setSelectedAccount('__all__');
        }
    }, [accountFilterOptions, selectedAccount]);

    const filteredMovements = useMemo(() => {
        if (selectedAccount === '__all__') {
            return baseMovements;
        }
        return baseMovements.filter((movement) => {
            const key = movement.bankAccountKey ?? movement.bankAccountLabel ?? 'sin-cuenta';
            return key === selectedAccount;
        });
    }, [baseMovements, selectedAccount]);

    const rows = useMemo(() => {
        return filteredMovements.map((movement) => {
            const directionLabel = movement.direction === 'IN' ? 'Ingreso' : 'Salida';
            const movementKindLabel = movementKindLabels[movement.movementKind] ?? movement.movementKind;
            const accountLabel = movement.bankAccountLabel ?? movement.bankAccountNumber ?? 'Cuenta sin registrar';
            return {
                id: movement.id,
                createdAtDisplay: formatDate(movement.createdAt),
                documentNumber: movement.documentNumber ?? '—',
                movementKindLabel,
                direction: movement.direction,
                directionLabel,
                totalFormatted: formatCurrency(movement.total),
                bankAccountLabel: accountLabel,
                bankAccountBalanceFormatted: movement.bankAccountBalance != null ? formatCurrency(movement.bankAccountBalance) : '—',
                counterparty: movement.counterpartyName ?? '—',
                notes: movement.notes ?? '—'
            };
        });
    }, [filteredMovements]);

    const columns = useMemo<DataGridColumn[]>(() => [
        {
            field: 'createdAtDisplay',
            headerName: 'Fecha',
            minWidth: 180,
            sortable: false,
            filterable: false
        },
        {
            field: 'documentNumber',
            headerName: 'Documento',
            minWidth: 140,
            sortable: false,
            filterable: false
        },
        {
            field: 'movementKindLabel',
            headerName: 'Tipo de movimiento',
            minWidth: 200,
            flex: 1,
            sortable: false,
            filterable: false
        },
        {
            field: 'directionLabel',
            headerName: 'Dirección',
            minWidth: 140,
            sortable: false,
            filterable: false,
            renderCell: ({ row }) => (
                <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${directionToneClasses[row.direction] ?? 'border border-border text-muted-foreground'}`}>
                    {row.directionLabel}
                </span>
            )
        },
        {
            field: 'totalFormatted',
            headerName: 'Monto',
            minWidth: 140,
            align: 'left',
            headerAlign: 'left',
            sortable: false,
            filterable: false
        },
        {
            field: 'bankAccountLabel',
            headerName: 'Cuenta bancaria',
            minWidth: 220,
            sortable: false,
            filterable: false
        },
        {
            field: 'bankAccountBalanceFormatted',
            headerName: 'Saldo cuenta',
            minWidth: 160,
            align: 'left',
            headerAlign: 'left',
            sortable: false,
            filterable: false
        },
        {
            field: 'counterparty',
            headerName: 'Contraparte',
            minWidth: 200,
            flex: 1,
            sortable: false,
            filterable: false
        },
        {
            field: 'notes',
            headerName: 'Notas',
            minWidth: 240,
            flex: 1,
            sortable: false,
            filterable: false
        }
    ], []);

    const accountFilterDisabled = accountFilterOptions.length <= 1;
    const capitalContributionDisabled = shareholderOptions.length === 0 || bankAccountOptions.length === 0;
    const bankToCashTransferDisabled = bankAccountOptions.length === 0;
    const cashDepositDisabled = bankAccountOptions.length === 0 || cashBalance <= 0;

    const shareholderSelectOptions = useMemo<SelectOption[]>(
        () => shareholderOptions.map((option) => ({ id: option.id, label: option.label })),
        [shareholderOptions],
    );

    const bankAccountSelectOptions = useMemo<SelectOption[]>(
        () => bankAccountOptions.map((option) => ({ id: option.id, label: option.label })),
        [bankAccountOptions],
    );

    const headerActions = (
        <div className="flex flex-wrap items-center gap-3">
            <Button
                type="button"
                variant="outlined"
                size="sm"
                className="flex items-center gap-1"
                onClick={() => setCashDepositDialogOpen(true)}
                disabled={cashDepositDisabled}
            >
                <span className="material-symbols-outlined text-base">account_balance</span>
                Depositar efectivo
            </Button>
            <Button
                type="button"
                variant="outlined"
                size="sm"
                className="flex items-center gap-1"
                onClick={() => setBankToCashDialogOpen(true)}
                disabled={bankToCashTransferDisabled}
            >
                <span className="material-symbols-outlined text-base">sync_alt</span>
                Transferir a caja
            </Button>
            <Button
                type="button"
                variant="outlined"
                size="sm"
                className="flex items-center gap-1"
                onClick={() => setCapitalDialogOpen(true)}
                disabled={capitalContributionDisabled}
            >
                <span className="material-symbols-outlined text-base">add</span>
                Aporte de capital
            </Button>
            <Select
                variant="minimal"
                options={accountFilterOptions}
                value={selectedAccount}
                onChange={(value) => {
                    if (value === null || value === undefined) {
                        setSelectedAccount('__all__');
                        return;
                    }
                    setSelectedAccount(String(value));
                }}
                placeholder="Filtrar por cuenta"
                className="min-w-[260px]"
                data-test-id="bank-account-filter"
                disabled={accountFilterDisabled}
            />
        </div>
    );

    const highlightCards = [
        {
            title: 'Saldo proyectado en bancos',
            value: formatCurrency(overview.summary.projectedBalance),
            hint: `Entradas acumuladas ${formatCurrency(overview.summary.incomingTotal)} vs salidas ${formatCurrency(overview.summary.outgoingTotal)}`
        },
        {
            title: 'Saldo en caja general',
            value: formatCurrency(cashBalance),
            hint: cashBalance > 0
                ? 'Saldo contable disponible en la cuenta Caja General (1.1.01).'
                : 'No hay saldo disponible en Caja General.'
        }
    ];

    return (
        <div className="flex flex-col gap-8">
            <section>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Resumen inicial</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {highlightCards.map((card) => (
                        <div key={card.title} className="rounded-xl border border-border/70 bg-white p-5 shadow-sm">
                            <h3 className="text-sm font-medium text-muted-foreground">{card.title}</h3>
                            <p className="mt-2 text-2xl font-semibold text-foreground">{card.value}</p>
                            <p className="mt-3 text-xs text-muted-foreground">{card.hint}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="space-y-4">
                <header className="space-y-1">
                    <h2 className="text-lg font-semibold text-foreground">Movimientos bancarios</h2>
                    <p className="text-sm text-muted-foreground">Visualiza y filtra los movimientos registrados por cuenta bancaria.</p>
                </header>
                <div className="rounded-xl bg-white p-2 shadow-sm">
                    <DataGrid
                        columns={columns}
                        rows={rows}
                        height="60vh"
                        showSortButton={false}
                        showFilterButton={false}
                        showExportButton={false}
                        headerActions={headerActions}
                        data-test-id="bank-movements-grid"
                    />
                </div>
            </section>
            <CreateCapitalContributionDialog
                open={capitalDialogOpen}
                onClose={() => setCapitalDialogOpen(false)}
                onCreated={async () => {
                    router.refresh();
                }}
                shareholderOptions={shareholderSelectOptions}
                bankAccountOptions={bankAccountSelectOptions}
            />
            <CreateBankToCashTransferDialog
                open={bankToCashDialogOpen}
                onClose={() => setBankToCashDialogOpen(false)}
                onCreated={async () => {
                    router.refresh();
                }}
                bankAccountOptions={bankAccountSelectOptions}
            />
            <CreateCashDepositDialog
                open={cashDepositDialogOpen}
                onClose={() => setCashDepositDialogOpen(false)}
                onCreated={async () => {
                    router.refresh();
                }}
                bankAccountOptions={bankAccountSelectOptions}
                availableCash={cashBalance}
            />
        </div>
    );
}
