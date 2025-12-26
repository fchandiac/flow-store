'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import Switch from '@/app/baseComponents/Switch/Switch';
import { Button } from '@/app/baseComponents/Button/Button';
import Alert from '@/app/baseComponents/Alert/Alert';
import LocationPickerWrapper from '@/app/baseComponents/LocationPicker/LocationPickerWrapper';
import { useAlert } from '@/app/state/hooks/useAlert';
import { updateBranch } from '@/app/actions/branches';
import { BranchType } from './BranchCard';

interface UpdateBranchDialogProps {
    open: boolean;
    onClose: () => void;
    branch: BranchType;
    'data-test-id'?: string;
}

const UpdateBranchDialog: React.FC<UpdateBranchDialogProps> = ({ 
    open, 
    onClose,
    branch,
    'data-test-id': dataTestId 
}) => {
    const router = useRouter();
    const { success, error: showError } = useAlert();
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        name: branch.name,
        address: branch.address || '',
        phone: branch.phone || '',
        location: branch.location || null as { lat: number; lng: number } | null,
        isHeadquarters: branch.isHeadquarters,
        isActive: branch.isActive,
    });

    useEffect(() => {
        setFormData({
            name: branch.name,
            address: branch.address || '',
            phone: branch.phone || '',
            location: branch.location || null,
            isHeadquarters: branch.isHeadquarters,
            isActive: branch.isActive,
        });
    }, [branch]);

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
            const result = await updateBranch(branch.id, {
                name: formData.name,
                address: formData.address || undefined,
                phone: formData.phone || undefined,
                location: formData.location || undefined,
                isHeadquarters: formData.isHeadquarters,
                isActive: formData.isActive,
            });

            if (result.success) {
                success('Sucursal actualizada correctamente');
                setTimeout(() => {
                    onClose();
                    router.refresh();
                    setIsSubmitting(false);
                }, 300);
            } else {
                setErrors([result.error || 'Error al actualizar la sucursal']);
                setIsSubmitting(false);
            }
        } catch (err: any) {
            setErrors([err?.message || 'Error al actualizar la sucursal']);
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setFormData({
            name: branch.name,
            address: branch.address || '',
            phone: branch.phone || '',
            location: branch.location || null,
            isHeadquarters: branch.isHeadquarters,
            isActive: branch.isActive,
        });
        setErrors([]);
        onClose();
    };

    return (
        <Dialog 
            open={open} 
            onClose={handleClose} 
            title="Editar Sucursal"
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
                        data-test-id="update-branch-name"
                    />
                    
                    <TextField
                        label="Dirección"
                        value={formData.address}
                        onChange={(e) => handleChange('address', e.target.value)}
                        data-test-id="update-branch-address"
                    />
                    
                    <TextField
                        label="Teléfono"
                        value={formData.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        data-test-id="update-branch-phone"
                    />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Ubicación
                        </label>
                        <div className="h-[250px] relative z-10">
                            <LocationPickerWrapper
                                mode={formData.location ? "update" : "edit"}
                                externalPosition={formData.location || undefined}
                                onChange={(coords) => handleChange('location', coords)}
                            />
                        </div>
                    </div>
                    
                    <div>
                        <Switch
                            label="Es Casa Matriz"
                            checked={formData.isHeadquarters}
                            onChange={(checked) => handleChange('isHeadquarters', checked)}
                            data-test-id="update-branch-headquarters"
                        />
                        {formData.isHeadquarters && !branch.isHeadquarters && (
                            <p className="text-xs text-amber-600 mt-1">
                                Solo puede haber una casa matriz. Si existe otra, dejará de serlo.
                            </p>
                        )}
                    </div>
                    
                    <Switch
                        label="Activa"
                        checked={formData.isActive}
                        onChange={(checked) => handleChange('isActive', checked)}
                        data-test-id="update-branch-active"
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

export default UpdateBranchDialog;
