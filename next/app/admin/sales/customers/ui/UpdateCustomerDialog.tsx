'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import Switch from '@/app/baseComponents/Switch/Switch';
import { Button } from '@/app/baseComponents/Button/Button';
import Alert from '@/app/baseComponents/Alert/Alert';
import { useAlert } from '@/app/globalstate/alert/useAlert';
import { updateCustomer } from '@/app/actions/customers';
import Select from '@/app/baseComponents/Select/Select';
import type { CustomerWithPerson } from './types';

interface UpdateCustomerDialogProps {
    open: boolean;
    onClose: () => void;
    customer: CustomerWithPerson;
    onSuccess?: () => Promise<void> | void;
    'data-test-id'?: string;
}

const UpdateCustomerDialog: React.FC<UpdateCustomerDialogProps> = ({ 
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

    const [formData, setFormData] = useState({
        creditLimit: customer.creditLimit.toString(),
        paymentDayOfMonth: (customer.paymentDayOfMonth ?? 5).toString(),
        notes: customer.notes || '',
        isActive: customer.isActive,
    });

    useEffect(() => {
        setFormData({
            creditLimit: customer.creditLimit.toString(),
            paymentDayOfMonth: (customer.paymentDayOfMonth ?? 5).toString(),
            notes: customer.notes || '',
            isActive: customer.isActive,
        });
    }, [customer]);

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        setIsSubmitting(true);
        setErrors([]);

        try {
            const validDays = [5, 10, 15, 20, 25, 30];
            const paymentDay = Number(formData.paymentDayOfMonth);
            const paymentDayOfMonth = validDays.includes(paymentDay)
                ? (paymentDay as 5 | 10 | 15 | 20 | 25 | 30)
                : undefined;
            const result = await updateCustomer(customer.id, {
                creditLimit: parseFloat(formData.creditLimit) || 0,
                paymentDayOfMonth,
                notes: formData.notes || undefined,
                isActive: formData.isActive,
            });

            if (result.success) {
                if (onSuccess) {
                    await onSuccess();
                } else {
                    success('Cliente actualizado correctamente');
                    router.refresh();
                }
                onClose();
            } else {
                setErrors([result.error || 'Error al actualizar el cliente']);
            }
        } catch (err: any) {
            setErrors([err?.message || 'Error al actualizar el cliente']);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setFormData({
            creditLimit: customer.creditLimit.toString(),
            paymentDayOfMonth: (customer.paymentDayOfMonth ?? 5).toString(),
            notes: customer.notes || '',
            isActive: customer.isActive,
        });
        setErrors([]);
        onClose();
    };

    return (
        <Dialog 
            open={open} 
            onClose={handleClose} 
            title="Editar Cliente"
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
                    <div className="grid grid-cols-2 gap-4">
                        <TextField
                            label="Límite de Crédito"
                            type="currency"
                            currencySymbol="$"
                            value={formData.creditLimit}
                            onChange={(e) => handleChange('creditLimit', e.target.value)}
                            data-test-id="update-customer-credit-limit"
                        />
                        <Select
                            label="Día de Pago del Mes"
                            options={[
                                { id: 5, label: '5' },
                                { id: 10, label: '10' },
                                { id: 15, label: '15' },
                                { id: 20, label: '20' },
                                { id: 25, label: '25' },
                                { id: 30, label: '30' },
                            ]}
                            value={Number(formData.paymentDayOfMonth)}
                            onChange={(id) => handleChange('paymentDayOfMonth', String(id ?? 5))}
                            data-test-id="update-customer-payment-day"
                        />
                    </div>
                    
                    <TextField
                        label="Notas"
                        value={formData.notes}
                        onChange={(e) => handleChange('notes', e.target.value)}
                        data-test-id="update-customer-notes"
                    />
                    
                    <Switch
                        label="Cliente Activo"
                        checked={formData.isActive}
                        onChange={(checked) => handleChange('isActive', checked)}
                        data-test-id="update-customer-active"
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

export default UpdateCustomerDialog;
