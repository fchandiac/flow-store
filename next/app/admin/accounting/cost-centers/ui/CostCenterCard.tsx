'use client';

import Badge from '@/baseComponents/Badge/Badge';
import IconButton from '@/baseComponents/IconButton/IconButton';
import Switch from '@/baseComponents/Switch/Switch';
import type { CostCenterSummary } from './types';
import { CostCenterType } from '@/data/entities/CostCenter';

const typeLabels: Record<CostCenterType, string> = {
    [CostCenterType.SALES]: 'Ventas',
    [CostCenterType.OPERATIONS]: 'Operaciones',
    [CostCenterType.ADMIN]: 'Administración',
    [CostCenterType.MARKETING]: 'Marketing',
    [CostCenterType.OTHER]: 'Otros',
};

interface CostCenterCardProps {
    costCenter: CostCenterSummary;
    onEdit: (costCenter: CostCenterSummary) => void;
    onStatusChange: (costCenter: CostCenterSummary, nextStatus: boolean) => void;
    statusIsUpdating?: boolean;
    'data-test-id'?: string;
}

const CostCenterCard: React.FC<CostCenterCardProps> = ({
    costCenter,
    onEdit,
    onStatusChange,
    statusIsUpdating = false,
    'data-test-id': dataTestId,
}) => {
    const branchLabel = costCenter.branch?.name || 'Sin sucursal asignada';
    const parentLabel = costCenter.parent ? `${costCenter.parent.code} · ${costCenter.parent.name}` : 'Raíz';

    return (
        <article
            className="flex flex-col rounded-xl border border-border/60 bg-white p-4 shadow-sm"
            data-test-id={dataTestId}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Código</p>
                    <h3 className="text-xl font-semibold text-gray-900">{costCenter.code}</h3>
                    <p className="text-base text-gray-900">{costCenter.name}</p>
                    {costCenter.description && (
                        <p className="text-sm text-muted-foreground max-w-xl">{costCenter.description}</p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Switch
                        label={costCenter.isActive ? 'Activo' : 'Inactivo'}
                        labelPosition="right"
                        checked={costCenter.isActive}
                        onChange={() => onStatusChange(costCenter, !costCenter.isActive)}
                        disabled={statusIsUpdating}
                    />
                    <IconButton
                        icon="edit"
                        variant="ghost"
                        aria-label="Editar centro de costo"
                        onClick={() => onEdit(costCenter)}
                    />
                </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
                <Badge variant="info-outlined">{typeLabels[costCenter.type] ?? costCenter.type}</Badge>
                <Badge variant="secondary-outlined">{branchLabel}</Badge>
                <Badge variant="secondary">{parentLabel}</Badge>
            </div>
        </article>
    );
};

export default CostCenterCard;
