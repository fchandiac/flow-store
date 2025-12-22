'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import { Button } from '@/app/baseComponents/Button/Button';
import Alert from '@/app/baseComponents/Alert/Alert';
import { useAlert } from '@/app/state/hooks/useAlert';
import { deleteTax } from '@/app/actions/taxes';
import { TaxType } from './TaxCard';

interface DeleteTaxDialogProps {
    open: boolean;
    onClose: () => void;
    tax: TaxType;
    'data-test-id'?: string;
}

const DeleteTaxDialog: React.FC<DeleteTaxDialogProps> = ({ 
    open, 
    onClose,
    tax,
    'data-test-id': dataTestId 
}) => {
    const router = useRouter();
    const { success, error: showError } = useAlert();
    
    const [isDeleting, setIsDeleting] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);

    const handleDelete = async () => {
        setIsDeleting(true);
        setErrors([]);

        try {
            const result = await deleteTax(tax.id);

            if (result.success) {
                success('Impuesto eliminado correctamente');
                setTimeout(() => {
                    onClose();
                    router.refresh();
                    setIsDeleting(false);
                }, 300);
            } else {
                setErrors([result.error || 'Error al eliminar el impuesto']);
                setIsDeleting(false);
            }
        } catch (err: any) {
            setErrors([err?.message || 'Error al eliminar el impuesto']);
            setIsDeleting(false);
        }
    };

    return (
        <Dialog 
            open={open} 
            onClose={onClose} 
            title="Eliminar Impuesto"
            data-test-id={dataTestId}
        >
            <div className="space-y-4">
                {errors.length > 0 && (
                    <Alert variant="error">
                        <ul className="list-disc list-inside">
                            {errors.map((err, i) => (
                                <li key={i}>{err}</li>
                            ))}
                        </ul>
                    </Alert>
                )}

                <Alert variant="warning">
                    <p className="font-medium">¿Estás seguro de eliminar el impuesto "{tax.name}"?</p>
                    <p className="mt-2 text-sm">
                        Esta acción podría afectar productos y transacciones que usan este impuesto.
                        Esta acción no se puede deshacer.
                    </p>
                </Alert>

                <div className="flex justify-end gap-3 pt-4">
                    <Button
                        variant="outlined"
                        onClick={onClose}
                        disabled={isDeleting}
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant="outlined"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="text-red-600 border-red-600 hover:bg-red-50"
                    >
                        {isDeleting ? 'Eliminando...' : 'Eliminar'}
                    </Button>
                </div>
            </div>
        </Dialog>
    );
};

export default DeleteTaxDialog;
