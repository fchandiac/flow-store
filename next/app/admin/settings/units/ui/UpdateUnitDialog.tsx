'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import Select from '@/app/baseComponents/Select/Select';
import Switch from '@/app/baseComponents/Switch/Switch';
import { Button } from '@/app/baseComponents/Button/Button';
import Alert from '@/app/baseComponents/Alert/Alert';
import { useAlert } from '@/app/globalstate/alert/useAlert';
import { UnitAdminSummary, updateUnit } from '@/app/actions/units';
import { UnitDimension } from '@/data/entities/unit-dimension.enum';

interface UpdateUnitDialogProps {
    open: boolean;
    onClose: () => void;
    unit: UnitAdminSummary | null;
    dimensionLabels: Record<UnitDimension, string>;
    baseUnits: UnitAdminSummary[];
}

const defaultFormState = {
    name: '',
    symbol: '',
    dimension: UnitDimension.COUNT,
    conversionFactor: '1',
    isBase: true,
    baseUnitId: '',
};

const dimensionOptions = [
    { id: UnitDimension.COUNT, label: 'Conteo' },
    { id: UnitDimension.MASS, label: 'Masa' },
    { id: UnitDimension.LENGTH, label: 'Longitud' },
    { id: UnitDimension.VOLUME, label: 'Volumen' },
];

const UpdateUnitDialog: React.FC<UpdateUnitDialogProps> = ({ open, onClose, unit, dimensionLabels, baseUnits }) => {
    const router = useRouter();
    const { success, error } = useAlert();

    const [formData, setFormData] = useState(defaultFormState);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);

    const resetState = () => {
        setFormData(defaultFormState);
        setErrors([]);
        setIsSubmitting(false);
    };

    useEffect(() => {
        if (!open) {
            resetState();
            return;
        }
        if (unit) {
            setFormData({
                name: unit.name,
                symbol: unit.symbol,
                dimension: unit.dimension,
                conversionFactor: String(unit.conversionFactor ?? 1),
                isBase: unit.isBase,
                baseUnitId: unit.isBase ? '' : unit.baseUnitId,
            });
        }
    }, [open, unit]);

    const availableBaseUnits = useMemo(() => {
        if (!formData.dimension) {
            return [] as UnitAdminSummary[];
        }
        return baseUnits.filter((candidate) => candidate.isBase && candidate.active && candidate.dimension === formData.dimension);
    }, [baseUnits, formData.dimension]);

    const selectableBaseUnits = useMemo(() => {
        const options = availableBaseUnits.map((candidate) => ({
            id: candidate.id,
            label: `${candidate.symbol} · ${candidate.name}`,
        }));

        if (unit && !unit.isBase) {
            const exists = options.some((option) => option.id === unit.baseUnitId);
            if (!exists) {
                options.push({
                    id: unit.baseUnitId,
                    label: `${unit.baseUnitSymbol} · ${unit.baseUnitName} (inactiva)`,
                });
            }
        }

        return options;
    }, [availableBaseUnits, unit]);

    useEffect(() => {
        if (!open) {
            return;
        }
        if (formData.isBase) {
            setFormData((prev) => ({ ...prev, baseUnitId: '' }));
            return;
        }
        if (!formData.baseUnitId && selectableBaseUnits.length > 0) {
            setFormData((prev) => ({ ...prev, baseUnitId: selectableBaseUnits[0].id }));
        }
    }, [open, formData.isBase, formData.baseUnitId, selectableBaseUnits]);

    const handleChange = (field: string, value: any) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    if (!unit) {
        return null;
    }

    const disableBaseToggle = unit.isBase && unit.derivedCount > 0;

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        const validationErrors: string[] = [];
        if (!formData.name.trim()) {
            validationErrors.push('El nombre es requerido');
        }
        if (!formData.symbol.trim()) {
            validationErrors.push('El símbolo es requerido');
        }
        const conversionValue = Number(formData.conversionFactor);
        if (!Number.isFinite(conversionValue) || conversionValue <= 0) {
            validationErrors.push('El factor de conversión debe ser mayor que cero');
        }
        if (!formData.isBase && !formData.baseUnitId) {
            validationErrors.push('Debe seleccionar una unidad base');
        }

        if (validationErrors.length > 0) {
            setErrors(validationErrors);
            return;
        }

        setIsSubmitting(true);
        setErrors([]);

        try {
            const result = await updateUnit(unit.id, {
                name: formData.name.trim(),
                symbol: formData.symbol.trim(),
                dimension: formData.dimension,
                conversionFactor: conversionValue,
                isBase: formData.isBase,
                baseUnitId: formData.isBase ? undefined : formData.baseUnitId,
            });

            if (result.success) {
                success('Unidad actualizada correctamente');
                setTimeout(() => {
                    onClose();
                    router.refresh();
                    setIsSubmitting(false);
                }, 300);
            } else {
                error(result.error || 'No se pudo actualizar la unidad');
                setIsSubmitting(false);
            }
        } catch (err: any) {
            error(err?.message || 'No se pudo actualizar la unidad');
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog
            open={open && Boolean(unit)}
            onClose={handleClose}
            title={`Editar unidad ${unit.symbol}`}
            size="md"
            data-test-id="update-unit-dialog"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {errors.length > 0 && (
                    <Alert variant="error">
                        <ul className="list-disc list-inside">
                            {errors.map((errMsg, index) => (
                                <li key={index}>{errMsg}</li>
                            ))}
                        </ul>
                    </Alert>
                )}

                <TextField
                    label="Nombre"
                    required
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    data-test-id="update-unit-name"
                />

                <TextField
                    label="Símbolo"
                    required
                    value={formData.symbol}
                    onChange={(e) => handleChange('symbol', e.target.value)}
                    data-test-id="update-unit-symbol"
                />

                <Select
                    label="Dimensión"
                    value={formData.dimension}
                    onChange={(value) => handleChange('dimension', (value as UnitDimension) || UnitDimension.COUNT)}
                    options={dimensionOptions}
                    placeholder="Seleccionar dimensión"
                    data-test-id="update-unit-dimension"
                />

                <TextField
                    label="Factor de conversión"
                    type="number"
                    min="0"
                    step="0.000001"
                    required
                    value={formData.conversionFactor}
                    onChange={(e) => handleChange('conversionFactor', e.target.value)}
                    data-test-id="update-unit-conversion"
                />
                <p className="text-xs text-muted-foreground -mt-2">
                    {formData.isBase
                        ? 'Las unidades base suelen tener factor 1.'
                        : `Equivale a ${dimensionLabels[formData.dimension].toLowerCase()} respecto a la unidad base seleccionada.`}
                </p>

                <Switch
                    label="Definir como unidad base"
                    checked={formData.isBase}
                    onChange={(checked) => handleChange('isBase', checked)}
                    disabled={disableBaseToggle}
                    data-test-id="update-unit-is-base"
                />
                {disableBaseToggle && (
                    <p className="text-xs text-muted-foreground -mt-2">
                        Esta unidad no puede dejar de ser base porque tiene derivadas asociadas.
                    </p>
                )}

                {!formData.isBase && (
                    <Select
                        label="Unidad base"
                        value={formData.baseUnitId}
                        onChange={(value) => handleChange('baseUnitId', value?.toString() || '')}
                        options={selectableBaseUnits}
                        placeholder="Seleccionar unidad base"
                        disabled={selectableBaseUnits.length === 0}
                        data-test-id="update-unit-base"
                    />
                )}

                {!formData.isBase && selectableBaseUnits.length === 0 && (
                    <Alert variant="warning">
                        No existen unidades base activas en la dimensión seleccionada. Crea o activa una unidad base para continuar.
                    </Alert>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={handleClose}
                        disabled={isSubmitting}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        disabled={
                            isSubmitting
                            || (!formData.isBase && selectableBaseUnits.length === 0)
                        }
                    >
                        {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
};

export default UpdateUnitDialog;
