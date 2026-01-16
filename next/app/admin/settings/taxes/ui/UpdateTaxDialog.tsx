'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import Select from '@/app/baseComponents/Select/Select';
import Switch from '@/app/baseComponents/Switch/Switch';
import { Button } from '@/app/baseComponents/Button/Button';
import Alert from '@/app/baseComponents/Alert/Alert';
import { useAlert } from '@/app/globalstate/alert/useAlert';
import { updateTax } from '@/app/actions/taxes';
import { TaxType } from './TaxCard';

interface UpdateTaxDialogProps {
    open: boolean;
    onClose: () => void;
    tax: TaxType;
    lockCode?: boolean;
    'data-test-id'?: string;
}

const taxTypeOptions = [
    { id: 'IVA', label: 'IVA' },
    { id: 'EXEMPT', label: 'Exento' },
    { id: 'RETENTION', label: 'Retención' },
    { id: 'SPECIFIC', label: 'Específico' },
];

const UpdateTaxDialog: React.FC<UpdateTaxDialogProps> = ({ 
    open, 
    onClose,
    tax,
    lockCode = false,
    'data-test-id': dataTestId 
}) => {
    const router = useRouter();
    const { success, error: showError } = useAlert();
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        name: tax.name,
        code: tax.code,
        taxType: tax.taxType,
        rate: tax.rate.toString(),
        description: tax.description || '',
        isDefault: tax.isDefault,
        isActive: tax.isActive,
    });

    useEffect(() => {
        setFormData({
            name: tax.name,
            code: tax.code,
            taxType: tax.taxType,
            rate: tax.rate.toString(),
            description: tax.description || '',
            isDefault: tax.isDefault,
            isActive: tax.isActive,
        });
    }, [tax]);

    const handleChange = (field: string, value: any) => {
        if (lockCode && field === 'code') {
            return;
        }

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
            const payload: Parameters<typeof updateTax>[1] = {
                name: formData.name,
                taxType: formData.taxType as any,
                rate: parseFloat(formData.rate),
                description: formData.description || undefined,
                isDefault: formData.isDefault,
                isActive: formData.isActive,
            };

            if (!lockCode) {
                payload.code = formData.code;
            }

            const result = await updateTax(tax.id, payload);

            if (result.success) {
                success('Impuesto actualizado correctamente');
                setTimeout(() => {
                    onClose();
                    router.refresh();
                    setIsSubmitting(false);
                }, 300);
            } else {
                setErrors([result.error || 'Error al actualizar el impuesto']);
                setIsSubmitting(false);
            }
        } catch (err: any) {
            setErrors([err?.message || 'Error al actualizar el impuesto']);
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setFormData({
            name: tax.name,
            code: tax.code,
            taxType: tax.taxType,
            rate: tax.rate.toString(),
            description: tax.description || '',
            isDefault: tax.isDefault,
            isActive: tax.isActive,
        });
        setErrors([]);
        onClose();
    };

    return (
        <Dialog 
            open={open} 
            onClose={handleClose} 
            title="Editar Impuesto"
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
                        data-test-id="update-tax-name"
                    />
                    
                    <TextField
                        label="Código"
                        value={formData.code}
                        onChange={(e) => handleChange('code', e.target.value)}
                        disabled={lockCode}
                        required
                        data-test-id="update-tax-code"
                    />
                    
                    <Select
                        label="Tipo de Impuesto"
                        options={taxTypeOptions}
                        value={formData.taxType}
                        onChange={(val) => handleChange('taxType', val)}
                        data-test-id="update-tax-type"
                    />
                    
                    <TextField
                        label="Tasa (%)"
                        type="number"
                        value={formData.rate}
                        onChange={(e) => handleChange('rate', e.target.value)}
                        required
                        data-test-id="update-tax-rate"
                    />
                    
                    <TextField
                        label="Descripción"
                        value={formData.description}
                        onChange={(e) => handleChange('description', e.target.value)}
                        data-test-id="update-tax-description"
                    />
                    
                    <Switch
                        label="Impuesto por Defecto"
                        checked={formData.isDefault}
                        onChange={(checked) => handleChange('isDefault', checked)}
                        data-test-id="update-tax-default"
                    />
                    
                    <Switch
                        label="Activo"
                        checked={formData.isActive}
                        onChange={(checked) => handleChange('isActive', checked)}
                        data-test-id="update-tax-active"
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
                        {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
};

export default UpdateTaxDialog;
