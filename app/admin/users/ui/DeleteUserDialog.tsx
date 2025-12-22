'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import { Button } from '@/app/baseComponents/Button/Button';
import Alert from '@/app/baseComponents/Alert/Alert';
import { useAlert } from '@/app/state/hooks/useAlert';
import { deleteUser } from '@/app/actions/users';

interface User {
    id: string;
    userName: string;
    mail: string;
    rol: string;
    person?: {
        name?: string;
        dni?: string;
        phone?: string;
    };
}

interface DeleteUserDialogProps {
    open: boolean;
    onClose: () => void;
    user: User | null;
    onSuccess?: () => void;
    'data-test-id'?: string;
}

const DeleteUserDialog: React.FC<DeleteUserDialogProps> = ({ 
    open, 
    onClose, 
    user, 
    onSuccess,
    'data-test-id': dataTestId 
}) => {
    const router = useRouter();
    const { data: session } = useSession();
    const currentUserId = (session?.user as any)?.id;
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);
    const { success, error: showError } = useAlert();

    const fullName = user?.person?.name || user?.userName || 'Usuario';

    const handleSubmit = async () => {
        if (!user?.id || String(user.id).trim() === '') {
            setErrors(['Usuario no identificado']);
            return;
        }

        setIsSubmitting(true);
        setErrors([]);

        try {
            const result = await deleteUser(String(user.id), currentUserId);
            
            if (result?.success) {
                success(`Usuario "${user.userName}" eliminado correctamente`);
                setTimeout(() => {
                    onClose();
                    onSuccess?.();
                    router.refresh();
                    setIsSubmitting(false);
                }, 300);
            } else {
                const errorMessage = result?.error || 'Error al eliminar el usuario';
                showError(errorMessage);
                setErrors([errorMessage]);
                setIsSubmitting(false);
            }
        } catch (err: any) {
            const errorMessage = err?.message || 'Error desconocido al eliminar el usuario';
            showError(errorMessage);
            setErrors([errorMessage]);
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog 
            open={open} 
            onClose={onClose} 
            title="Eliminar Usuario"
            size="sm"
            data-test-id={dataTestId}
        >
            {user ? (
                <div className="space-y-6">
                    {/* Errores */}
                    {errors.length > 0 && (
                        <Alert variant="error">
                            <ul className="list-disc list-inside">
                                {errors.map((err, i) => (
                                    <li key={i}>{err}</li>
                                ))}
                            </ul>
                        </Alert>
                    )}

                    {/* Icono de advertencia */}
                    <div className="flex justify-center">
                        <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                            <span 
                                className="material-symbols-outlined text-red-600" 
                                style={{ fontSize: '2rem' }}
                            >
                                warning
                            </span>
                        </div>
                    </div>

                    {/* Mensaje */}
                    <div className="text-center">
                        <p className="text-gray-700">
                            ¿Está seguro que desea eliminar al usuario{' '}
                            <strong>"{fullName}"</strong>?
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                            Esta acción no se puede deshacer.
                        </p>
                    </div>

                    {/* Botones */}
                    <div className="flex justify-center gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outlined"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            variant="primary"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isSubmitting ? 'Eliminando...' : 'Eliminar Usuario'}
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="text-center py-8 text-gray-500">
                    No hay datos de usuario para mostrar
                </div>
            )}
        </Dialog>
    );
};

export default DeleteUserDialog;
