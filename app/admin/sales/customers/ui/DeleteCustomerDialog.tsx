'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import { Button } from '@/app/baseComponents/Button/Button';
import Alert from '@/app/baseComponents/Alert/Alert';
import { useAlert } from '@/app/globalstate/alert/useAlert';
import { deleteCustomer } from '@/app/actions/customers';
import type { CustomerWithPerson } from './types';

interface DeleteCustomerDialogProps {
    open: boolean;
    onClose: () => void;
    customer: CustomerWithPerson;
    onSuccess?: () => Promise<void> | void;
    'data-test-id'?: string;
}

const DeleteCustomerDialog: React.FC<DeleteCustomerDialogProps> = ({ 
    open, 
    onClose,
    customer,
    onSuccess,
    'data-test-id': dataTestId 
}) => {
    const router = useRouter();
    const { success } = useAlert();
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);

    const displayName = customer.person.type === 'NATURAL'
        ? `${customer.person.firstName} ${customer.person.lastName || ''}`.trim()
        : customer.person.businessName || customer.person.firstName;

    const handleDelete = async () => {
        setIsSubmitting(true);
        setErrors([]);

        try {
            const result = await deleteCustomer(customer.id);

            if (result.success) {
                if (onSuccess) {
                    await onSuccess();
                } else {
                    success('Cliente eliminado correctamente');
                    router.refresh();
                }
                onClose();
            } else {
                setErrors([result.error || 'Error al eliminar el cliente']);
            }
        } catch (err: any) {
            setErrors([err?.message || 'Error al eliminar el cliente']);
        } finally {
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
            title="Eliminar Cliente"
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
                            ¿Estás seguro de que deseas eliminar al cliente <strong>{displayName}</strong>?
                        </p>
                        <p className="text-sm text-neutral-500 mt-2">
                            Esta acción desactivará el registro del cliente. Los datos históricos se mantendrán para consultas.
                        </p>
                    </div>
                </div>

                {/* Info del cliente */}
                <div className="p-4 bg-neutral-50 rounded-lg">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-white border-2 border-neutral-200 flex items-center justify-center">
                            <span className="material-symbols-outlined text-neutral-500" style={{ fontSize: '1.25rem' }}>
                                {customer.person.type === 'NATURAL' ? 'person' : 'business'}
                            </span>
                        </div>
                        <div className="flex-1">
                            <p className="font-medium text-neutral-800">{displayName}</p>
                            <div className="flex items-center gap-3 text-sm text-neutral-500">
                                {customer.person.documentNumber && <span>RUT: {customer.person.documentNumber}</span>}
                            </div>
                        </div>
                    </div>
                    {customer.currentBalance > 0 && (
                        <div className="mt-3 pt-3 border-t border-neutral-200">
                            <Alert variant="warning">
                                Este cliente tiene un saldo pendiente de <strong>${customer.currentBalance.toLocaleString('es-CL')}</strong>
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
                        disabled={isSubmitting}
                        className="!bg-red-600 hover:!bg-red-700"
                    >
                        {isSubmitting ? 'Eliminando...' : 'Eliminar Cliente'}
                    </Button>
                </div>
            </div>
        </Dialog>
    );
};

export default DeleteCustomerDialog;
