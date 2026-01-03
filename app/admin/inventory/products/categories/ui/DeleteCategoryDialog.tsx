'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import { Button } from '@/app/baseComponents/Button/Button';
import Alert from '@/app/baseComponents/Alert/Alert';
import { useAlert } from '@/app/state/hooks/useAlert';
import { deleteCategory } from '@/app/actions/categories';
import { CategoryType } from './CategoryCard';

interface DeleteCategoryDialogProps {
    open: boolean;
    onClose: () => void;
    category: CategoryType;
    'data-test-id'?: string;
}

const DeleteCategoryDialog: React.FC<DeleteCategoryDialogProps> = ({ 
    open, 
    onClose,
    category,
    'data-test-id': dataTestId 
}) => {
    const router = useRouter();
    const { success, error: showError } = useAlert();
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);

    const handleDelete = async () => {
        setIsSubmitting(true);
        setErrors([]);

        try {
            const result = await deleteCategory(category.id);

            if (result.success) {
                success('Categoría eliminada correctamente');
                setTimeout(() => {
                    onClose();
                    router.refresh();
                    setIsSubmitting(false);
                }, 300);
            } else {
                setErrors([result.error || 'Error al eliminar la categoría']);
                setIsSubmitting(false);
            }
        } catch (err: any) {
            setErrors([err?.message || 'Error al eliminar la categoría']);
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setErrors([]);
        onClose();
    };

    return (
        <Dialog 
            open={open} 
            onClose={handleClose} 
            title="Eliminar Categoría"
            data-test-id={dataTestId}
        >
            <div className="space-y-6">
                {errors.length > 0 && (
                    <Alert variant="error">
                        <ul className="list-disc list-inside">
                            {errors.map((err, i) => (
                                <li key={i}>{err}</li>
                            ))}
                        </ul>
                    </Alert>
                )}

                <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-red-600" style={{ fontSize: '1.5rem' }}>
                            warning
                        </span>
                    </div>
                    <div>
                        <p className="text-neutral-700">
                            ¿Estás seguro de que deseas eliminar la categoría <strong>{category.name}</strong>?
                        </p>
                        <p className="text-sm text-neutral-500 mt-2">
                            Esta acción no se puede deshacer.
                        </p>
                    </div>
                </div>

                {/* Info de la categoría */}
                <div className="p-4 bg-neutral-50 rounded-lg">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-white border border-neutral-200 flex items-center justify-center">
                            <span className="material-symbols-outlined text-neutral-500" style={{ fontSize: '1.25rem' }}>
                                category
                            </span>
                        </div>
                        <div className="flex-1">
                            <p className="font-medium text-neutral-800">{category.name}</p>
                            <div className="flex items-center gap-3 text-sm text-neutral-500">
                                {category.code && <span>Código: {category.code}</span>}
                            </div>
                        </div>
                    </div>
                    {(category.childrenCount && category.childrenCount > 0) && (
                        <div className="mt-3 pt-3 border-t border-neutral-200">
                            <Alert variant="warning">
                                Esta categoría tiene <strong>{category.childrenCount} subcategoría(s)</strong>. Debe eliminarlas primero.
                            </Alert>
                        </div>
                    )}
                    {(category.productsCount && category.productsCount > 0) && (
                        <div className="mt-3 pt-3 border-t border-neutral-200">
                            <Alert variant="warning">
                                Esta categoría tiene <strong>{category.productsCount} producto(s)</strong> asociados. No se puede eliminar.
                            </Alert>
                        </div>
                    )}
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
                        onClick={handleDelete}
                        disabled={isSubmitting || !!(category.childrenCount && category.childrenCount > 0) || !!(category.productsCount && category.productsCount > 0)}
                        className="!bg-red-600 hover:!bg-red-700"
                    >
                        {isSubmitting ? 'Eliminando...' : 'Eliminar Categoría'}
                    </Button>
                </div>
            </div>
        </Dialog>
    );
};

export default DeleteCategoryDialog;
