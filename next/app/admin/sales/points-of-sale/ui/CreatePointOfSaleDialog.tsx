'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import Select from '@/app/baseComponents/Select/Select';
import { Button } from '@/app/baseComponents/Button/Button';
import Alert from '@/app/baseComponents/Alert/Alert';
import { useAlert } from '@/app/globalstate/alert/useAlert';
import { createPointOfSale } from '@/app/actions/pointsOfSale';

interface BranchType {
    id: string;
    name: string;
}

interface CreatePointOfSaleDialogProps {
    open: boolean;
    onClose: () => void;
    branches: BranchType[];
    priceLists: { id: string; name: string }[];
    'data-test-id'?: string;
}

const CreatePointOfSaleDialog: React.FC<CreatePointOfSaleDialogProps> = ({ 
    open, 
    onClose,
    branches,
    priceLists,
    'data-test-id': dataTestId 
}) => {
    const router = useRouter();
    const { success, error: showError } = useAlert();
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        name: '',
        branchId: branches[0]?.id || '',
        deviceId: '',
        defaultPriceListId: priceLists[0]?.id || '',
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
        if (!formData.branchId) validationErrors.push('La sucursal es requerida');
        if (!formData.defaultPriceListId) validationErrors.push('La lista de precios predeterminada es requerida');
        
        if (validationErrors.length > 0) {
            setErrors(validationErrors);
            return;
        }

        setIsSubmitting(true);
        setErrors([]);

        try {
            const result = await createPointOfSale({
                name: formData.name,
                branchId: formData.branchId,
                deviceId: formData.deviceId || undefined,
                defaultPriceListId: formData.defaultPriceListId,
            });

            if (result.success) {
                success('Punto de venta creado correctamente');
                setFormData({
                    name: '',
                    branchId: branches[0]?.id || '',
                    deviceId: '',
                    defaultPriceListId: priceLists[0]?.id || '',
                });

                setTimeout(() => {
                    onClose();
                    router.refresh();
                    setIsSubmitting(false);
                }, 300);
            } else {
                setErrors([result.error || 'Error al crear el punto de venta']);
                setIsSubmitting(false);
            }
        } catch (err: any) {
            setErrors([err?.message || 'Error al crear el punto de venta']);
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setFormData({
            name: '',
            branchId: branches[0]?.id || '',
            deviceId: '',
            defaultPriceListId: priceLists[0]?.id || '',
        });
        setErrors([]);
        onClose();
    };

    const branchOptions = branches.map(b => ({
        id: b.id,
        label: b.name
    }));

    const priceListOptions = priceLists.map(list => ({
        id: list.id,
        label: list.name,
    }));

    return (
        <Dialog 
            open={open} 
            onClose={handleClose} 
            title="Crear Punto de Venta"
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
                    <Select
                        label="Sucursal"
                        options={branchOptions}
                        value={formData.branchId}
                        onChange={(val) => handleChange('branchId', val)}
                        data-test-id="create-pos-branch"
                    />

                    <Select
                        label="Lista de Precios Predeterminada"
                        options={priceListOptions}
                        value={formData.defaultPriceListId}
                        onChange={(val) => handleChange('defaultPriceListId', val)}
                        disabled={priceListOptions.length === 0}
                        data-test-id="create-pos-default-price-list"
                    />

                    <TextField
                        label="Nombre"
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        required
                        placeholder="Caja 1"
                        data-test-id="create-pos-name"
                    />
                    
                    <TextField
                        label="ID de Dispositivo"
                        value={formData.deviceId}
                        onChange={(e) => handleChange('deviceId', e.target.value)}
                        placeholder="Opcional - para vincular a un dispositivo específico"
                        data-test-id="create-pos-device-id"
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
                        {isSubmitting ? 'Creando...' : 'Crear Punto de Venta'}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
};

export default CreatePointOfSaleDialog;
