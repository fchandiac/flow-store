'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import DataGrid, { type DataGridColumn } from '@/baseComponents/DataGrid/DataGrid';
import { TextField } from '@/baseComponents/TextField/TextField';
import Select from '@/baseComponents/Select/Select';
import Badge from '@/baseComponents/Badge/Badge';
import { Button } from '@/baseComponents/Button/Button';
import { useAlert } from '@/globalstate/alert/useAlert';
import { updateBudgetStatus } from '@/actions/budgets';
import type { BudgetSummary } from '@/actions/budgets';
import type { BranchOption, CostCenterSummary } from '../../ui/types';
import { BudgetStatus } from '@/data/entities/Budget';
import { CostCenterType } from '@/data/entities/CostCenter';
import CreateBudgetDialog from './CreateBudgetDialog';

const currencyFormatter = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
});

const budgetStatusLabels: Record<BudgetStatus, string> = {
    [BudgetStatus.ACTIVE]: 'Activo',
    [BudgetStatus.SUPERSEDED]: 'Reemplazado',
    [BudgetStatus.CANCELLED]: 'Cancelado',
};

const budgetStatusOptions = [
    { id: 'all', label: 'Estado: Todos' },
    { id: BudgetStatus.ACTIVE, label: budgetStatusLabels[BudgetStatus.ACTIVE] },
    { id: BudgetStatus.SUPERSEDED, label: budgetStatusLabels[BudgetStatus.SUPERSEDED] },
    { id: BudgetStatus.CANCELLED, label: budgetStatusLabels[BudgetStatus.CANCELLED] },
];

const costCenterTypeLabels: Record<CostCenterType, string> = {
    [CostCenterType.SALES]: 'Ventas',
    [CostCenterType.OPERATIONS]: 'Operaciones',
    [CostCenterType.ADMIN]: 'Administración',
    [CostCenterType.MARKETING]: 'Marketing',
    [CostCenterType.OTHER]: 'Otros',
};

const costCenterTypeOptions = [
    { id: 'all', label: 'Tipo: Todos' },
    { id: CostCenterType.SALES, label: costCenterTypeLabels[CostCenterType.SALES] },
    { id: CostCenterType.OPERATIONS, label: costCenterTypeLabels[CostCenterType.OPERATIONS] },
    { id: CostCenterType.ADMIN, label: costCenterTypeLabels[CostCenterType.ADMIN] },
    { id: CostCenterType.MARKETING, label: costCenterTypeLabels[CostCenterType.MARKETING] },
    { id: CostCenterType.OTHER, label: costCenterTypeLabels[CostCenterType.OTHER] },
];

const formatCurrency = (value: number) => currencyFormatter.format(value);

const buildBranchOptions = (branches: BranchOption[]) => [
    { id: 'all', label: 'Sucursales: Todas' },
    { id: 'none', label: 'Sin sucursal' },
    ...branches.map((branch) => ({ id: branch.id, label: branch.name })),
];

interface BudgetRow extends BudgetSummary {
    periodLabel: string;
    variance: number;
    varianceLabel: string;
}

interface BudgetsDataGridProps {
    budgets: BudgetSummary[];
    branches: BranchOption[];
    costCenters: CostCenterSummary[];
}

const statusBadgeVariant: Record<BudgetStatus, 'success-outlined' | 'warning-outlined' | 'error-outlined'> = {
    [BudgetStatus.ACTIVE]: 'success-outlined',
    [BudgetStatus.SUPERSEDED]: 'warning-outlined',
    [BudgetStatus.CANCELLED]: 'error-outlined',
};

const BudgetStatusActions: React.FC<{ row: BudgetRow }> = ({ row }) => {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();
    const { success, error } = useAlert();

    const handleStatusChange = (value: string | number | null) => {
        if (!value || value === row.status) {
            return;
        }
        startTransition(async () => {
            const nextStatus = value as BudgetStatus;
            const result = await updateBudgetStatus(row.id, { status: nextStatus });
            if (!result.success) {
                error(result.error ?? 'No fue posible actualizar el presupuesto.');
                return;
            }
            success('Estado de presupuesto actualizado.');
            router.refresh();
        });
    };

    return (
        <Select
            options={budgetStatusOptions.filter((option) => option.id !== 'all')}
            value={row.status}
            onChange={handleStatusChange}
            variant="minimal"
            disabled={isPending}
            data-test-id={`budget-status-${row.id}`}
        />
    );
};

const BudgetsDataGrid: React.FC<BudgetsDataGridProps> = ({ budgets, branches, costCenters }) => {
    const router = useRouter();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | BudgetStatus>('all');
    const [typeFilter, setTypeFilter] = useState<'all' | CostCenterType>('all');
    const [branchFilter, setBranchFilter] = useState<'all' | 'none' | string>('all');
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const branchOptions = useMemo(() => buildBranchOptions(branches), [branches]);

    const rows = useMemo<BudgetRow[]>(() => {
        return budgets.map((budget) => ({
            ...budget,
            periodLabel: `${budget.periodStart} → ${budget.periodEnd}`,
            variance: budget.budgetedAmount - budget.spentAmount,
            varianceLabel: formatCurrency(budget.budgetedAmount - budget.spentAmount),
        }));
    }, [budgets]);

    const filteredRows = useMemo(() => {
        return rows.filter((row) => {
            const matchesSearch = search
                ? row.costCenterName.toLowerCase().includes(search.toLowerCase()) ||
                  row.costCenterCode.toLowerCase().includes(search.toLowerCase())
                : true;

            const matchesStatus =
                statusFilter === 'all'
                    ? true
                    : row.status === statusFilter;

            const matchesType =
                typeFilter === 'all'
                    ? true
                    : row.costCenterType === typeFilter;

            const matchesBranch =
                branchFilter === 'all'
                    ? true
                    : branchFilter === 'none'
                        ? !row.branchId
                        : row.branchId === branchFilter;

            return matchesSearch && matchesStatus && matchesType && matchesBranch;
        });
    }, [branchFilter, rows, search, statusFilter, typeFilter]);

    const columns: DataGridColumn[] = useMemo(() => [
        {
            field: 'costCenterCode',
            headerName: 'Centro',
            minWidth: 110,
        },
        {
            field: 'costCenterName',
            headerName: 'Nombre centro',
            flex: 1.2,
        },
        {
            field: 'branchName',
            headerName: 'Sucursal',
            flex: 1,
            renderCell: ({ value }) => value || '—',
        },
        {
            field: 'periodLabel',
            headerName: 'Período',
            minWidth: 180,
        },
        {
            field: 'budgetedAmount',
            headerName: 'Presupuestado',
            align: 'right',
            minWidth: 140,
            renderCell: ({ row }) => <span>{formatCurrency(row.budgetedAmount)}</span>,
        },
        {
            field: 'spentAmount',
            headerName: 'Ejecutado',
            align: 'right',
            minWidth: 140,
            renderCell: ({ row }) => <span>{formatCurrency(row.spentAmount)}</span>,
        },
        {
            field: 'varianceLabel',
            headerName: 'Diferencia',
            align: 'right',
            minWidth: 140,
            renderCell: ({ row }) => (
                <span className={row.variance < 0 ? 'text-red-600' : 'text-emerald-600'}>
                    {formatCurrency(row.variance)}
                </span>
            ),
        },
        {
            field: 'status',
            headerName: 'Estado',
            minWidth: 140,
            renderCell: ({ row }) => {
                const status = row.status as BudgetStatus;
                return (
                    <Badge variant={statusBadgeVariant[status]}>{budgetStatusLabels[status]}</Badge>
                );
            },
        },
        {
            field: 'actions',
            headerName: 'Acciones',
            minWidth: 160,
            align: 'right',
            actionComponent: BudgetStatusActions,
        },
    ], []);

    const headerActions = (
        <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row">
                <TextField
                    label="Buscar"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Código o nombre del centro"
                    startIcon="search"
                    data-test-id="budgets-search"
                />
                <Select
                    options={budgetStatusOptions}
                    value={statusFilter}
                    onChange={(value) => setStatusFilter(((value ?? 'all') as 'all' | BudgetStatus))}
                    variant="minimal"
                    data-test-id="budgets-status-filter"
                />
                <Select
                    options={costCenterTypeOptions}
                    value={typeFilter}
                    onChange={(value) => setTypeFilter(((value ?? 'all') as 'all' | CostCenterType))}
                    variant="minimal"
                    data-test-id="budgets-type-filter"
                />
                <Select
                    options={branchOptions}
                    value={branchFilter}
                    onChange={(value) => setBranchFilter((value as string | null) ?? 'all')}
                    variant="minimal"
                    data-test-id="budgets-branch-filter"
                />
            </div>
            <div className="flex justify-end">
                <Button onClick={() => setIsCreateOpen(true)} variant="primary" size="md" data-test-id="open-create-budget">
                    Nuevo presupuesto
                </Button>
            </div>
        </div>
    );

    return (
        <>
            <DataGrid
                columns={columns}
                rows={filteredRows}
                title="Presupuestos por centro de costo"
                height="72vh"
                headerActions={headerActions}
                data-test-id="budgets-data-grid"
            />
            <CreateBudgetDialog
                open={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                costCenters={costCenters}
                onSuccess={() => {
                    setIsCreateOpen(false);
                    router.refresh();
                }}
            />
        </>
    );
};

export default BudgetsDataGrid;
