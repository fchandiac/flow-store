'use client';

import { useState } from 'react';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import { Button } from '@/app/baseComponents/Button/Button';
import { deleteProduct } from '@/app/actions/products';

export interface ProductToDelete {
    id: string;
    name: string;
}

interface DeleteProductDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    product: ProductToDelete | null;
}

export default function DeleteProductDialog({ open, onClose, onSuccess, product }: DeleteProductDialogProps) {
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleClose = () => {
        setError(null);
        onClose();
    };

    const handleDelete = async () => {
        if (!product) return;
        
        setDeleting(true);
        setError(null);

        try {
            const result = await deleteProduct(product.id);

            if (result.success) {
                onSuccess();
                onClose();
            } else {
                setError(result.error || 'Error al eliminar el producto');
            }
        } catch (err) {
            setError('Error al eliminar el producto');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            title="Eliminar Producto"
            size="sm"
            data-test-id="delete-product-dialog"
        >
            <div className="space-y-4">
                {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        {error}
                    </div>
                )}
                
                <p className="text-sm text-foreground">
                    ¿Estás seguro de que deseas eliminar el producto <strong>{product?.name}</strong>?
                </p>
                <p className="text-xs text-muted-foreground">
                    Esta acción no se puede deshacer.
                </p>
                
                <div className="flex justify-end gap-3 pt-4">
                    <Button
                        variant="secondary"
                        onClick={handleClose}
                        disabled={deleting}
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleDelete}
                        disabled={deleting}
                        className="bg-red-500 hover:bg-red-600"
                        data-test-id="btn-confirm-delete"
                    >
                        {deleting ? 'Eliminando...' : 'Eliminar'}
                    </Button>
                </div>
            </div>
        </Dialog>
    );
}
