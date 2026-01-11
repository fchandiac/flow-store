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
import { updateStorage } from '@/app/actions/storages';
import type { StorageCategory, StorageType } from '@/data/entities/Storage';
import { BranchOption, StorageListItem } from './StorageList';

interface UpdateStorageDialogProps {
    open: boolean;
    onClose: () => void;
    storage: StorageListItem;
    branches: BranchOption[];
    'data-test-id'?: string;
}

interface UpdateStorageFormState {
    name: string;
    code: string;
    category: StorageListItem['category'];
    type: StorageListItem['type'];
    branchId: string | null;
    capacity: string;
    location: string;
    isDefault: boolean;
    isActive: boolean;
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

const UpdateStorageDialog: React.FC<UpdateStorageDialogProps> = ({
    open,
    onClose,
    storage,
    branches,
    'data-test-id': dataTestId,
}) => {
    const router = useRouter();
    const { success, error: showError } = useAlert();

    const branchOptions = useMemo(() => branches.map((branch) => ({ id: branch.id, label: branch.name })), [branches]);

    const [formData, setFormData] = useState<UpdateStorageFormState>({
        name: storage.name,
        code: storage.code ?? '',
        category: storage.category,
        type: storage.type,
        branchId: storage.branchId ?? null,
        capacity: storage.capacity != null ? String(storage.capacity) : '',
        location: storage.location ?? '',
        isDefault: storage.isDefault,
        isActive: storage.isActive,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);

    useEffect(() => {
        setFormData({
            name: storage.name,
            code: storage.code ?? '',
            category: storage.category,
            type: storage.type,
            branchId: storage.branchId ?? null,
            capacity: storage.capacity != null ? String(storage.capacity) : '',
            location: storage.location ?? '',
            isDefault: storage.isDefault,
            isActive: storage.isActive,
        });
        setErrors([]);
        setIsSubmitting(false);
    }, [storage]);

    const handleChange = (field: keyof UpdateStorageFormState, value: any) => {
        setFormData((prev) => {
            if (field === 'category') {
                const nextCategory = value as StorageListItem['category'];
                return {
                    ...prev,
                    category: nextCategory,
                    branchId: nextCategory === 'IN_BRANCH' ? prev.branchId : null,
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
                    capacity: value ?? '',
                };
            }

            if (field === 'isDefault' || field === 'isActive') {
                return {
                    ...prev,
                    [field]: Boolean(value),
                } as UpdateStorageFormState;
            }

            return {
                ...prev,
                [field]: value,
            } as UpdateStorageFormState;
        });
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        const validationErrors: string[] = [];
        if (!formData.name.trim()) {
            validationErrors.push('El nombre es requerido');
        }
        if (!formData.category) {
            validationErrors.push('La categoría es requerida');
        }
        if (!formData.type) {
            validationErrors.push('El tipo es requerido');
        }
        if (formData.category === 'IN_BRANCH' && !formData.branchId) {
            validationErrors.push('Debes seleccionar una sucursal para esta categoría');
        }

        if (validationErrors.length > 0) {
            setErrors(validationErrors);
            return;
        }

        setIsSubmitting(true);
        setErrors([]);

        try {
            const normalizedCapacity = formData.capacity.trim();
            const result = await updateStorage(storage.id, {
                name: formData.name.trim(),
                code: formData.code.trim() || undefined,
                category: formData.category as StorageCategory,
                type: formData.type as StorageType,
                branchId: formData.category === 'IN_BRANCH' ? formData.branchId : null,
                capacity: normalizedCapacity ? Number(normalizedCapacity) : undefined,
                location: formData.location.trim() || undefined,
                isDefault: formData.isDefault,
                isActive: formData.isActive,
            });

            if (!result.success) {
                const message = result.error || 'No se pudo actualizar el almacén';
                setErrors([message]);
                showError(message);
                setIsSubmitting(false);
                return;
            }

            success('Almacén actualizado correctamente');
            setTimeout(() => {
                onClose();
                router.refresh();
                setIsSubmitting(false);
            }, 300);
        } catch (err: any) {
            const message = err?.message || 'Error inesperado al actualizar el almacén';
            setErrors([message]);
            showError(message);
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setFormData({
            name: storage.name,
            code: storage.code ?? '',
            category: storage.category,
            type: storage.type,
            branchId: storage.branchId ?? null,
            capacity: storage.capacity != null ? String(storage.capacity) : '',
            location: storage.location ?? '',
            isDefault: storage.isDefault,
            isActive: storage.isActive,
        });
        setErrors([]);
        onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            title="Editar almacén"
            data-test-id={dataTestId}
        >
            <form onSubmit={handleSubmit} className="space-y-6" data-test-id="update-storage-form">
                {errors.length > 0 && (
                    <Alert variant="error">
                        <ul className="list-disc list-inside">
                            {errors.map((err, index) => (
                                <li key={index}>{err}</li>
                            ))}
                        </ul>
                    </Alert>
                )}

                <div className="space-y-4">
                    <TextField
                        label="Nombre"
                        value={formData.name}
                        onChange={(event) => handleChange('name', event.target.value)}
                        required
                        data-test-id="update-storage-name"
                    />

                    <TextField
                        label="Código"
                        value={formData.code}
                        onChange={(event) => handleChange('code', event.target.value)}
                        data-test-id="update-storage-code"
                    />

                    <Select
                        label="Categoría"
                        options={categoryOptions}
                        value={formData.category}
                        onChange={(value) => handleChange('category', value)}
                        data-test-id="update-storage-category"
                    />

                    <Select
                        label="Tipo"
                        options={typeOptions}
                        value={formData.type}
                        onChange={(value) => handleChange('type', value)}
                        data-test-id="update-storage-type"
                    />

                    {formData.category === 'IN_BRANCH' && (
                        <Select
                            label="Sucursal"
                            options={branchOptions}
                            value={formData.branchId}
                            onChange={(value) => handleChange('branchId', value)}
                            data-test-id="update-storage-branch"
                        />
                    )}

                    <TextField
                        label="Capacidad"
                        type="number"
                        value={formData.capacity}
                        onChange={(event) => handleChange('capacity', event.target.value)}
                        data-test-id="update-storage-capacity"
                    />

                    <TextField
                        label="Ubicación"
                        value={formData.location}
                        onChange={(event) => handleChange('location', event.target.value)}
                        data-test-id="update-storage-location"
                    />

                    <Switch
                        label="Marcar como predeterminado"
                        checked={formData.isDefault}
                        onChange={(checked) => handleChange('isDefault', checked)}
                        data-test-id="update-storage-default"
                    />

                    <Switch
                        label="Activo"
                        checked={formData.isActive}
                        onChange={(checked) => handleChange('isActive', checked)}
                        data-test-id="update-storage-active"
                    />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200">
                    <Button
                        variant="outlined"
                        onClick={handleClose}
                        disabled={isSubmitting}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
};

export default UpdateStorageDialog;
