'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import { Button } from '@/app/baseComponents/Button/Button';
import Alert from '@/app/baseComponents/Alert/Alert';
import { useAlert } from '@/app/globalstate/alert/useAlert';
import { deletePointOfSale } from '@/app/actions/pointsOfSale';
import { PointOfSaleType } from './PointOfSaleCard';

interface DeletePointOfSaleDialogProps {
    open: boolean;
    onClose: () => void;
    pointOfSale: PointOfSaleType;
    'data-test-id'?: string;
}

const DeletePointOfSaleDialog: React.FC<DeletePointOfSaleDialogProps> = ({ 
    open, 
    onClose,
    pointOfSale,
    'data-test-id': dataTestId 
}) => {
    const router = useRouter();
    const { success, error: showError } = useAlert();
    
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDelete = async () => {
        setIsDeleting(true);
        setError(null);

        try {
            const result = await deletePointOfSale(pointOfSale.id);

            if (result.success) {
                success('Punto de venta eliminado correctamente');
                setTimeout(() => {
                    onClose();
                    router.refresh();
                    setIsDeleting(false);
                }, 300);
            } else {
                setError(result.error || 'Error al eliminar el punto de venta');
                setIsDeleting(false);
            }
        } catch (err: any) {
            setError(err?.message || 'Error al eliminar el punto de venta');
            setIsDeleting(false);
        }
    };

    const handleClose = () => {
        setError(null);
        onClose();
    };

    return (
        <Dialog 
            open={open} 
            onClose={handleClose} 
            title="Eliminar Punto de Venta"
            data-test-id={dataTestId}
        >
            <div className="space-y-4">
                {error && (
                    <Alert variant="error">{error}</Alert>
                )}

                <div className="text-center py-4">
                    <span 
                        className="material-symbols-outlined text-error mb-3" 
                        style={{ fontSize: '3rem' }}
                    >
                        warning
                    </span>
                    <p className="text-neutral-700">
                        ¿Estás seguro de que deseas eliminar el punto de venta
                        <strong className="block mt-1">{pointOfSale.name}</strong>
                    </p>
                    {pointOfSale.branch && (
                        <p className="text-sm text-neutral-500 mt-2">
                            Sucursal: {pointOfSale.branch.name}
                        </p>
                    )}
                    <p className="text-sm text-neutral-500 mt-3">
                        Esta acción no se puede deshacer. Se eliminarán también las sesiones de caja asociadas.
                    </p>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200">
                    <Button
                        variant="outlined"
                        onClick={handleClose}
                        disabled={isDeleting}
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant="outlined"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="!border-error !text-error hover:!bg-error/10"
                    >
                        {isDeleting ? 'Eliminando...' : 'Eliminar'}
                    </Button>
                </div>
            </div>
        </Dialog>
    );
};

export default DeletePointOfSaleDialog;
