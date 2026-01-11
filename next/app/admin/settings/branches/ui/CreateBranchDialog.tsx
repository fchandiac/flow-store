'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import CreateBaseForm, { BaseFormField } from '@/app/baseComponents/BaseForm/CreateBaseForm';
import { useAlert } from '@/app/globalstate/alert/useAlert';
import { createBranch } from '@/app/actions/branches';

interface CreateBranchDialogProps {
    open: boolean;
    onClose: () => void;
    'data-test-id'?: string;
}

const CreateBranchDialog: React.FC<CreateBranchDialogProps> = ({ 
    open, 
    onClose,
    'data-test-id': dataTestId 
}) => {
    const router = useRouter();
    const { success } = useAlert();
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        name: '',
        address: '',
        phone: '',
        location: null as { lat: number; lng: number } | null,
        isHeadquarters: false,
    });

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const fields: BaseFormField[] = [
        {
            name: 'name',
            label: 'Nombre',
            type: 'text',
            required: true,
        },
        {
            name: 'address',
            label: 'Dirección',
            type: 'text',
        },
        {
            name: 'phone',
            label: 'Teléfono',
            type: 'text',
        },
        {
            name: 'location',
            label: 'Ubicación',
            type: 'location',
        },
        {
            name: 'isHeadquarters',
            label: 'Es Casa Matriz',
            type: 'switch',
            labelPosition: 'left',
        },
    ];

    const validate = (values: Record<string, any>): string[] => {
        const validationErrors: string[] = [];
        if (!values.name?.trim()) validationErrors.push('El nombre es requerido');
        return validationErrors;
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
            const result = await createBranch({
                name: formData.name,
                address: formData.address || undefined,
                phone: formData.phone || undefined,
                location: formData.location || undefined,
                isHeadquarters: formData.isHeadquarters,
            });

            if (result.success) {
                success('Sucursal creada correctamente');
                setFormData({
                    name: '',
                    address: '',
                    phone: '',
                    location: null,
                    isHeadquarters: false,
                });

                setTimeout(() => {
                    onClose();
                    router.refresh();
                    setIsSubmitting(false);
                }, 300);
            } else {
                setErrors([result.error || 'Error al crear la sucursal']);
                setIsSubmitting(false);
            }
        } catch (err: any) {
            setErrors([err?.message || 'Error al crear la sucursal']);
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setFormData({
            name: '',
            address: '',
            phone: '',
            location: null,
            isHeadquarters: false,
        });
        setErrors([]);
        onClose();
    };

    return (
        <Dialog 
            open={open} 
            onClose={handleClose} 
            title=""
            hideActions={true}
            data-test-id={dataTestId}
            scroll='body'
        >
            <CreateBaseForm
                fields={fields}
                values={formData}
                onChange={handleChange}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                submitLabel="Crear Sucursal"
                title="Crear Nueva Sucursal"
                subtitle="Completa los datos para registrar una nueva sucursal en el sistema"
                errors={errors}
                validate={validate}
                cancelButton={true}
                cancelButtonText="Cancelar"
                onCancel={handleClose}
                data-test-id="create-branch-form"
            />
        </Dialog>
    );
};

export default CreateBranchDialog;
