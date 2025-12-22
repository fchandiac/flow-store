'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import Select from '@/app/baseComponents/Select/Select';
import { Button } from '@/app/baseComponents/Button/Button';
import Alert from '@/app/baseComponents/Alert/Alert';
import { useAlert } from '@/app/state/hooks/useAlert';
import { createCustomer } from '@/app/actions/customers';

interface CreateCustomerDialogProps {
    open: boolean;
    onClose: () => void;
    'data-test-id'?: string;
}

const personTypeOptions = [
    { id: 'NATURAL', label: 'Persona Natural' },
    { id: 'COMPANY', label: 'Empresa' },
];

const customerTypeOptions = [
    { id: 'RETAIL', label: 'Minorista' },
    { id: 'WHOLESALE', label: 'Mayorista' },
    { id: 'VIP', label: 'VIP' },
];

const CreateCustomerDialog: React.FC<CreateCustomerDialogProps> = ({ 
    open, 
    onClose,
    'data-test-id': dataTestId 
}) => {
    const router = useRouter();
    const { success, error: showError } = useAlert();
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        // Datos de persona
        personType: 'NATURAL' as 'NATURAL' | 'COMPANY',
        firstName: '',
        lastName: '',
        businessName: '',
        documentType: 'RUT',
        documentNumber: '',
        email: '',
        phone: '',
        address: '',
        // Datos de cliente
        code: '',
        customerType: 'RETAIL',
        creditLimit: '0',
        defaultPaymentTermDays: '0',
        notes: '',
    });

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const validationErrors: string[] = [];
        if (!formData.firstName.trim()) validationErrors.push('El nombre es requerido');
        if (formData.personType === 'NATURAL' && !formData.lastName.trim()) {
            validationErrors.push('El apellido es requerido para personas naturales');
        }
        
        if (validationErrors.length > 0) {
            setErrors(validationErrors);
            return;
        }

        setIsSubmitting(true);
        setErrors([]);

        try {
            const result = await createCustomer({
                person: {
                    type: formData.personType as any,
                    firstName: formData.firstName,
                    lastName: formData.personType === 'NATURAL' ? formData.lastName : undefined,
                    businessName: formData.personType === 'COMPANY' ? formData.businessName : undefined,
                    documentType: formData.documentType || undefined,
                    documentNumber: formData.documentNumber || undefined,
                    email: formData.email || undefined,
                    phone: formData.phone || undefined,
                    address: formData.address || undefined,
                },
                code: formData.code || undefined,
                customerType: formData.customerType as any,
                creditLimit: parseFloat(formData.creditLimit) || 0,
                defaultPaymentTermDays: parseInt(formData.defaultPaymentTermDays) || 0,
                notes: formData.notes || undefined,
            });

            if (result.success) {
                success('Cliente creado correctamente');
                resetForm();
                setTimeout(() => {
                    onClose();
                    router.refresh();
                    setIsSubmitting(false);
                }, 300);
            } else {
                setErrors([result.error || 'Error al crear el cliente']);
                setIsSubmitting(false);
            }
        } catch (err: any) {
            setErrors([err?.message || 'Error al crear el cliente']);
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({
            personType: 'NATURAL',
            firstName: '',
            lastName: '',
            businessName: '',
            documentType: 'RUT',
            documentNumber: '',
            email: '',
            phone: '',
            address: '',
            code: '',
            customerType: 'RETAIL',
            creditLimit: '0',
            defaultPaymentTermDays: '0',
            notes: '',
        });
    };

    const handleClose = () => {
        resetForm();
        setErrors([]);
        onClose();
    };

    return (
        <Dialog 
            open={open} 
            onClose={handleClose} 
            title="Crear Cliente"
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

                {/* Datos de Persona */}
                <div className="space-y-4">
                    <h3 className="font-medium text-neutral-700 border-b pb-2">Datos Personales</h3>
                    
                    <Select
                        label="Tipo de Persona"
                        options={personTypeOptions}
                        value={formData.personType}
                        onChange={(val) => handleChange('personType', val)}
                        data-test-id="create-customer-person-type"
                    />

                    {formData.personType === 'NATURAL' ? (
                        <div className="grid grid-cols-2 gap-4">
                            <TextField
                                label="Nombre"
                                value={formData.firstName}
                                onChange={(e) => handleChange('firstName', e.target.value)}
                                required
                                data-test-id="create-customer-first-name"
                            />
                            <TextField
                                label="Apellido"
                                value={formData.lastName}
                                onChange={(e) => handleChange('lastName', e.target.value)}
                                required
                                data-test-id="create-customer-last-name"
                            />
                        </div>
                    ) : (
                        <>
                            <TextField
                                label="Razón Social"
                                value={formData.businessName}
                                onChange={(e) => handleChange('businessName', e.target.value)}
                                data-test-id="create-customer-business-name"
                            />
                            <TextField
                                label="Nombre de Contacto"
                                value={formData.firstName}
                                onChange={(e) => handleChange('firstName', e.target.value)}
                                required
                                data-test-id="create-customer-contact-name"
                            />
                        </>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4">
                        <TextField
                            label="RUT / Documento"
                            value={formData.documentNumber}
                            onChange={(e) => handleChange('documentNumber', e.target.value)}
                            placeholder="12.345.678-9"
                            data-test-id="create-customer-document"
                        />
                        <TextField
                            label="Teléfono"
                            value={formData.phone}
                            onChange={(e) => handleChange('phone', e.target.value)}
                            placeholder="+56 9 1234 5678"
                            data-test-id="create-customer-phone"
                        />
                    </div>
                    
                    <TextField
                        label="Email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        data-test-id="create-customer-email"
                    />
                    
                    <TextField
                        label="Dirección"
                        value={formData.address}
                        onChange={(e) => handleChange('address', e.target.value)}
                        data-test-id="create-customer-address"
                    />
                </div>

                {/* Datos de Cliente */}
                <div className="space-y-4">
                    <h3 className="font-medium text-neutral-700 border-b pb-2">Datos de Cliente</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <TextField
                            label="Código de Cliente"
                            value={formData.code}
                            onChange={(e) => handleChange('code', e.target.value)}
                            placeholder="CLI-001"
                            data-test-id="create-customer-code"
                        />
                        <Select
                            label="Tipo de Cliente"
                            options={customerTypeOptions}
                            value={formData.customerType}
                            onChange={(val) => handleChange('customerType', val)}
                            data-test-id="create-customer-type"
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <TextField
                            label="Límite de Crédito"
                            type="number"
                            value={formData.creditLimit}
                            onChange={(e) => handleChange('creditLimit', e.target.value)}
                            data-test-id="create-customer-credit-limit"
                        />
                        <TextField
                            label="Días de Pago"
                            type="number"
                            value={formData.defaultPaymentTermDays}
                            onChange={(e) => handleChange('defaultPaymentTermDays', e.target.value)}
                            data-test-id="create-customer-payment-days"
                        />
                    </div>
                    
                    <TextField
                        label="Notas"
                        value={formData.notes}
                        onChange={(e) => handleChange('notes', e.target.value)}
                        data-test-id="create-customer-notes"
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
                        {isSubmitting ? 'Creando...' : 'Crear Cliente'}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
};

export default CreateCustomerDialog;
