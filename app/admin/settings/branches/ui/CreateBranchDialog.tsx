'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import Switch from '@/app/baseComponents/Switch/Switch';
import { Button } from '@/app/baseComponents/Button/Button';
import Alert from '@/app/baseComponents/Alert/Alert';
import { useAlert } from '@/app/state/hooks/useAlert';
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
    const { success, error: showError } = useAlert();
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        name: '',
        code: '',
        address: '',
        phone: '',
        isHeadquarters: false,
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
            const result = await createBranch({
                name: formData.name,
                code: formData.code || undefined,
                address: formData.address || undefined,
                phone: formData.phone || undefined,
                isHeadquarters: formData.isHeadquarters,
            });

            if (result.success) {
                success('Sucursal creada correctamente');
                setFormData({
                    name: '',
                    code: '',
                    address: '',
                    phone: '',
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
            code: '',
            address: '',
            phone: '',
            isHeadquarters: false,
        });
        setErrors([]);
        onClose();
    };

    return (
        <Dialog 
            open={open} 
            onClose={handleClose} 
            title="Crear Sucursal"
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
                        data-test-id="create-branch-name"
                    />
                    
                    <TextField
                        label="Código"
                        value={formData.code}
                        onChange={(e) => handleChange('code', e.target.value)}
                        placeholder="SUC-001"
                        data-test-id="create-branch-code"
                    />
                    
                    <TextField
                        label="Dirección"
                        value={formData.address}
                        onChange={(e) => handleChange('address', e.target.value)}
                        data-test-id="create-branch-address"
                    />
                    
                    <TextField
                        label="Teléfono"
                        value={formData.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        data-test-id="create-branch-phone"
                    />
                    
                    <div>
                        <Switch
                            label="Es Casa Matriz"
                            checked={formData.isHeadquarters}
                            onChange={(checked) => handleChange('isHeadquarters', checked)}
                            data-test-id="create-branch-headquarters"
                        />
                        {formData.isHeadquarters && (
                            <p className="text-xs text-amber-600 mt-1">
                                Solo puede haber una casa matriz. Si existe otra, dejará de serlo.
                            </p>
                        )}
                    </div>
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
                        {isSubmitting ? 'Creando...' : 'Crear Sucursal'}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
};

export default CreateBranchDialog;
