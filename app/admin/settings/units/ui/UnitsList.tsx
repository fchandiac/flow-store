'use client';

import { useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import Select from '@/app/baseComponents/Select/Select';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import { useAlert } from '@/app/state/hooks/useAlert';
import { setUnitActive, UnitAdminSummary } from '@/app/actions/units';
import { UnitDimension } from '@/data/entities/unit-dimension.enum';
import UnitCard from '@/app/admin/settings/units/ui/UnitCard';
import CreateUnitDialog from '@/app/admin/settings/units/ui/CreateUnitDialog';
import UpdateUnitDialog from '@/app/admin/settings/units/ui/UpdateUnitDialog';

const dimensionLabels: Record<UnitDimension, string> = {
    [UnitDimension.COUNT]: 'Conteo',
    [UnitDimension.MASS]: 'Masa',
    [UnitDimension.LENGTH]: 'Longitud',
    [UnitDimension.VOLUME]: 'Volumen',
};

type UnitStatusFilter = 'all' | 'active' | 'inactive';

interface UnitsListProps {
    units: UnitAdminSummary[];
    baseUnits: UnitAdminSummary[];
    initialSearch: string;
    initialStatus: UnitStatusFilter;
    initialDimension: string;
}

const statusOptions = [
    { id: 'all', label: 'Todas' },
    { id: 'active', label: 'Activas' },
    { id: 'inactive', label: 'Inactivas' },
];

const dimensionOptions = [
    { id: '', label: 'Todas las dimensiones' },
    { id: UnitDimension.COUNT, label: dimensionLabels[UnitDimension.COUNT] },
    { id: UnitDimension.MASS, label: dimensionLabels[UnitDimension.MASS] },
    { id: UnitDimension.LENGTH, label: dimensionLabels[UnitDimension.LENGTH] },
    { id: UnitDimension.VOLUME, label: dimensionLabels[UnitDimension.VOLUME] },
];

const emptyCopy: Record<UnitStatusFilter, string> = {
    all: 'No se encontraron unidades.',
    active: 'No hay unidades activas para mostrar.',
    inactive: 'No hay unidades inactivas para mostrar.',
};

const UnitsList: React.FC<UnitsListProps> = ({ units, baseUnits, initialSearch, initialStatus, initialDimension }) => {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { success, error } = useAlert();

    const [searchValue, setSearchValue] = useState(initialSearch);
    const [status, setStatus] = useState<UnitStatusFilter>(initialStatus);
    const [dimension, setDimension] = useState(initialDimension);
    const [openCreateDialog, setOpenCreateDialog] = useState(false);
    const [unitToEdit, setUnitToEdit] = useState<UnitAdminSummary | null>(null);
    const [pendingUnitId, setPendingUnitId] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const updateQueryParams = (updates: Record<string, string | undefined>) => {
        const params = new URLSearchParams(searchParams?.toString() ?? '');
        Object.entries(updates).forEach(([key, value]) => {
            if (value && value.trim()) {
                params.set(key, value);
            } else {
                params.delete(key);
            }
        });
        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname);
        router.refresh();
    };

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const value = event.target.value;
        setSearchValue(value);
        updateQueryParams({ search: value || undefined });
    };

    const handleStatusChange = (value: string | number | null) => {
        const nextStatus = (value ? String(value) : 'all') as UnitStatusFilter;
        setStatus(nextStatus);
        updateQueryParams({ status: nextStatus === 'all' ? undefined : nextStatus });
    };

    const handleDimensionChange = (value: string | number | null) => {
        const nextDimension = value ? String(value) : '';
        setDimension(nextDimension);
        updateQueryParams({ dimension: nextDimension || undefined });
    };

    const handleToggleActive = (unit: UnitAdminSummary, nextActive: boolean) => {
        setPendingUnitId(unit.id);
        startTransition(async () => {
            const result = await setUnitActive(unit.id, nextActive);
            if (result.success) {
                success(nextActive ? 'Unidad activada correctamente' : 'Unidad desactivada correctamente');
            } else {
                error(result.error || 'No se pudo actualizar el estado de la unidad');
            }
            router.refresh();
            setPendingUnitId(null);
        });
    };

    const isMutating = isPending || Boolean(pendingUnitId);

    return (
        <div className="space-y-6" data-test-id="units-list-container">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <IconButton
                    icon="add"
                    variant="outlined"
                    aria-label="Agregar unidad"
                    onClick={() => setOpenCreateDialog(true)}
                    data-test-id="units-add-button"
                />
                <div className="flex flex-wrap items-center justify-end gap-3 w-full md:w-auto">
                    <Select
                        value={status}
                        onChange={handleStatusChange}
                        options={statusOptions}
                        placeholder="Estado"
                        data-test-id="units-filter-status"
                        variant="minimal"
                    />
                    <Select
                        value={dimension}
                        onChange={handleDimensionChange}
                        options={dimensionOptions}
                        placeholder="Dimensión"
                        data-test-id="units-filter-dimension"
                        variant="minimal"
                    />
                    <div className="w-full sm:w-64">
                        <TextField
                            label="Buscar"
                            value={searchValue}
                            onChange={handleSearchChange}
                            startIcon="search"
                            placeholder="Buscar por nombre o símbolo"
                            data-test-id="units-search-input"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" data-test-id="units-grid">
                {units.length > 0 ? (
                    units.map((unit) => (
                        <UnitCard
                            key={unit.id}
                            unit={unit}
                            onEdit={() => setUnitToEdit(unit)}
                            onToggleActive={(nextActive: boolean) => handleToggleActive(unit, nextActive)}
                            pending={pendingUnitId === unit.id && isMutating}
                            dimensionLabel={dimensionLabels[unit.dimension]}
                        />
                    ))
                ) : (
                    <div className="col-span-full text-center text-muted-foreground py-10" data-test-id="units-empty-state">
                        {emptyCopy[status]}
                    </div>
                )}
            </div>

            <CreateUnitDialog
                open={openCreateDialog}
                onClose={() => setOpenCreateDialog(false)}
                baseUnits={baseUnits}
                dimensionLabels={dimensionLabels}
            />

            <UpdateUnitDialog
                open={Boolean(unitToEdit)}
                onClose={() => setUnitToEdit(null)}
                unit={unitToEdit}
                dimensionLabels={dimensionLabels}
                baseUnits={baseUnits}
            />
        </div>
    );
};

export default UnitsList;
