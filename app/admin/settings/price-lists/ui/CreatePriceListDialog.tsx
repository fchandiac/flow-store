'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import Select from '@/app/baseComponents/Select/Select';
import Switch from '@/app/baseComponents/Switch/Switch';
import { Button } from '@/app/baseComponents/Button/Button';
import Alert from '@/app/baseComponents/Alert/Alert';
import { useAlert } from '@/app/globalstate/alert/useAlert';
import { createPriceList } from '@/app/actions/priceLists';

interface CreatePriceListDialogProps {
    open: boolean;
    onClose: () => void;
    'data-test-id'?: string;
}

const priceListTypeOptions = [
    { id: 'RETAIL', label: 'Minorista' },
    { id: 'WHOLESALE', label: 'Mayorista' },
    { id: 'VIP', label: 'VIP' },
    { id: 'PROMOTIONAL', label: 'Promocional' },
];

const CreatePriceListDialog: React.FC<CreatePriceListDialogProps> = ({ 
    open, 
    onClose,
    'data-test-id': dataTestId 
}) => {
    const router = useRouter();
    const { success, error: showError } = useAlert();
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        name: '',
        priceListType: 'RETAIL',
        validFrom: '',
        validUntil: '',
        priority: '0',
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
        
        if (validationErrors.length > 0) {
            setErrors(validationErrors);
            return;
        }

        setIsSubmitting(true);
        setErrors([]);

        try {
            const result = await createPriceList({
                name: formData.name,
                priceListType: formData.priceListType as any,
                validFrom: formData.validFrom ? new Date(formData.validFrom) : undefined,
                validUntil: formData.validUntil ? new Date(formData.validUntil) : undefined,
                priority: parseInt(formData.priority) || 0,
                description: formData.description || undefined,
                isDefault: formData.isDefault,
            });

            if (result.success) {
                success('Lista de precios creada correctamente');
                setFormData({
                    name: '',
                    priceListType: 'RETAIL',
                    validFrom: '',
                    validUntil: '',
                    priority: '0',
                    description: '',
                    isDefault: false,
                });

                setTimeout(() => {
                    onClose();
                    router.refresh();
                    setIsSubmitting(false);
                }, 300);
            } else {
                setErrors([result.error || 'Error al crear la lista de precios']);
                setIsSubmitting(false);
            }
        } catch (err: any) {
            setErrors([err?.message || 'Error al crear la lista de precios']);
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setFormData({
            name: '',
            priceListType: 'RETAIL',
            validFrom: '',
            validUntil: '',
            priority: '0',
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
            title="Crear Lista de Precios"
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
                        placeholder="Lista General"
                        data-test-id="create-price-list-name"
                    />
                    
                    <Select
                        label="Tipo de Lista"
                        options={priceListTypeOptions}
                        value={formData.priceListType}
                        onChange={(val) => handleChange('priceListType', val)}
                        data-test-id="create-price-list-type"
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                        <TextField
                            label="Válido Desde"
                            type="date"
                            value={formData.validFrom}
                            onChange={(e) => handleChange('validFrom', e.target.value)}
                            data-test-id="create-price-list-valid-from"
                        />
                        
                        <TextField
                            label="Válido Hasta"
                            type="date"
                            value={formData.validUntil}
                            onChange={(e) => handleChange('validUntil', e.target.value)}
                            data-test-id="create-price-list-valid-until"
                        />
                    </div>
                    
                    <TextField
                        label="Prioridad"
                        type="number"
                        value={formData.priority}
                        onChange={(e) => handleChange('priority', e.target.value)}
                        placeholder="0"
                        data-test-id="create-price-list-priority"
                    />
                    
                    <TextField
                        label="Descripción"
                        value={formData.description}
                        onChange={(e) => handleChange('description', e.target.value)}
                        placeholder="Lista de precios para ventas generales"
                        data-test-id="create-price-list-description"
                    />
                    
                    <Switch
                        label="Lista por Defecto"
                        checked={formData.isDefault}
                        onChange={(checked) => handleChange('isDefault', checked)}
                        data-test-id="create-price-list-default"
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
                        {isSubmitting ? 'Creando...' : 'Crear Lista'}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
};

export default CreatePriceListDialog;
