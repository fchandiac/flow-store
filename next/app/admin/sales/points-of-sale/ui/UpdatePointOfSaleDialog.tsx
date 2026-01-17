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
import { updatePointOfSale } from '@/app/actions/pointsOfSale';
import { PointOfSaleType } from './PointOfSaleCard';

interface UpdatePointOfSaleDialogProps {
    open: boolean;
    onClose: () => void;
    pointOfSale: PointOfSaleType;
    priceLists: { id: string; name: string }[];
    'data-test-id'?: string;
}

const UpdatePointOfSaleDialog: React.FC<UpdatePointOfSaleDialogProps> = ({ 
    open, 
    onClose,
    pointOfSale,
    priceLists,
    'data-test-id': dataTestId 
}) => {
    const router = useRouter();
    const { success, error: showError } = useAlert();
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        name: pointOfSale.name,
        deviceId: pointOfSale.deviceId || '',
        isActive: pointOfSale.isActive,
        defaultPriceListId: pointOfSale.defaultPriceListId,
    });

    useEffect(() => {
        setFormData({
            name: pointOfSale.name,
            deviceId: pointOfSale.deviceId || '',
            isActive: pointOfSale.isActive,
            defaultPriceListId: pointOfSale.defaultPriceListId,
        });
    }, [pointOfSale]);

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
        if (!formData.defaultPriceListId) validationErrors.push('La lista de precios predeterminada es requerida');
        
        if (validationErrors.length > 0) {
            setErrors(validationErrors);
            return;
        }

        setIsSubmitting(true);
        setErrors([]);

        try {
            const result = await updatePointOfSale(pointOfSale.id, {
                name: formData.name,
                deviceId: formData.deviceId || undefined,
                isActive: formData.isActive,
                defaultPriceListId: formData.defaultPriceListId,
            });

            if (result.success) {
                success('Punto de venta actualizado correctamente');
                setTimeout(() => {
                    onClose();
                    router.refresh();
                    setIsSubmitting(false);
                }, 300);
            } else {
                setErrors([result.error || 'Error al actualizar el punto de venta']);
                setIsSubmitting(false);
            }
        } catch (err: any) {
            setErrors([err?.message || 'Error al actualizar el punto de venta']);
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setFormData({
            name: pointOfSale.name,
            deviceId: pointOfSale.deviceId || '',
            isActive: pointOfSale.isActive,
            defaultPriceListId: pointOfSale.defaultPriceListId,
        });
        setErrors([]);
        onClose();
    };

    const priceListOptions = priceLists.reduce<{ id: string; label: string }[]>((acc, list) => {
        if (!acc.some((option) => option.id === list.id)) {
            acc.push({ id: list.id, label: list.name });
        }
        return acc;
    }, []);

    const existingDefault = pointOfSale.defaultPriceList;
    if (existingDefault && !priceListOptions.some((option) => option.id === existingDefault.id)) {
        priceListOptions.push({
            id: existingDefault.id,
            label: existingDefault.name,
        });
    }

    return (
        <Dialog 
            open={open} 
            onClose={handleClose} 
            title="Editar Punto de Venta"
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
                    {pointOfSale.branch && (
                        <div className="p-3 bg-neutral-50 rounded-lg">
                            <span className="text-sm text-neutral-500">Sucursal:</span>
                            <span className="ml-2 font-medium">{pointOfSale.branch.name}</span>
                        </div>
                    )}

                    <TextField
                        label="Nombre"
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        required
                        data-test-id="update-pos-name"
                    />
                    
                    <Select
                        label="Lista de Precios Predeterminada"
                        options={priceListOptions}
                        value={formData.defaultPriceListId}
                        onChange={(val) => handleChange('defaultPriceListId', val)}
                        disabled={priceListOptions.length === 0}
                        data-test-id="update-pos-default-price-list"
                    />

                    <TextField
                        label="ID de Dispositivo"
                        value={formData.deviceId}
                        onChange={(e) => handleChange('deviceId', e.target.value)}
                        placeholder="Opcional - para vincular a un dispositivo específico"
                        data-test-id="update-pos-device-id"
                    />
                    
                    <Switch
                        label="Activo"
                        checked={formData.isActive}
                        onChange={(checked) => handleChange('isActive', checked)}
                        data-test-id="update-pos-active"
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

export default UpdatePointOfSaleDialog;
