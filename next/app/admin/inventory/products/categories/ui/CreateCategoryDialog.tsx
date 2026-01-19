'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import Select from '@/app/baseComponents/Select/Select';
import { Button } from '@/app/baseComponents/Button/Button';
import Alert from '@/app/baseComponents/Alert/Alert';
import { useAlert } from '@/app/globalstate/alert/useAlert';
import { createCategory } from '@/app/actions/categories';
import { CategoryType } from './CategoryCard';

interface CreateCategoryDialogProps {
    open: boolean;
    onClose: () => void;
    allCategories: CategoryType[];
    'data-test-id'?: string;
}

const CreateCategoryDialog: React.FC<CreateCategoryDialogProps> = ({ 
    open, 
    onClose,
    allCategories,
    'data-test-id': dataTestId 
}) => {
    const router = useRouter();
    const { success, error: showError } = useAlert();
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        parentId: '',
        sortOrder: '',
    });

    // Filtrar solo categorías activas para el selector de padre
    const parentOptions = [
        { id: '', label: 'Sin categoría padre (raíz)' },
        ...allCategories
            .filter(c => c.isActive)
            .map(c => ({ 
                id: c.id, 
                label: c.parentId 
                    ? `↳ ${c.name}` 
                    : c.name 
            }))
    ];

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
            const result = await createCategory({
                name: formData.name.trim(),
                description: formData.description.trim() || undefined,
                parentId: formData.parentId || null,
                sortOrder: formData.sortOrder ? parseInt(formData.sortOrder) : undefined,
            });

            if (result.success) {
                success('Categoría creada correctamente');
                resetForm();
                setTimeout(() => {
                    onClose();
                    router.refresh();
                    setIsSubmitting(false);
                }, 300);
            } else {
                setErrors([result.error || 'Error al crear la categoría']);
                setIsSubmitting(false);
            }
        } catch (err: any) {
            setErrors([err?.message || 'Error al crear la categoría']);
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            parentId: '',
            sortOrder: '',
        });
    };

    const handleClose = () => {
        resetForm();
        setErrors([]);
        onClose();
    };

    return (
        <Dialog 
            open={open} 
            onClose={handleClose} 
            title="Crear Categoría"
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
                        data-test-id="create-category-name"
                    />
                    
                    <TextField
                        label="Descripción"
                        value={formData.description}
                        onChange={(e) => handleChange('description', e.target.value)}
                        data-test-id="create-category-description"
                    />
                    
                    <Select
                        label="Categoría Padre"
                        options={parentOptions}
                        value={formData.parentId}
                        onChange={(val) => handleChange('parentId', val)}
                        data-test-id="create-category-parent"
                    />
                    
                    <TextField
                        label="Orden"
                        type="number"
                        value={formData.sortOrder}
                        onChange={(e) => handleChange('sortOrder', e.target.value)}
                        placeholder="Automático si se deja vacío"
                        data-test-id="create-category-sort-order"
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
                        {isSubmitting ? 'Creando...' : 'Crear Categoría'}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
};

export default CreateCategoryDialog;
