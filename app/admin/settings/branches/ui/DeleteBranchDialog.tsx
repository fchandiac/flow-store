'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import { Button } from '@/app/baseComponents/Button/Button';
import Alert from '@/app/baseComponents/Alert/Alert';
import { useAlert } from '@/app/state/hooks/useAlert';
import { deleteBranch } from '@/app/actions/branches';
import { BranchType } from './BranchCard';

interface DeleteBranchDialogProps {
    open: boolean;
    onClose: () => void;
    branch: BranchType;
    'data-test-id'?: string;
}

const DeleteBranchDialog: React.FC<DeleteBranchDialogProps> = ({ 
    open, 
    onClose,
    branch,
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
            const result = await deleteBranch(branch.id);

            if (result.success) {
                success('Sucursal eliminada correctamente');
                setTimeout(() => {
                    onClose();
                    router.refresh();
                    setIsDeleting(false);
                }, 300);
            } else {
                setErrors([result.error || 'Error al eliminar la sucursal']);
                setIsDeleting(false);
            }
        } catch (err: any) {
            setErrors([err?.message || 'Error al eliminar la sucursal']);
            setIsDeleting(false);
        }
    };

    return (
        <Dialog 
            open={open} 
            onClose={onClose} 
            title="Eliminar Sucursal"
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
                    <p className="font-medium">¿Estás seguro de eliminar la sucursal "{branch.name}"?</p>
                    <p className="mt-2 text-sm">
                        Esta acción eliminará también todos los puntos de venta y bodegas asociados.
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

export default DeleteBranchDialog;
