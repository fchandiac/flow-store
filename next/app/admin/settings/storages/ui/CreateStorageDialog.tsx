'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import CreateBaseForm, { BaseFormField, BaseFormFieldGroup } from '@/app/baseComponents/BaseForm/CreateBaseForm';
import { useAlert } from '@/app/globalstate/alert/useAlert';
import { createStorage } from '@/app/actions/storages';
import type { StorageCategory, StorageType } from '@/data/entities/Storage';
import { BranchOption, StorageCategoryId, StorageTypeId } from './StorageList';

interface CreateStorageDialogProps {
    open: boolean;
    onClose: () => void;
    branches: BranchOption[];
    'data-test-id'?: string;
}

interface CreateStorageFormState {
    name: string;
    code: string;
    category: StorageCategoryId;
    type: StorageTypeId;
    branchId: string | null;
    capacity: string;
    location: string;
    isDefault: boolean;
}

const categoryOptions = [
    { id: 'IN_BRANCH', label: 'En Sucursal' },
    { id: 'CENTRAL', label: 'Central' },
    { id: 'EXTERNAL', label: 'Externo' },
];

const typeOptions = [
    { id: 'WAREHOUSE', label: 'Depósito' },
    { id: 'STORE', label: 'Tienda' },
    { id: 'COLD_ROOM', label: 'Cámara fría' },
    { id: 'TRANSIT', label: 'Tránsito' },
];

const CreateStorageDialog: React.FC<CreateStorageDialogProps> = ({ open, onClose, branches, 'data-test-id': dataTestId }) => {
    const router = useRouter();
    const { success, error } = useAlert();

    const buildInitialState = useCallback((): CreateStorageFormState => ({
        name: '',
        code: '',
        category: 'IN_BRANCH',
        type: 'WAREHOUSE',
        branchId: branches.length > 0 ? branches[0].id : null,
        capacity: '',
        location: '',
        isDefault: false,
    }), [branches]);

    const [formData, setFormData] = useState<CreateStorageFormState>(buildInitialState);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);

    const branchOptions = useMemo(() => branches.map(branch => ({ id: branch.id, label: branch.name })), [branches]);

    const handleChange = (field: keyof CreateStorageFormState, value: any) => {
        setFormData(prev => {
            if (field === 'category') {
                const nextCategory = value as StorageCategoryId;
                const defaultBranchId = branches.length > 0 ? branches[0].id : null;
                return {
                    ...prev,
                    category: nextCategory,
                    branchId: nextCategory === 'IN_BRANCH' ? (prev.branchId ?? defaultBranchId) : null,
                };
            }

            if (field === 'branchId') {
                return {
                    ...prev,
                    branchId: value ? String(value) : null,
                };
            }

            if (field === 'capacity') {
                return {
                    ...prev,
                    capacity: value === undefined || value === null ? '' : String(value),
                };
            }

            if (field === 'isDefault') {
                return {
                    ...prev,
                    isDefault: Boolean(value),
                };
            }

            return {
                ...prev,
                [field]: value,
            };
        });
    };

    const validate = (values: CreateStorageFormState) => {
        const validationErrors: string[] = [];
        if (!values.name.trim()) {
            validationErrors.push('El nombre es requerido');
        }
        if (!values.category) {
            validationErrors.push('La categoría es requerida');
        }
        if (!values.type) {
            validationErrors.push('El tipo es requerido');
        }
        if (values.category === 'IN_BRANCH' && !values.branchId) {
            validationErrors.push('Debes seleccionar una sucursal para esta categoría');
        }
        const capacityValue = values.capacity.trim();
        if (capacityValue && Number.isNaN(Number(capacityValue))) {
            validationErrors.push('La capacidad debe ser un número válido');
        }
        return validationErrors;
    };

    const resetState = () => {
        setFormData(buildInitialState());
        setErrors([]);
        setIsSubmitting(false);
    };

    const handleSubmit = async () => {
        const validationErrors = validate(formData);
        if (validationErrors.length > 0) {
            setErrors(validationErrors);
            return;
        }

        setIsSubmitting(true);
        setErrors([]);

        try {
            const normalizedCapacity = formData.capacity.trim();
            const result = await createStorage({
                name: formData.name.trim(),
                code: formData.code.trim() || undefined,
                category: formData.category as StorageCategory,
                type: formData.type as StorageType,
                branchId: formData.category === 'IN_BRANCH' ? formData.branchId : undefined,
                capacity: normalizedCapacity ? Number(normalizedCapacity) : undefined,
                location: formData.location.trim() || undefined,
                isDefault: formData.isDefault,
            });

            if (!result.success) {
                const message = result.error || 'No se pudo crear el almacén';
                setErrors([message]);
                error(message);
                setIsSubmitting(false);
                return;
            }

            success('Almacén creado correctamente');
            resetState();
            setTimeout(() => {
                onClose();
                router.refresh();
            }, 300);
        } catch (err: any) {
            const message = err?.message || 'Error inesperado al crear el almacén';
            setErrors([message]);
            error(message);
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const fieldGroups: BaseFormFieldGroup[] = useMemo(() => {
        const fields: BaseFormField[] = [
            {
                name: 'name',
                label: 'Nombre',
                type: 'text',
                required: true,
            },
            {
                name: 'code',
                label: 'Código',
                type: 'text',
            },
            {
                name: 'category',
                label: 'Categoría',
                type: 'select',
                required: true,
                options: categoryOptions,
            },
            {
                name: 'type',
                label: 'Tipo',
                type: 'select',
                required: true,
                options: typeOptions,
            },
            ...(formData.category === 'IN_BRANCH'
                ? [{
                    name: 'branchId',
                    label: 'Sucursal',
                    type: 'select',
                    required: true,
                    options: branchOptions,
                } satisfies BaseFormField]
                : []),
            {
                name: 'capacity',
                label: 'Capacidad',
                type: 'number',
            },
            {
                name: 'location',
                label: 'Ubicación',
                type: 'text',
            },
            {
                name: 'isDefault',
                label: 'Marcar como predeterminada',
                type: 'switch',
                labelPosition: 'left',
            },
        ];

        return [
            {
                id: 'storage-create-fields',
                columns: 2,
                fields,
            },
        ];
    }, [formData.category, branchOptions]);

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            title=""
            hideActions
            scroll="body"
            data-test-id={dataTestId}
        >
            <CreateBaseForm
                fields={fieldGroups}
                values={formData}
                onChange={(field, value) => handleChange(field as keyof CreateStorageFormState, value)}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                submitLabel="Crear almacén"
                title="Registrar un nuevo almacén"
                subtitle="Completa la información para habilitar un nuevo almacén"
                errors={errors}
                validate={() => validate(formData)}
                cancelButton
                cancelButtonText="Cancelar"
                onCancel={handleClose}
                data-test-id="create-storage-form"
            />
        </Dialog>
    );
};

export default CreateStorageDialog;
