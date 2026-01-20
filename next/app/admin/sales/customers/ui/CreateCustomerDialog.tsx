'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import Select from '@/app/baseComponents/Select/Select';
import { Button } from '@/app/baseComponents/Button/Button';
import Alert from '@/app/baseComponents/Alert/Alert';
import { useAlert } from '@/app/globalstate/alert/useAlert';
import { createCustomer } from '@/app/actions/customers';
import { searchPersons, getPersonByDocumentNumber } from '@/app/actions/persons';
import { DocumentType, PersonType, Person } from '@/data/entities/Person';

interface CreateCustomerDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => Promise<void> | void;
    'data-test-id'?: string;
}

const personTypeOptions = [
    { id: PersonType.NATURAL, label: 'Persona Natural' },
    { id: PersonType.COMPANY, label: 'Empresa' },
];

const naturalDocumentTypeOptions = [
    { id: DocumentType.RUN, label: 'RUN' },
    { id: DocumentType.PASSPORT, label: 'Pasaporte' },
    { id: DocumentType.OTHER, label: 'Otro' },
];

const companyDocumentTypeOptions = [
    { id: DocumentType.RUT, label: 'RUT' },
];

interface PersonFormState {
    personType: PersonType;
    documentType: DocumentType;
    firstName: string;
    lastName: string;
    businessName: string;
    documentNumber: string;
    email: string;
    phone: string;
    address: string;
}

interface CustomerFormState {
    creditLimit: string;
    paymentDayOfMonth: string;
    notes: string;
}

const createInitialPersonForm = (): PersonFormState => ({
    personType: PersonType.NATURAL,
    documentType: DocumentType.RUN,
    firstName: '',
    lastName: '',
    businessName: '',
    documentNumber: '',
    email: '',
    phone: '',
    address: '',
});

const createInitialCustomerForm = (): CustomerFormState => ({
    creditLimit: '',
    paymentDayOfMonth: '5',
    notes: '',
});

const buildPersonDisplayName = (person: Person): string => {
    if (person.type === PersonType.COMPANY) {
        return person.businessName?.trim() || person.firstName || 'Empresa sin nombre';
    }

    const naturalName = [person.firstName, person.lastName].filter(Boolean).join(' ').trim();
    if (naturalName) {
        return naturalName;
    }

    return person.businessName?.trim() || 'Persona sin nombre';
};

const CreateCustomerDialog: React.FC<CreateCustomerDialogProps> = ({ 
    open, 
    onClose,
    onSuccess,
    'data-test-id': dataTestId 
}) => {
    const router = useRouter();
    const { success } = useAlert();
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);
    const [personForm, setPersonForm] = useState<PersonFormState>(() => createInitialPersonForm());
    const [customerForm, setCustomerForm] = useState<CustomerFormState>(() => createInitialCustomerForm());
    const [foundPerson, setFoundPerson] = useState<Person | null>(null);

    const handlePersonFieldChange = (field: keyof PersonFormState, value: string) => {
        setPersonForm(prev => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleCustomerFieldChange = (field: keyof CustomerFormState, value: string) => {
        setCustomerForm(prev => ({
            ...prev,
            [field]: value,
        }));
    };

    const handlePersonTypeChange = (value: PersonType) => {
        setPersonForm(prev => {
            const next = { ...prev, personType: value };
            if (value === PersonType.COMPANY) {
                next.documentType = DocumentType.RUT;
                next.lastName = '';
            } else {
                if (next.documentType === DocumentType.RUT) {
                    next.documentType = DocumentType.RUN;
                }
            }
            return next;
        });
    };

    const handleDocumentTypeChange = (value: DocumentType) => {
        setPersonForm(prev => ({
            ...prev,
            documentType: value,
        }));
    };

    useEffect(() => {
        const checkExistingPerson = async () => {
            const trimmed = personForm.documentNumber.trim();
            if (!trimmed) {
                setFoundPerson(null);
                return;
            }
            
            try {
                const person = await getPersonByDocumentNumber(trimmed);
                setFoundPerson(person ? { ...person } : null);
            } catch (error) {
                console.error('Error checking existing person:', error);
                setFoundPerson(null);
            }
        };

        const timeoutId = setTimeout(checkExistingPerson, 300);
        return () => clearTimeout(timeoutId);
    }, [personForm.documentNumber]);

    const isCompany = personForm.personType === PersonType.COMPANY;
    const documentTypeOptions = isCompany ? companyDocumentTypeOptions : naturalDocumentTypeOptions;
    const isRutOrRun = personForm.documentType === DocumentType.RUT || personForm.documentType === DocumentType.RUN;
    const documentLabel = personForm.documentType === DocumentType.RUT
        ? 'RUT'
        : personForm.documentType === DocumentType.RUN
            ? 'RUN'
            : 'Número de documento';
    const documentPlaceholder = isRutOrRun ? documentLabel : 'Número de documento';
    const documentFieldType = isRutOrRun ? 'dni' : 'text';
    const isDocumentTypeSelectDisabled = isCompany;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const validationErrors: string[] = [];
        
        if (!personForm.documentNumber.trim()) {
            validationErrors.push('El número de documento es requerido');
        }
        
        if (personForm.personType === PersonType.NATURAL && personForm.documentType === DocumentType.RUT) {
            validationErrors.push('Las personas naturales no pueden tener documento tipo RUT');
        }

        const parsedPaymentDay = Number.parseInt(customerForm.paymentDayOfMonth, 10);
        const validDays = [5, 10, 15, 20, 25, 30];
        if (!validDays.includes(parsedPaymentDay)) {
            validationErrors.push('El día de pago debe ser uno de: 5, 10, 15, 20, 25 o 30');
        }
        
        if (validationErrors.length > 0) {
            setErrors(validationErrors);
            return;
        }

        setIsSubmitting(true);
        setErrors([]);

        try {
            const paymentDay = validDays.includes(parsedPaymentDay) ? (parsedPaymentDay as 5 | 10 | 15 | 20 | 25 | 30) : 5;
            
            // Check if person exists by document number
            const existingPerson = await getPersonByDocumentNumber(personForm.documentNumber.trim());
            
            if (existingPerson) {
                // Person exists, try to create customer for this person
                const payload = {
                    personId: existingPerson.id,
                    creditLimit: parseFloat(customerForm.creditLimit) || 0,
                    paymentDayOfMonth: paymentDay,
                    notes: customerForm.notes || undefined,
                };
                
                const result = await createCustomer(payload);
                
                if (result.success) {
                    resetForm();
                    if (onSuccess) {
                        await onSuccess();
                    } else {
                        success('Cliente creado correctamente');
                        router.refresh();
                    }
                    onClose();
                } else {
                    if (result.error === 'Esta persona ya es cliente') {
                        setErrors(['Esta persona ya es cliente']);
                    } else {
                        setErrors([result.error || 'Error al crear el cliente']);
                    }
                }
            } else {
                // Person doesn't exist, validate and create new person and customer
                if (!personForm.firstName.trim()) {
                    setErrors(['El nombre es requerido']);
                    setIsSubmitting(false);
                    return;
                }
                if (personForm.personType === PersonType.NATURAL && !personForm.lastName.trim()) {
                    setErrors(['El apellido es requerido para personas naturales']);
                    setIsSubmitting(false);
                    return;
                }
                if (personForm.personType === PersonType.COMPANY && !personForm.businessName.trim()) {
                    setErrors(['La razón social es requerida para empresas']);
                    setIsSubmitting(false);
                    return;
                }
                
                const resolvedDocumentType = personForm.personType === PersonType.COMPANY ? DocumentType.RUT : personForm.documentType ?? DocumentType.RUN;
                const payload = {
                    creditLimit: parseFloat(customerForm.creditLimit) || 0,
                    paymentDayOfMonth: paymentDay,
                    notes: customerForm.notes || undefined,
                    person: {
                        type: personForm.personType,
                        firstName: personForm.firstName.trim(),
                        lastName: personForm.personType === PersonType.NATURAL ? personForm.lastName.trim() || undefined : undefined,
                        businessName: personForm.personType === PersonType.COMPANY ? personForm.businessName.trim() || undefined : undefined,
                        documentType: resolvedDocumentType,
                        documentNumber: personForm.documentNumber.trim() || undefined,
                        email: personForm.email.trim() || undefined,
                        phone: personForm.phone.trim() || undefined,
                        address: personForm.address.trim() || undefined,
                    },
                };
                
                const result = await createCustomer(payload);
                
                if (result.success) {
                    resetForm();
                    if (onSuccess) {
                        await onSuccess();
                    } else {
                        success('Cliente creado correctamente');
                        router.refresh();
                    }
                    onClose();
                } else {
                    setErrors([result.error || 'Error al crear el cliente']);
                }
            }
        } catch (err: any) {
            setErrors([err?.message || 'Error al crear el cliente']);
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = useCallback(() => {
        setPersonForm(createInitialPersonForm());
        setCustomerForm(createInitialCustomerForm());
        setFoundPerson(null);
    }, []);

    const handleClose = () => {
        resetForm();
        setErrors([]);
        setIsSubmitting(false);
        onClose();
    };

    useEffect(() => {
        if (!open) {
            resetForm();
            setErrors([]);
            setIsSubmitting(false);
        } else {
            setErrors([]);
            setIsSubmitting(false);
        }
    }, [open, resetForm]);

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

                {foundPerson && (
                    <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4 text-sm space-y-1">
                        <p className="font-medium text-neutral-800">{buildPersonDisplayName(foundPerson)}</p>
                        <p className="text-neutral-600">Tipo: {foundPerson.type === PersonType.COMPANY ? 'Empresa' : 'Persona natural'}</p>
                        {foundPerson.documentNumber && (
                            <p className="text-neutral-600">
                                Documento: {(foundPerson.documentType ?? 'Documento')} {foundPerson.documentNumber}
                            </p>
                        )}
                        {foundPerson.email && <p className="text-neutral-600">Correo: {foundPerson.email}</p>}
                        {foundPerson.phone && <p className="text-neutral-600">Teléfono: {foundPerson.phone}</p>}
                        {foundPerson.address && <p className="text-neutral-600">Dirección: {foundPerson.address}</p>}
                    </div>
                )}

                <div className="space-y-4">
                    <Select
                        label="Tipo de Persona"
                        options={personTypeOptions}
                        value={personForm.personType}
                        onChange={(val) => {
                            if (typeof val === 'string') {
                                handlePersonTypeChange(val as PersonType);
                            }
                        }}
                        data-test-id="create-customer-person-type"
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select
                            label="Tipo de Documento"
                            options={documentTypeOptions}
                            value={personForm.documentType}
                            onChange={(val) => {
                                if (typeof val === 'string') {
                                    handleDocumentTypeChange(val as DocumentType);
                                }
                            }}
                            disabled={isDocumentTypeSelectDisabled}
                            data-test-id="create-customer-document-type"
                        />
                        <TextField
                            label={documentLabel}
                            placeholder={documentPlaceholder}
                            type={documentFieldType}
                            value={personForm.documentNumber}
                            onChange={(e) => handlePersonFieldChange('documentNumber', e.target.value)}
                            required
                            data-test-id="create-customer-document"
                        />
                    </div>

                    {personForm.personType === PersonType.NATURAL ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <TextField
                                label="Nombre"
                                value={personForm.firstName}
                                onChange={(e) => handlePersonFieldChange('firstName', e.target.value)}
                                required={!foundPerson}
                                data-test-id="create-customer-first-name"
                            />
                            <TextField
                                label="Apellido"
                                value={personForm.lastName}
                                onChange={(e) => handlePersonFieldChange('lastName', e.target.value)}
                                required={!foundPerson && personForm.personType === PersonType.NATURAL}
                                data-test-id="create-customer-last-name"
                            />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <TextField
                                label="Razón Social"
                                value={personForm.businessName}
                                onChange={(e) => handlePersonFieldChange('businessName', e.target.value)}
                                required={!foundPerson}
                                data-test-id="create-customer-business-name"
                            />
                            <TextField
                                label="Nombre de Contacto"
                                value={personForm.firstName}
                                onChange={(e) => handlePersonFieldChange('firstName', e.target.value)}
                                data-test-id="create-customer-contact-name"
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <TextField
                            label="Teléfono"
                            value={personForm.phone}
                            onChange={(e) => handlePersonFieldChange('phone', e.target.value)}
                            placeholder="+56 9 1234 5678"
                            data-test-id="create-customer-phone"
                        />
                        <TextField
                            label="Email"
                            type="email"
                            value={personForm.email}
                            onChange={(e) => handlePersonFieldChange('email', e.target.value)}
                            data-test-id="create-customer-email"
                        />
                    </div>

                    <TextField
                        label="Dirección"
                        value={personForm.address}
                        onChange={(e) => handlePersonFieldChange('address', e.target.value)}
                        data-test-id="create-customer-address"
                    />
                </div>

                {/* Datos de Cliente */}
                <div className="space-y-4">
                    <h3 className="font-medium text-neutral-700 border-b pb-2">Datos de Cliente</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <TextField
                            label="Límite de Crédito"
                            type="currency"
                            currencySymbol="$"
                            value={customerForm.creditLimit}
                            onChange={(e) => handleCustomerFieldChange('creditLimit', e.target.value)}
                            data-test-id="create-customer-credit-limit"
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
                            value={Number(customerForm.paymentDayOfMonth)}
                            onChange={(id) => handleCustomerFieldChange('paymentDayOfMonth', String(id ?? 5))}
                            data-test-id="create-customer-payment-day"
                        />
                    </div>

                    <TextField
                        label="Notas"
                        type="textarea"
                        rows={3}
                        value={customerForm.notes}
                        onChange={(e) => handleCustomerFieldChange('notes', e.target.value)}
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
