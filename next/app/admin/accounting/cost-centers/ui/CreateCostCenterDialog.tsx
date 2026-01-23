'use client';

import { useMemo, useState } from 'react';
import Dialog from '@/baseComponents/Dialog/Dialog';
import CreateBaseForm, { type BaseFormFieldGroup } from '@/baseComponents/BaseForm/CreateBaseForm';
import { useAlert } from '@/globalstate/alert/useAlert';
import { createCostCenter } from '@/actions/costCenters';
import { CostCenterType } from '@/data/entities/CostCenter';
import type { BranchOption, CostCenterSummary } from './types';

interface CreateCostCenterDialogProps {
    open: boolean;
    onClose: () => void;
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

const defaultFormState = {
    name: '',
    description: '',
    type: CostCenterType.OTHER,
    branchId: '',
    parentId: '',
    isActive: true,
};

const CreateCostCenterDialog: React.FC<CreateCostCenterDialogProps> = ({
    open,
    onClose,
    branches,
    costCenters,
    onSuccess,
    'data-test-id': dataTestId,
}) => {
    const { success, error } = useAlert();

    const [formData, setFormData] = useState(defaultFormState);
    const [errors, setErrors] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const branchOptions = useMemo(() => {
        const activeBranches = branches.filter((branch) => branch.isActive);
        return [
            { id: '', label: 'Sin sucursal asociada' },
            ...activeBranches.map((branch) => ({ id: branch.id, label: branch.name })),
        ];
    }, [branches]);

    const parentOptions = useMemo(() => [
        { id: '', label: 'Raíz (sin padre)' },
        ...costCenters
            .filter((center) => center.isActive)
            .map((center) => ({ id: center.id, label: `${center.code} · ${center.name}` })),
    ], [costCenters]);

    const handleChange = (field: string, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const validate = (values: typeof formData): string[] => {
        const validationErrors: string[] = [];
        if (!values.name.trim()) {
            validationErrors.push('El nombre es requerido.');
        }
        if (!values.type) {
            validationErrors.push('Debes seleccionar un tipo.');
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
        const validationErrors = validate(formData);
        if (validationErrors.length > 0) {
            setErrors(validationErrors);
            return;
        }

        setIsSubmitting(true);
        setErrors([]);

        try {
            const result = await createCostCenter({
                name: formData.name,
                type: formData.type,
                description: formData.description || null,
                branchId: formData.branchId || null,
                parentId: formData.parentId || null,
                isActive: formData.isActive,
            });

            if (!result.success) {
                error(result.error ?? 'No fue posible crear el centro de costo.');
                setIsSubmitting(false);
                return;
            }

            const generatedCode = result.costCenter?.code;
            success(
                generatedCode
                    ? `Centro de costo ${generatedCode} creado correctamente.`
                    : 'Centro de costo creado correctamente.',
            );
            setFormData(defaultFormState);
            onSuccess();
        } catch (err) {
            console.error('[CreateCostCenterDialog] Submit error', err);
            error('Ocurrió un error inesperado.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setFormData(defaultFormState);
        setErrors([]);
        onClose();
    };

    return (
        <Dialog
            open={open}
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
                submitLabel="Crear centro de costo"
                title="Nuevo centro de costo"
                subtitle="Configura jerarquía y alcance para el nuevo centro de costo. El código se asignará automáticamente."
                errors={errors}
                validate={(values) => validate(values as typeof formData)}
                cancelButton
                cancelButtonText="Cancelar"
                onCancel={handleClose}
                data-test-id="create-cost-center-form"
            />
        </Dialog>
    );
};

export default CreateCostCenterDialog;
