'use client';

import Badge from '@/app/baseComponents/Badge/Badge';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import Switch from '@/app/baseComponents/Switch/Switch';
import { UnitAdminSummary } from '@/app/actions/units';

interface UnitCardProps {
    unit: UnitAdminSummary;
    onEdit: () => void;
    onToggleActive: (nextActive: boolean) => void;
    pending?: boolean;
    dimensionLabel: string;
}

function formatConversion(value: number): string {
    return new Intl.NumberFormat('es-CL', {
        minimumFractionDigits: 0,
        maximumFractionDigits: value >= 1 ? 4 : 6,
    }).format(value);
}

const UnitCard: React.FC<UnitCardProps> = ({ unit, onEdit, onToggleActive, pending = false, dimensionLabel }) => {
    const conversionInfo = unit.isBase
        ? `Unidad base de ${dimensionLabel.toLowerCase()}`
        : `1 ${unit.symbol} = ${formatConversion(unit.conversionFactor)} ${unit.baseUnitSymbol}`;

    return (
        <div className="bg-white border border-neutral-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow" data-test-id={`unit-card-${unit.id}`}>
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-neutral-900">{unit.name}</h3>
                        <Badge variant="primary-outlined">{unit.symbol}</Badge>
                        <Badge variant={unit.isBase ? 'info' : 'secondary-outlined'}>
                            {unit.isBase ? 'Base' : 'Derivada'}
                        </Badge>
                        <Badge variant="secondary-outlined">{dimensionLabel}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-neutral-600">{conversionInfo}</p>
                    {!unit.isBase && (
                        <p className="mt-1 text-xs text-neutral-500">
                            Unidad base: {unit.baseUnitName} ({unit.baseUnitSymbol})
                        </p>
                    )}
                    {unit.isBase && (
                        <p className="mt-1 text-xs text-neutral-500">
                            Derivadas activas: {unit.derivedCount}
                        </p>
                    )}
                </div>
                <IconButton
                    icon="edit"
                    variant="basicSecondary"
                    size="xs"
                    onClick={onEdit}
                    aria-label="Editar unidad"
                    data-test-id={`unit-card-edit-${unit.id}`}
                />
            </div>

            <div className="mt-4 pt-4 border-t border-neutral-100 flex items-center justify-between">
                <Badge variant={unit.active ? 'success' : 'secondary'}>
                    {unit.active ? 'Activa' : 'Inactiva'}
                </Badge>
                <Switch
                    label="Unidad activa"
                    checked={unit.active}
                    onChange={(checked) => onToggleActive(checked)}
                    disabled={pending}
                    data-test-id={`unit-card-toggle-${unit.id}`}
                />
            </div>
        </div>
    );
};

export default UnitCard;
