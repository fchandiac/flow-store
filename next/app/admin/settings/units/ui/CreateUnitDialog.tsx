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
import { createUnit, UnitAdminSummary } from '@/app/actions/units';
import { UnitDimension } from '@/data/entities/unit-dimension.enum';

interface CreateUnitDialogProps {
    open: boolean;
    onClose: () => void;
    baseUnits: UnitAdminSummary[];
    dimensionLabels: Record<UnitDimension, string>;
}

const dimensionOptions = [
    { id: UnitDimension.COUNT, label: 'Conteo' },
    { id: UnitDimension.MASS, label: 'Masa' },
    { id: UnitDimension.LENGTH, label: 'Longitud' },
    { id: UnitDimension.VOLUME, label: 'Volumen' },
];

const initialFormState = {
    name: '',
    symbol: '',
    dimension: UnitDimension.COUNT,
    conversionFactor: '1',
    isBase: true,
    baseUnitId: '',
    allowDecimals: true,
};

const CreateUnitDialog: React.FC<CreateUnitDialogProps> = ({ open, onClose, dimensionLabels, baseUnits }) => {
    const router = useRouter();
    const { success } = useAlert();

    const [formData, setFormData] = useState(initialFormState);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);

    const activeBaseUnits = useMemo(
        () => baseUnits.filter((unit) => unit.isBase && unit.active),
        [baseUnits],
    );

    const availableBaseUnits = useMemo(
        () => activeBaseUnits.filter((unit) => unit.dimension === formData.dimension),
        [activeBaseUnits, formData.dimension],
    );

    useEffect(() => {
        if (!open) {
            return;
        }
        if (formData.isBase) {
            setFormData((prev) => ({ ...prev, baseUnitId: '' }));
            return;
        }

        const firstBase = availableBaseUnits[0];
        if (firstBase && formData.baseUnitId === '') {
            setFormData((prev) => ({ ...prev, baseUnitId: firstBase.id }));
        }
    }, [open, formData.isBase, formData.baseUnitId, availableBaseUnits]);

    const handleClose = () => {
        setFormData(initialFormState);
        setErrors([]);
        onClose();
    };

    const handleChange = (field: string, value: any) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

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
            const result = await createUnit({
                name: formData.name.trim(),
                symbol: formData.symbol.trim(),
                dimension: formData.dimension,
                conversionFactor: conversionValue,
                isBase: formData.isBase,
                baseUnitId: formData.isBase ? undefined : formData.baseUnitId,
                allowDecimals: formData.allowDecimals,
            });

            if (result.success) {
                success('Unidad creada correctamente');
                setFormData(initialFormState);
                setTimeout(() => {
                    onClose();
                    router.refresh();
                    setIsSubmitting(false);
                }, 300);
            } else {
                setErrors([result.error || 'No se pudo crear la unidad']);
                setIsSubmitting(false);
            }
        } catch (err: any) {
            setErrors([err?.message || 'No se pudo crear la unidad']);
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            title="Crear unidad"
            size="md"
            data-test-id="create-unit-dialog"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {errors.length > 0 && (
                    <Alert variant="error">
                        <ul className="list-disc list-inside">
                            {errors.map((err, index) => (
                                <li key={index}>{err}</li>
                            ))}
                        </ul>
                    </Alert>
                )}

                <TextField
                    label="Nombre"
                    required
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Ej: Kilogramo"
                    data-test-id="create-unit-name"
                />

                <TextField
                    label="Símbolo"
                    required
                    value={formData.symbol}
                    onChange={(e) => handleChange('symbol', e.target.value)}
                    placeholder="Ej: KG"
                    data-test-id="create-unit-symbol"
                />

                <Select
                    label="Dimensión"
                    value={formData.dimension}
                    onChange={(value) => handleChange('dimension', (value as UnitDimension) || UnitDimension.COUNT)}
                    options={dimensionOptions}
                    placeholder="Seleccionar dimensión"
                    data-test-id="create-unit-dimension"
                />

                <TextField
                    label="Factor de conversión"
                    type="number"
                    min="0"
                    step="0.000001"
                    required
                    value={formData.conversionFactor}
                    onChange={(e) => handleChange('conversionFactor', e.target.value)}
                    data-test-id="create-unit-conversion"
                />

                <Switch
                    label="Definir como unidad base"
                    checked={formData.isBase}
                    onChange={(checked) => handleChange('isBase', checked)}
                    data-test-id="create-unit-is-base"
                />

                <Switch
                    label="Permitir cantidades decimales"
                    checked={formData.allowDecimals}
                    onChange={(checked) => handleChange('allowDecimals', checked)}
                    data-test-id="create-unit-allow-decimals"
                />

                {!formData.isBase && (
                    <Select
                        label="Unidad base"
                        value={formData.baseUnitId}
                        onChange={(value) => handleChange('baseUnitId', value?.toString() || '')}
                        options={availableBaseUnits.map((unit) => ({
                            id: unit.id,
                            label: `${unit.symbol} · ${unit.name}`,
                        }))}
                        placeholder="Seleccionar unidad base"
                        disabled={availableBaseUnits.length === 0}
                        data-test-id="create-unit-base"
                    />
                )}

                {!formData.isBase && availableBaseUnits.length === 0 && (
                    <Alert variant="warning">
                        No existen unidades base activas en la dimensión seleccionada. Crea primero una unidad base.
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
                    <Button type="submit" disabled={isSubmitting || (!formData.isBase && availableBaseUnits.length === 0)}>
                        {isSubmitting ? 'Creando...' : 'Crear Unidad'}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
};

export default CreateUnitDialog;
