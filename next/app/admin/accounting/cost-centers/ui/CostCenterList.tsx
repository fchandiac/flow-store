'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TextField } from '@/baseComponents/TextField/TextField';
import Select from '@/baseComponents/Select/Select';
import { Button } from '@/baseComponents/Button/Button';
import CostCenterCard from './CostCenterCard';
import CreateCostCenterDialog from './CreateCostCenterDialog';
import UpdateCostCenterDialog from './UpdateCostCenterDialog';
import { CostCenterType } from '@/data/entities/CostCenter';
import { useAlert } from '@/globalstate/alert/useAlert';
import { setCostCenterStatus } from '@/actions/costCenters';
import type { CostCenterSummary, BranchOption } from './types';

interface CostCenterListProps {
    costCenters: CostCenterSummary[];
    branches: BranchOption[];
}

const typeOptions = [
    { id: 'all', label: 'Todos los tipos' },
    { id: CostCenterType.SALES, label: 'Ventas' },
    { id: CostCenterType.OPERATIONS, label: 'Operaciones' },
    { id: CostCenterType.ADMIN, label: 'Administración' },
    { id: CostCenterType.MARKETING, label: 'Marketing' },
    { id: CostCenterType.OTHER, label: 'Otros' },
];

const statusOptions = [
    { id: 'all', label: 'Estado: Todos' },
    { id: 'active', label: 'Activos' },
    { id: 'inactive', label: 'Inactivos' },
];

const buildBranchFilterOptions = (branches: BranchOption[]) => [
    { id: 'all', label: 'Sucursales: Todas' },
    { id: 'none', label: 'Sin sucursal' },
    ...branches.map((branch) => ({
        id: branch.id,
        label: branch.name,
    })),
];

const CostCenterList: React.FC<CostCenterListProps> = ({ costCenters, branches }) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { success, error } = useAlert();
    const [isPending, startTransition] = useTransition();

    const [search, setSearch] = useState(searchParams.get('search') ?? '');
    const [typeFilter, setTypeFilter] = useState<'all' | CostCenterType>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [branchFilter, setBranchFilter] = useState<'all' | 'none' | string>('all');
    const [openCreateDialog, setOpenCreateDialog] = useState(false);
    const [costCenterToEdit, setCostCenterToEdit] = useState<CostCenterSummary | null>(null);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    const branchFilterOptions = useMemo(() => buildBranchFilterOptions(branches), [branches]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const value = e.target.value || '';
        setSearch(value);

        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set('search', value);
        } else {
            params.delete('search');
        }
        router.replace(`?${params.toString()}`, { scroll: false });
    };

    const filteredCostCenters = useMemo(() => {
        return costCenters.filter((center) => {
            const matchesSearch = search
                ? center.name.toLowerCase().includes(search.toLowerCase()) ||
                  center.code.toLowerCase().includes(search.toLowerCase())
                : true;

            const matchesType = typeFilter === 'all' ? true : center.type === typeFilter;
            const matchesStatus =
                statusFilter === 'all'
                    ? true
                    : statusFilter === 'active'
                        ? center.isActive
                        : !center.isActive;
            const matchesBranch =
                branchFilter === 'all'
                    ? true
                    : branchFilter === 'none'
                        ? !center.branchId
                        : center.branchId === branchFilter;

            return matchesSearch && matchesType && matchesStatus && matchesBranch;
        });
    }, [branchFilter, costCenters, search, statusFilter, typeFilter]);

    const handleToggleStatus = (costCenter: CostCenterSummary, nextStatus: boolean) => {
        setTogglingId(costCenter.id);
        startTransition(async () => {
            const result = await setCostCenterStatus(costCenter.id, nextStatus);
            if (!result.success) {
                error(result.error ?? 'No fue posible actualizar el estado.');
                setTogglingId(null);
                return;
            }
            success(`Centro de costo ${nextStatus ? 'activado' : 'inactivado'} correctamente.`);
            setTogglingId(null);
            router.refresh();
        });
    };

    const handleCloseEditDialog = () => setCostCenterToEdit(null);

    return (
        <div className="flex flex-col gap-6" data-test-id="cost-center-list">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setOpenCreateDialog(true)}
                        data-test-id="cost-centers-add-button"
                    >
                        <span className="material-symbols-outlined mr-2 text-base">add</span>
                        Nuevo centro de costo
                    </Button>
                    <TextField
                        label="Buscar"
                        value={search}
                        onChange={handleSearchChange}
                        placeholder="Buscar por código o nombre"
                        startIcon="search"
                        data-test-id="cost-centers-search"
                    />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Select
                        options={typeOptions}
                        value={typeFilter}
                        onChange={(value) => setTypeFilter(((value ?? 'all') as 'all' | CostCenterType))}
                        placeholder="Filtrar por tipo"
                        variant="minimal"
                        data-test-id="cost-centers-type-filter"
                    />
                    <Select
                        options={statusOptions}
                        value={statusFilter}
                        onChange={(value) => setStatusFilter(((value ?? 'all') as 'all' | 'active' | 'inactive'))}
                        placeholder="Filtrar por estado"
                        variant="minimal"
                        data-test-id="cost-centers-status-filter"
                    />
                    <Select
                        options={branchFilterOptions}
                        value={branchFilter}
                        onChange={(value) => setBranchFilter((value as string | null) ?? 'all')}
                        placeholder="Filtrar por sucursal"
                        variant="minimal"
                        data-test-id="cost-centers-branch-filter"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2" data-test-id="cost-centers-grid">
                {filteredCostCenters.length > 0 ? (
                    filteredCostCenters.map((center) => (
                        <CostCenterCard
                            key={center.id}
                            costCenter={center}
                            onEdit={(cc) => setCostCenterToEdit(cc)}
                            onStatusChange={handleToggleStatus}
                            statusIsUpdating={isPending && togglingId === center.id}
                            data-test-id={`cost-center-card-${center.id}`}
                        />
                    ))
                ) : (
                    <div className="col-span-full rounded-lg border border-dashed border-border/60 bg-gray-50 p-8 text-center text-muted-foreground">
                        No se encontraron centros de costo con los filtros seleccionados.
                    </div>
                )}
            </div>

            <CreateCostCenterDialog
                open={openCreateDialog}
                onClose={() => setOpenCreateDialog(false)}
                branches={branches}
                costCenters={costCenters}
                onSuccess={() => {
                    setOpenCreateDialog(false);
                    router.refresh();
                }}
            />

            <UpdateCostCenterDialog
                open={Boolean(costCenterToEdit)}
                onClose={handleCloseEditDialog}
                costCenter={costCenterToEdit}
                branches={branches}
                costCenters={costCenters}
                onSuccess={() => {
                    handleCloseEditDialog();
                    router.refresh();
                }}
            />
        </div>
    );
};

export default CostCenterList;
