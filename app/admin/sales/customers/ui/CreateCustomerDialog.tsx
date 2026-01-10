'use client';

import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import AutoComplete, { type Option as AutoCompleteOption } from '@/app/baseComponents/AutoComplete/AutoComplete';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import Select from '@/app/baseComponents/Select/Select';
import { Button } from '@/app/baseComponents/Button/Button';
import Alert from '@/app/baseComponents/Alert/Alert';
import { useAlert } from '@/app/state/hooks/useAlert';
import { createCustomer } from '@/app/actions/customers';
import { searchPersons } from '@/app/actions/persons';
import { DocumentType, PersonType } from '@/data/entities/Person';

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

type PersonSearchResult = Awaited<ReturnType<typeof searchPersons>>[number];

interface PersonOption extends AutoCompleteOption {
    person?: PersonSearchResult;
    isCreateOption?: boolean;
    searchTerm?: string;
}

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
    defaultPaymentTermDays: string;
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
    defaultPaymentTermDays: '1',
    notes: '',
});

const buildPersonDisplayName = (person: PersonSearchResult): string => {
    if (person.type === PersonType.COMPANY) {
        return person.businessName?.trim() || person.firstName || 'Empresa sin nombre';
    }

    const naturalName = [person.firstName, person.lastName].filter(Boolean).join(' ').trim();
    if (naturalName) {
        return naturalName;
    }

    return person.businessName?.trim() || 'Persona sin nombre';
};

const buildPersonOptionLabel = (person: PersonSearchResult): string => {
    const name = buildPersonDisplayName(person);
    const typeLabel = person.type === PersonType.COMPANY ? 'Empresa' : 'Persona natural';
    const documentLabel = person.documentNumber ? `${person.documentType ?? ''} ${person.documentNumber}`.trim() : 'Sin documento';
    return `${name} · ${documentLabel} (${typeLabel})`;
};

const buildCreateOption = (term: string): PersonOption => ({
    id: '__create__',
    label: 'Crear nueva persona',
    isCreateOption: true,
    searchTerm: term,
});

const isDocumentLike = (value: string): boolean => {
    const sanitized = value.replace(/\s+/g, '');
    return /^[0-9.\-kK]+$/.test(sanitized);
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
    const [personOptions, setPersonOptions] = useState<PersonOption[]>([]);
    const [selectedPersonOption, setSelectedPersonOption] = useState<PersonOption | null>(null);
    const [personSearchTerm, setPersonSearchTerm] = useState('');
    const [isSearchingPersons, setIsSearchingPersons] = useState(false);
    const [isCreatingNewPerson, setIsCreatingNewPerson] = useState(false);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

    const handlePaymentTermDaysInput = (
        event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
        const rawValue = event.target.value ?? '';
        const digitsOnly = rawValue.replace(/\D/g, '');

        if (digitsOnly.length === 0) {
            setCustomerForm(prev => ({
                ...prev,
                defaultPaymentTermDays: '',
            }));
            return;
        }

        const trimmed = digitsOnly.slice(0, 2);
        let numericValue = Number.parseInt(trimmed, 10);

        if (Number.isNaN(numericValue)) {
            setCustomerForm(prev => ({
                ...prev,
                defaultPaymentTermDays: '',
            }));
            return;
        }

        numericValue = Math.min(31, Math.max(1, numericValue));

        setCustomerForm(prev => ({
            ...prev,
            defaultPaymentTermDays: numericValue.toString(),
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

    const handlePersonSearchInput = (value: string) => {
        setPersonSearchTerm(value);
        if (!value.trim()) {
            setPersonOptions([]);
        }
    };

    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        const trimmed = personSearchTerm.trim();

        if (!trimmed) {
            setIsSearchingPersons(false);
            setPersonOptions([]);
            return;
        }

        if (trimmed.length < 2) {
            setIsSearchingPersons(false);
            setPersonOptions([buildCreateOption(trimmed)]);
            return;
        }

        setIsSearchingPersons(true);
        searchTimeoutRef.current = setTimeout(async () => {
            try {
                const persons = await searchPersons({ term: trimmed, limit: 10 });
                const mapped: PersonOption[] = persons.map(person => ({
                    id: person.id,
                    label: buildPersonOptionLabel(person),
                    person,
                }));
                mapped.push(buildCreateOption(trimmed));
                setPersonOptions(mapped);
            } catch (error) {
                console.error('Error searching persons:', error);
                setPersonOptions([buildCreateOption(trimmed)]);
            } finally {
                setIsSearchingPersons(false);
            }
        }, 300);

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [personSearchTerm]);

    const handlePersonSelection = (option: PersonOption | null) => {
        if (!option) {
            setSelectedPersonOption(null);
            setIsCreatingNewPerson(false);
            setPersonForm(createInitialPersonForm());
            return;
        }

        if (option.isCreateOption) {
            setSelectedPersonOption(null);
            setIsCreatingNewPerson(true);
            setPersonForm(createInitialPersonForm());
            return;
        }

        setSelectedPersonOption(option);
        setIsCreatingNewPerson(false);
    };

    const selectedPerson = selectedPersonOption?.person;
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
        if (!isCreatingNewPerson && !selectedPerson) {
            validationErrors.push('Selecciona una persona existente o crea una nueva');
        }

        if (isCreatingNewPerson) {
            if (!personForm.firstName.trim()) {
                validationErrors.push('El nombre es requerido');
            }
            if (personForm.personType === PersonType.NATURAL && !personForm.lastName.trim()) {
                validationErrors.push('El apellido es requerido para personas naturales');
            }
            if (personForm.personType === PersonType.COMPANY && !personForm.businessName.trim()) {
                validationErrors.push('La razón social es requerida para empresas');
            }
            if (!personForm.documentNumber.trim()) {
                validationErrors.push('El número de documento es requerido');
            }
            if (personForm.personType === PersonType.NATURAL && personForm.documentType === DocumentType.RUT) {
                validationErrors.push('Las personas naturales no pueden tener documento tipo RUT');
            }
        }

        const parsedPaymentDays = Number.parseInt(customerForm.defaultPaymentTermDays, 10);
        if (Number.isNaN(parsedPaymentDays) || parsedPaymentDays < 1 || parsedPaymentDays > 31) {
            validationErrors.push('Los días de pago deben estar entre 1 y 31');
        }
        
        if (validationErrors.length > 0) {
            setErrors(validationErrors);
            return;
        }

        setIsSubmitting(true);
        setErrors([]);

        try {
            const paymentDaysNumber = Math.min(31, Math.max(1, parsedPaymentDays));
            const payload = {
                creditLimit: parseFloat(customerForm.creditLimit) || 0,
                defaultPaymentTermDays: paymentDaysNumber,
                notes: customerForm.notes || undefined,
            } as Parameters<typeof createCustomer>[0];

            if (!isCreatingNewPerson && selectedPerson) {
                payload.personId = selectedPerson.id;
            } else {
                const resolvedDocumentType = isCompany ? DocumentType.RUT : personForm.documentType ?? DocumentType.RUN;
                payload.person = {
                    type: personForm.personType,
                    firstName: personForm.firstName.trim(),
                    lastName: personForm.personType === PersonType.NATURAL ? personForm.lastName.trim() || undefined : undefined,
                    businessName: personForm.personType === PersonType.COMPANY ? personForm.businessName.trim() || undefined : undefined,
                    documentType: resolvedDocumentType,
                    documentNumber: personForm.documentNumber.trim() || undefined,
                    email: personForm.email.trim() || undefined,
                    phone: personForm.phone.trim() || undefined,
                    address: personForm.address.trim() || undefined,
                };
            }

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
        } catch (err: any) {
            setErrors([err?.message || 'Error al crear el cliente']);
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setPersonForm(createInitialPersonForm());
        setCustomerForm(createInitialCustomerForm());
        setPersonOptions([]);
        setSelectedPersonOption(null);
        setPersonSearchTerm('');
        setIsCreatingNewPerson(false);
    };

    const handleClose = () => {
        resetForm();
        setErrors([]);
        setIsSubmitting(false);
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
                    <h3 className="font-medium text-neutral-700 border-b pb-2">Datos de Persona</h3>

                    <AutoComplete<PersonOption>
                        label="Persona"
                        placeholder="Busca por nombre o documento"
                        options={personOptions}
                        value={selectedPersonOption}
                        onChange={handlePersonSelection}
                        onInputChange={handlePersonSearchInput}
                        filterOption={(option, inputValue) => {
                            if ((option as PersonOption).isCreateOption) {
                                return true;
                            }
                            return option.label.toLowerCase().includes(inputValue.toLowerCase());
                        }}
                        data-test-id="create-customer-person-autocomplete"
                    />

                    {isSearchingPersons && (
                        <p className="text-xs text-neutral-500">Buscando personas…</p>
                    )}

                    {!isCreatingNewPerson && selectedPerson && (
                        <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4 text-sm space-y-1">
                            <p className="font-medium text-neutral-800">{buildPersonDisplayName(selectedPerson)}</p>
                            <p className="text-neutral-600">Tipo: {selectedPerson.type === PersonType.COMPANY ? 'Empresa' : 'Persona natural'}</p>
                            {selectedPerson.documentNumber && (
                                <p className="text-neutral-600">
                                    Documento: {(selectedPerson.documentType ?? 'Documento')} {selectedPerson.documentNumber}
                                </p>
                            )}
                            {selectedPerson.email && <p className="text-neutral-600">Correo: {selectedPerson.email}</p>}
                            {selectedPerson.phone && <p className="text-neutral-600">Teléfono: {selectedPerson.phone}</p>}
                            {selectedPerson.address && <p className="text-neutral-600">Dirección: {selectedPerson.address}</p>}
                        </div>
                    )}

                    {isCreatingNewPerson && (
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

                            {personForm.personType === PersonType.NATURAL ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <TextField
                                        label="Nombre"
                                        value={personForm.firstName}
                                        onChange={(e) => handlePersonFieldChange('firstName', e.target.value)}
                                        required
                                        data-test-id="create-customer-first-name"
                                    />
                                    <TextField
                                        label="Apellido"
                                        value={personForm.lastName}
                                        onChange={(e) => handlePersonFieldChange('lastName', e.target.value)}
                                        required
                                        data-test-id="create-customer-last-name"
                                    />
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <TextField
                                        label="Razón Social"
                                        value={personForm.businessName}
                                        onChange={(e) => handlePersonFieldChange('businessName', e.target.value)}
                                        required
                                        data-test-id="create-customer-business-name"
                                    />
                                    <TextField
                                        label="Nombre de Contacto"
                                        value={personForm.firstName}
                                        onChange={(e) => handlePersonFieldChange('firstName', e.target.value)}
                                        required
                                        data-test-id="create-customer-contact-name"
                                    />
                                </div>
                            )}

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
                    )}
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
                        <TextField
                            label="Días de Pago"
                            type="number"
                            value={customerForm.defaultPaymentTermDays}
                            onChange={handlePaymentTermDaysInput}
                            min={1}
                            max={31}
                            step={1}
                            inputMode="numeric"
                            data-test-id="create-customer-payment-days"
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
