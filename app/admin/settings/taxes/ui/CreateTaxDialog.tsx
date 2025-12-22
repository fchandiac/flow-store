'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import Select from '@/app/baseComponents/Select/Select';
import Switch from '@/app/baseComponents/Switch/Switch';
import { Button } from '@/app/baseComponents/Button/Button';
import Alert from '@/app/baseComponents/Alert/Alert';
import { useAlert } from '@/app/state/hooks/useAlert';
import { createTax } from '@/app/actions/taxes';

interface CreateTaxDialogProps {
    open: boolean;
    onClose: () => void;
    companyId: string;
    'data-test-id'?: string;
}

const taxTypeOptions = [
    { id: 'IVA', label: 'IVA' },
    { id: 'EXEMPT', label: 'Exento' },
    { id: 'RETENTION', label: 'Retención' },
    { id: 'SPECIFIC', label: 'Específico' },
];

const CreateTaxDialog: React.FC<CreateTaxDialogProps> = ({ 
    open, 
    onClose,
    companyId,
    'data-test-id': dataTestId 
}) => {
    const router = useRouter();
    const { success, error: showError } = useAlert();
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        name: '',
        code: '',
        taxType: 'IVA',
        rate: '',
        description: '',
        isDefault: false,
    });

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const validationErrors: string[] = [];
        if (!formData.name.trim()) validationErrors.push('El nombre es requerido');
        if (!formData.code.trim()) validationErrors.push('El código es requerido');
        if (!formData.rate) validationErrors.push('La tasa es requerida');
        
        if (validationErrors.length > 0) {
            setErrors(validationErrors);
            return;
        }

        setIsSubmitting(true);
        setErrors([]);

        try {
            const result = await createTax({
                companyId,
                name: formData.name,
                code: formData.code,
                taxType: formData.taxType as any,
                rate: parseFloat(formData.rate),
                description: formData.description || undefined,
                isDefault: formData.isDefault,
            });

            if (result.success) {
                success('Impuesto creado correctamente');
                setFormData({
                    name: '',
                    code: '',
                    taxType: 'IVA',
                    rate: '',
                    description: '',
                    isDefault: false,
                });

                setTimeout(() => {
                    onClose();
                    router.refresh();
                    setIsSubmitting(false);
                }, 300);
            } else {
                setErrors([result.error || 'Error al crear el impuesto']);
                setIsSubmitting(false);
            }
        } catch (err: any) {
            setErrors([err?.message || 'Error al crear el impuesto']);
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setFormData({
            name: '',
            code: '',
            taxType: 'IVA',
            rate: '',
            description: '',
            isDefault: false,
        });
        setErrors([]);
        onClose();
    };

    return (
        <Dialog 
            open={open} 
            onClose={handleClose} 
            title="Crear Impuesto"
            data-test-id={dataTestId}
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {errors.length > 0 && (
                    <Alert variant="error">
                        <ul className="list-disc list-inside">
                            {errors.map((err, i) => (
                                <li key={i}>{err}</li>
                            ))}
                        </ul>
                    </Alert>
                )}

                <div className="space-y-4">
                    <TextField
                        label="Nombre"
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        required
                        placeholder="IVA 19%"
                        data-test-id="create-tax-name"
                    />
                    
                    <TextField
                        label="Código"
                        value={formData.code}
                        onChange={(e) => handleChange('code', e.target.value)}
                        required
                        placeholder="IVA19"
                        data-test-id="create-tax-code"
                    />
                    
                    <Select
                        label="Tipo de Impuesto"
                        options={taxTypeOptions}
                        value={formData.taxType}
                        onChange={(val) => handleChange('taxType', val)}
                        data-test-id="create-tax-type"
                    />
                    
                    <TextField
                        label="Tasa (%)"
                        type="number"
                        value={formData.rate}
                        onChange={(e) => handleChange('rate', e.target.value)}
                        required
                        placeholder="19"
                        data-test-id="create-tax-rate"
                    />
                    
                    <TextField
                        label="Descripción"
                        value={formData.description}
                        onChange={(e) => handleChange('description', e.target.value)}
                        placeholder="Impuesto al valor agregado"
                        data-test-id="create-tax-description"
                    />
                    
                    <Switch
                        label="Impuesto por Defecto"
                        checked={formData.isDefault}
                        onChange={(checked) => handleChange('isDefault', checked)}
                        data-test-id="create-tax-default"
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
                        {isSubmitting ? 'Creando...' : 'Crear Impuesto'}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
};

export default CreateTaxDialog;
