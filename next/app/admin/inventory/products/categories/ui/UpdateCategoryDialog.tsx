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
import { updateCategory } from '@/app/actions/categories';
import { CategoryType } from './CategoryCard';

interface UpdateCategoryDialogProps {
    open: boolean;
    onClose: () => void;
    category: CategoryType;
    allCategories: CategoryType[];
    'data-test-id'?: string;
}

const UpdateCategoryDialog: React.FC<UpdateCategoryDialogProps> = ({ 
    open, 
    onClose,
    category,
    allCategories,
    'data-test-id': dataTestId 
}) => {
    const router = useRouter();
    const { success, error: showError } = useAlert();
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        name: category.name,
        code: category.code || '',
        description: category.description || '',
        parentId: category.parentId || '',
        sortOrder: category.sortOrder.toString(),
        isActive: category.isActive,
    });

    useEffect(() => {
        setFormData({
            name: category.name,
            code: category.code || '',
            description: category.description || '',
            parentId: category.parentId || '',
            sortOrder: category.sortOrder.toString(),
            isActive: category.isActive,
        });
    }, [category]);

    // Filtrar categorías para el selector de padre (excluir la actual y sus descendientes)
    const getDescendantIds = (catId: string): string[] => {
        const children = allCategories.filter(c => c.parentId === catId);
        let ids = children.map(c => c.id);
        for (const child of children) {
            ids = [...ids, ...getDescendantIds(child.id)];
        }
        return ids;
    };

    const excludeIds = [category.id, ...getDescendantIds(category.id)];
    
    const parentOptions = [
        { id: '', label: 'Sin categoría padre (raíz)' },
        ...allCategories
            .filter(c => c.isActive && !excludeIds.includes(c.id))
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
            const result = await updateCategory(category.id, {
                name: formData.name.trim(),
                code: formData.code.trim() || undefined,
                description: formData.description.trim() || undefined,
                parentId: formData.parentId || null,
                sortOrder: parseInt(formData.sortOrder) || 0,
                isActive: formData.isActive,
            });

            if (result.success) {
                success('Categoría actualizada correctamente');
                setTimeout(() => {
                    onClose();
                    router.refresh();
                    setIsSubmitting(false);
                }, 300);
            } else {
                setErrors([result.error || 'Error al actualizar la categoría']);
                setIsSubmitting(false);
            }
        } catch (err: any) {
            setErrors([err?.message || 'Error al actualizar la categoría']);
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setFormData({
            name: category.name,
            code: category.code || '',
            description: category.description || '',
            parentId: category.parentId || '',
            sortOrder: category.sortOrder.toString(),
            isActive: category.isActive,
        });
        setErrors([]);
        onClose();
    };

    return (
        <Dialog 
            open={open} 
            onClose={handleClose} 
            title="Editar Categoría"
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
                        data-test-id="update-category-name"
                    />
                    
                    <TextField
                        label="Código"
                        value={formData.code}
                        onChange={(e) => handleChange('code', e.target.value)}
                        placeholder="CAT-001"
                        data-test-id="update-category-code"
                    />
                    
                    <TextField
                        label="Descripción"
                        value={formData.description}
                        onChange={(e) => handleChange('description', e.target.value)}
                        data-test-id="update-category-description"
                    />
                    
                    <Select
                        label="Categoría Padre"
                        options={parentOptions}
                        value={formData.parentId}
                        onChange={(val) => handleChange('parentId', val)}
                        data-test-id="update-category-parent"
                    />
                    
                    <TextField
                        label="Orden"
                        type="number"
                        value={formData.sortOrder}
                        onChange={(e) => handleChange('sortOrder', e.target.value)}
                        data-test-id="update-category-sort-order"
                    />
                    
                    <Switch
                        label="Categoría Activa"
                        checked={formData.isActive}
                        onChange={(checked) => handleChange('isActive', checked)}
                        data-test-id="update-category-active"
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

export default UpdateCategoryDialog;
