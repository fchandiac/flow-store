'use client';

import { useEffect, useMemo, useState } from 'react';
import Dialog from '@/baseComponents/Dialog/Dialog';
import CreateBaseForm, { type BaseFormFieldGroup } from '@/baseComponents/BaseForm/CreateBaseForm';
import { useAlert } from '@/globalstate/alert/useAlert';
import { updateCostCenter } from '@/actions/costCenters';
import { CostCenterType } from '@/data/entities/CostCenter';
import type { BranchOption, CostCenterSummary } from './types';

interface UpdateCostCenterDialogProps {
    open: boolean;
    onClose: () => void;
    costCenter: CostCenterSummary | null;
    branches: BranchOption[];
    costCenters: CostCenterSummary[];
    onSuccess: () => void;
    'data-test-id'?: string;
}

const costCenterTypeOptions = [
    { id: CostCenterType.SALES, label: 'Ventas' },
    { id: CostCenterType.OPERATIONS, label: 'Operaciones' },
    { id: CostCenterType.ADMIN, label: 'Administración' },
    { id: CostCenterType.MARKETING, label: 'Marketing' },
    { id: CostCenterType.OTHER, label: 'Otros' },
];

const emptyFormState = {
    code: '',
    name: '',
    description: '',
    type: CostCenterType.OTHER,
    branchId: '',
    parentId: '',
    isActive: true,
};

const UpdateCostCenterDialog: React.FC<UpdateCostCenterDialogProps> = ({
    open,
    onClose,
    costCenter,
    branches,
    costCenters,
    onSuccess,
    'data-test-id': dataTestId,
}) => {
    const { success, error } = useAlert();

    const [formData, setFormData] = useState(emptyFormState);
    const [errors, setErrors] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!costCenter) {
            setFormData(emptyFormState);
            return;
        }
        setFormData({
            code: costCenter.code,
            name: costCenter.name,
            description: costCenter.description ?? '',
            type: costCenter.type,
            branchId: costCenter.branchId ?? '',
            parentId: costCenter.parentId ?? '',
            isActive: costCenter.isActive,
        });
    }, [costCenter]);

    const branchOptions = useMemo(() => {
        const activeBranches = branches.filter((branch) => branch.isActive || branch.id === costCenter?.branchId);
        return [
            { id: '', label: 'Sin sucursal asociada' },
            ...activeBranches.map((branch) => ({ id: branch.id, label: branch.name })),
        ];
    }, [branches, costCenter?.branchId]);

    const parentOptions = useMemo(() => {
        const availableParents = costCenters.filter((center) => center.id !== costCenter?.id && center.isActive);
        return [
            { id: '', label: 'Raíz (sin padre)' },
            ...availableParents.map((center) => ({ id: center.id, label: `${center.code} · ${center.name}` })),
        ];
    }, [costCenter?.id, costCenters]);

    const handleChange = (field: string, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const validate = (): string[] => {
        const validationErrors: string[] = [];
        if (!formData.code.trim()) {
            validationErrors.push('El código es requerido.');
        }
        if (!formData.name.trim()) {
            validationErrors.push('El nombre es requerido.');
        }
        if (!formData.type) {
            validationErrors.push('Debes seleccionar un tipo válido.');
        }
        return validationErrors;
    };

    const fields: BaseFormFieldGroup[] = useMemo(() => {
        return [
            {
                id: 'identity',
                columns: 2,
                fields: [
                    {
                        name: 'code',
                        label: 'Código interno',
                        type: 'text',
                        required: true,
                    },
                    {
                        name: 'name',
                        label: 'Nombre',
                        type: 'text',
                        required: true,
                    },
                    {
                        name: 'type',
                        label: 'Tipo',
                        type: 'select',
                        required: true,
                        options: costCenterTypeOptions,
                    },
                    {
                        name: 'isActive',
                        label: 'Centro activo',
                        type: 'switch',
                        labelPosition: 'left',
                    },
                ],
            },
            {
                id: 'associations',
                title: 'Asociaciones',
                columns: 2,
                fields: [
                    {
                        name: 'branchId',
                        label: 'Sucursal asociada',
                        type: 'select',
                        options: branchOptions,
                    },
                    {
                        name: 'parentId',
                        label: 'Centro padre',
                        type: 'select',
                        options: parentOptions,
                    },
                ],
            },
            {
                id: 'notes',
                columns: 1,
                fields: [
                    {
                        name: 'description',
                        label: 'Descripción / alcance',
                        type: 'textarea',
                        rows: 3,
                    },
                ],
            },
        ];
    }, [branchOptions, parentOptions]);

    const handleSubmit = async () => {
        if (!costCenter) {
            return;
        }

        const validationErrors = validate();
        if (validationErrors.length > 0) {
            setErrors(validationErrors);
            return;
        }

        setIsSubmitting(true);
        setErrors([]);

        try {
            const result = await updateCostCenter(costCenter.id, {
                code: formData.code,
                name: formData.name,
                description: formData.description || null,
                type: formData.type,
                branchId: formData.branchId || null,
                parentId: formData.parentId || null,
                isActive: formData.isActive,
            });

            if (!result.success) {
                error(result.error ?? 'No fue posible actualizar el centro de costo.');
                setIsSubmitting(false);
                return;
            }

            success('Centro de costo actualizado correctamente.');
            onSuccess();
        } catch (err) {
            console.error('[UpdateCostCenterDialog] Submit error', err);
            error('Ocurrió un error inesperado.');
            setIsSubmitting(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setErrors([]);
        onClose();
    };

    return (
        <Dialog
            open={open && Boolean(costCenter)}
            onClose={handleClose}
            hideActions
            title=""
            scroll="body"
            data-test-id={dataTestId}
        >
            <CreateBaseForm
                fields={fields}
                values={formData}
                onChange={handleChange}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                submitLabel="Guardar cambios"
                title="Editar centro de costo"
                subtitle={costCenter ? `${costCenter.code} · ${costCenter.name}` : ''}
                errors={errors}
                validate={() => validate()}
                cancelButton
                cancelButtonText="Cancelar"
                onCancel={handleClose}
                data-test-id="update-cost-center-form"
            />
        </Dialog>
    );
};

export default UpdateCostCenterDialog;
