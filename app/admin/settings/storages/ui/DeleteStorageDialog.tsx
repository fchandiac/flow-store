'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import { Button } from '@/app/baseComponents/Button/Button';
import Alert from '@/app/baseComponents/Alert/Alert';
import { useAlert } from '@/app/state/hooks/useAlert';
import { deleteStorage } from '@/app/actions/storages';
import { StorageListItem } from './StorageList';

interface DeleteStorageDialogProps {
    open: boolean;
    onClose: () => void;
    storage: StorageListItem;
    'data-test-id'?: string;
}

const DeleteStorageDialog: React.FC<DeleteStorageDialogProps> = ({
    open,
    onClose,
    storage,
    'data-test-id': dataTestId,
}) => {
    const router = useRouter();
    const { success, error } = useAlert();

    const [isDeleting, setIsDeleting] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);

    const handleDelete = async () => {
        setIsDeleting(true);
        setErrors([]);

        try {
            const result = await deleteStorage(storage.id);

            if (!result.success) {
                const message = result.error || 'No se pudo eliminar el almacén';
                setErrors([message]);
                error(message);
                setIsDeleting(false);
                return;
            }

            success('Almacén eliminado correctamente');
            setTimeout(() => {
                onClose();
                router.refresh();
                setIsDeleting(false);
            }, 300);
        } catch (err: any) {
            const message = err?.message || 'Error inesperado al eliminar el almacén';
            setErrors([message]);
            error(message);
            setIsDeleting(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            title="Eliminar almacén"
            data-test-id={dataTestId}
        >
            <div className="space-y-4" data-test-id="delete-storage-dialog">
                {errors.length > 0 && (
                    <Alert variant="error">
                        <ul className="list-disc list-inside">
                            {errors.map((err, index) => (
                                <li key={index}>{err}</li>
                            ))}
                        </ul>
                    </Alert>
                )}

                <Alert variant="warning">
                    <p className="font-medium">¿Estás seguro de eliminar el almacén "{storage.name}"?</p>
                    <p className="mt-2 text-sm">
                        Esta acción es definitiva. Verifica que el almacén no tenga movimientos pendientes antes de continuar.
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

export default DeleteStorageDialog;
