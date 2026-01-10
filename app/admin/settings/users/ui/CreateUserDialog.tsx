'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import AutoComplete, { type Option as AutoCompleteOption } from '@/app/baseComponents/AutoComplete/AutoComplete';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import Select from '@/app/baseComponents/Select/Select';
import { Button } from '@/app/baseComponents/Button/Button';
import Alert from '@/app/baseComponents/Alert/Alert';
import { useAlert } from '@/app/state/hooks/useAlert';
import { createUserWithPerson } from '@/app/actions/users';
import { searchPersons } from '@/app/actions/persons';
import { UserRole } from '@/data/entities/User';
import { DocumentType, PersonType } from '@/data/entities/Person';

interface CreateUserDialogProps {
    open: boolean;
    onClose: () => void;
    'data-test-id'?: string;
}

interface UserFormState {
    userName: string;
    mail: string;
    password: string;
    rol: 'OPERATOR' | 'ADMIN';
}

interface PersonFormState {
    firstName: string;
    lastName: string;
    documentNumber: string;
    email: string;
    phone: string;
    address: string;
}

type PersonSearchResult = Awaited<ReturnType<typeof searchPersons>>[number];

interface PersonOption extends AutoCompleteOption {
    person?: PersonSearchResult;
    isCreateOption?: boolean;
    searchTerm?: string;
}

const rolOptions = [
    { id: 'OPERATOR', label: 'Operador' },
    { id: 'ADMIN', label: 'Administrador' }
];

const createInitialUserForm = (): UserFormState => ({
    userName: '',
    mail: '',
    password: '',
    rol: 'OPERATOR'
});

const createInitialPersonForm = (): PersonFormState => ({
    firstName: '',
    lastName: '',
    documentNumber: '',
    email: '',
    phone: '',
    address: ''
});

const buildPersonLabel = (person: PersonSearchResult): string => {
    const baseName = person.businessName?.trim()
        ? person.businessName.trim()
        : [person.firstName, person.lastName].filter(Boolean).join(' ').trim();
    const label = baseName || 'Persona sin nombre';
    return person.documentNumber ? `${label} · ${person.documentNumber}` : label;
};

const buildCreateOption = (term: string): PersonOption => ({
    id: '__create__',
    label: `Crear persona "${term}"`,
    isCreateOption: true,
    searchTerm: term,
});

const isDocumentLike = (value: string): boolean => {
    const sanitized = value.replace(/\s+/g, '');
    return /^[0-9.\-kK]+$/.test(sanitized);
};

const CreateUserDialog: React.FC<CreateUserDialogProps> = ({
    open,
    onClose,
    'data-test-id': dataTestId,
}) => {
    const router = useRouter();
    const { success } = useAlert();
    const { data: session } = useSession();
    const currentUserId = (session?.user as any)?.id;

    const [formData, setFormData] = useState<UserFormState>(() => createInitialUserForm());
    const [personForm, setPersonForm] = useState<PersonFormState>(() => createInitialPersonForm());
    const [personOptions, setPersonOptions] = useState<PersonOption[]>([]);
    const [selectedPersonOption, setSelectedPersonOption] = useState<PersonOption | null>(null);
    const [isCreatingNewPerson, setIsCreatingNewPerson] = useState(false);
    const [isSearchingPersons, setIsSearchingPersons] = useState(false);
    const [personSearchTerm, setPersonSearchTerm] = useState('');
    const [errors, setErrors] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleUserFieldChange = (field: keyof UserFormState, value: string) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handlePersonFieldChange = (field: keyof PersonFormState, value: string) => {
        setPersonForm((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const resetState = () => {
        setFormData(createInitialUserForm());
        setPersonForm(createInitialPersonForm());
        setSelectedPersonOption(null);
        setPersonOptions([]);
        setPersonSearchTerm('');
        setIsCreatingNewPerson(false);
        setErrors([]);
        setIsSubmitting(false);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handlePersonSearchInput = (value: string) => {
        setPersonSearchTerm(value);

        if (!value) {
            setPersonOptions([]);
            setSelectedPersonOption(null);
        }

        if (value && isCreatingNewPerson) {
            setIsCreatingNewPerson(false);
            setPersonForm(createInitialPersonForm());
        }
    };

    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (isCreatingNewPerson) {
            setIsSearchingPersons(false);
            return;
        }

        const trimmed = personSearchTerm.trim();

        if (!trimmed) {
            setPersonOptions([]);
            setIsSearchingPersons(false);
            return;
        }

        if (trimmed.length < 2) {
            setPersonOptions([buildCreateOption(trimmed)]);
            setIsSearchingPersons(false);
            return;
        }

        setIsSearchingPersons(true);
        searchTimeoutRef.current = setTimeout(async () => {
            try {
                const persons = await searchPersons({ term: trimmed, limit: 10 });
                const mapped: PersonOption[] = persons.map((person) => ({
                    id: person.id,
                    label: buildPersonLabel(person),
                    person,
                }));

                mapped.push(buildCreateOption(trimmed));
                setPersonOptions(mapped);
            } catch (error) {
                console.error('Error searching persons', error);
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
    }, [personSearchTerm, isCreatingNewPerson]);

    const handlePersonSelection = (option: PersonOption | null) => {
        if (!option) {
            setSelectedPersonOption(null);
            setIsCreatingNewPerson(false);
            setPersonForm(createInitialPersonForm());
            return;
        }

        if (option.isCreateOption) {
            const term = option.searchTerm ?? personSearchTerm.trim();
            const looksLikeDocument = term ? isDocumentLike(term) : false;

            setSelectedPersonOption(null);
            setIsCreatingNewPerson(true);
            setPersonForm(() => {
                const base = createInitialPersonForm();
                return {
                    ...base,
                    firstName: looksLikeDocument ? '' : term,
                    documentNumber: looksLikeDocument ? term : '',
                    email: formData.mail,
                };
            });
            return;
        }

        if (option.person?.type === PersonType.COMPANY) {
            setErrors(['Solo puedes asociar usuarios a personas naturales']);
            setSelectedPersonOption(null);
            setIsCreatingNewPerson(false);
            setPersonForm(createInitialPersonForm());
            return;
        }

        setSelectedPersonOption(option);
        setIsCreatingNewPerson(false);
        setPersonForm(() => {
            const base = createInitialPersonForm();
            return {
                ...base,
                email: option.person?.email ?? '',
                phone: option.person?.phone ?? '',
                address: option.person?.address ?? '',
                firstName: option.person?.firstName ?? '',
                lastName: option.person?.lastName ?? '',
                documentNumber: option.person?.documentNumber ?? '',
            };
        });
    };

    useEffect(() => {
        if (!isCreatingNewPerson) return;

        setPersonForm((prev) => {
            if (prev.email) {
                return prev;
            }
            return {
                ...prev,
                email: formData.mail,
            };
        });
    }, [formData.mail, isCreatingNewPerson]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        const validationErrors: string[] = [];

        if (!formData.userName.trim()) validationErrors.push('El nombre de usuario es requerido');
        if (!formData.mail.trim()) validationErrors.push('El correo es requerido');
        if (!formData.password.trim()) validationErrors.push('La contraseña es requerida');

        if (!selectedPersonOption && !isCreatingNewPerson) {
            validationErrors.push('Selecciona una persona o crea una nueva');
        }

        if (isCreatingNewPerson) {
            if (!personForm.firstName.trim()) {
                validationErrors.push('El nombre es obligatorio para la persona');
            }
            if (!personForm.lastName.trim()) {
                validationErrors.push('El apellido es obligatorio para personas naturales');
            }
            if (!personForm.documentNumber.trim()) {
                validationErrors.push('El documento es obligatorio para la persona');
            }
        }

        if (validationErrors.length > 0) {
            setErrors(validationErrors);
            return;
        }

        setIsSubmitting(true);
        setErrors([]);

        const payload = {
            userName: formData.userName.trim(),
            mail: formData.mail.trim(),
            password: formData.password,
            rol: formData.rol === 'ADMIN' ? UserRole.ADMIN : UserRole.OPERATOR,
            personId: !isCreatingNewPerson && selectedPersonOption?.person ? selectedPersonOption.person.id : undefined,
            person: isCreatingNewPerson
                ? {
                      type: PersonType.NATURAL,
                      firstName: personForm.firstName.trim(),
                      lastName: personForm.lastName.trim() || undefined,
                      businessName: undefined,
                      documentType: DocumentType.RUN,
                      documentNumber: personForm.documentNumber.trim(),
                      email: personForm.email.trim() || formData.mail.trim() || undefined,
                      phone: personForm.phone.trim() || undefined,
                      address: personForm.address.trim() || undefined,
                  }
                : undefined,
        };

        try {
            const result = await createUserWithPerson(payload, currentUserId);

            if (result.success) {
                success('Usuario creado correctamente');
                setTimeout(() => {
                    resetState();
                    onClose();
                    router.refresh();
                }, 300);
            } else {
                setErrors([result.error || 'Error al crear el usuario']);
                setIsSubmitting(false);
            }
        } catch (error) {
            setErrors([error instanceof Error ? error.message : 'Error al crear el usuario']);
            setIsSubmitting(false);
        }
    };

    const selectedPerson = selectedPersonOption?.person;

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            title="Crear Usuario"
            data-test-id={dataTestId}
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {errors.length > 0 && (
                    <Alert variant="error">
                        <ul className="list-disc list-inside">
                            {errors.map((err, index) => (
                                <li key={index}>{err}</li>
                            ))}
                        </ul>
                    </Alert>
                )}

                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-neutral-700 border-b pb-2">
                        Información del Usuario
                    </h3>

                    <TextField
                        label="Nombre de usuario"
                        value={formData.userName}
                        onChange={(event) => handleUserFieldChange('userName', event.target.value)}
                        required
                        data-test-id="create-user-username"
                    />

                    <TextField
                        label="Correo"
                        type="email"
                        value={formData.mail}
                        onChange={(event) => handleUserFieldChange('mail', event.target.value)}
                        required
                        data-test-id="create-user-email"
                    />

                    <TextField
                        label="Contraseña"
                        type="password"
                        value={formData.password}
                        onChange={(event) => handleUserFieldChange('password', event.target.value)}
                        required
                        data-test-id="create-user-password"
                    />

                    <Select
                        label="Rol"
                        options={rolOptions}
                        value={formData.rol}
                        onChange={(value) => handleUserFieldChange('rol', value as UserFormState['rol'])}
                        data-test-id="create-user-rol"
                    />
                </div>

                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-neutral-700 border-b pb-2">
                        Persona asociada
                    </h3>

                    <AutoComplete<PersonOption>
                        label="Persona"
                        placeholder="Busca por nombre o RUT"
                        options={personOptions}
                        value={selectedPersonOption}
                        onChange={handlePersonSelection}
                        onInputChange={handlePersonSearchInput}
                        data-test-id="create-user-person-autocomplete"
                    />

                    {isSearchingPersons && (
                        <p className="text-xs text-neutral-500">Buscando personas…</p>
                    )}

                    {!isCreatingNewPerson && selectedPerson && (
                        <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4 text-sm space-y-1">
                            <p className="font-medium text-neutral-800">{buildPersonLabel(selectedPerson)}</p>
                            {selectedPerson.email && <p className="text-neutral-600">Correo: {selectedPerson.email}</p>}
                            {selectedPerson.phone && <p className="text-neutral-600">Teléfono: {selectedPerson.phone}</p>}
                            {selectedPerson.address && <p className="text-neutral-600">Dirección: {selectedPerson.address}</p>}
                        </div>
                    )}

                    {isCreatingNewPerson && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <TextField
                                    label="Nombre"
                                    value={personForm.firstName}
                                    onChange={(event) => handlePersonFieldChange('firstName', event.target.value)}
                                    required
                                    data-test-id="create-user-person-first-name"
                                />
                                <TextField
                                    label="Apellido"
                                    value={personForm.lastName}
                                    onChange={(event) => handlePersonFieldChange('lastName', event.target.value)}
                                    required
                                    data-test-id="create-user-person-last-name"
                                />
                            </div>

                            <TextField
                                label="RUN"
                                placeholder="RUN"
                                type="dni"
                                value={personForm.documentNumber}
                                onChange={(event) => handlePersonFieldChange('documentNumber', event.target.value)}
                                required
                                data-test-id="create-user-person-dni"
                            />

                            <TextField
                                label="Email"
                                type="email"
                                value={personForm.email}
                                onChange={(event) => handlePersonFieldChange('email', event.target.value)}
                                data-test-id="create-user-person-email"
                            />

                            <TextField
                                label="Teléfono"
                                value={personForm.phone}
                                onChange={(event) => handlePersonFieldChange('phone', event.target.value)}
                                data-test-id="create-user-person-phone"
                            />

                            <TextField
                                label="Dirección"
                                value={personForm.address}
                                onChange={(event) => handlePersonFieldChange('address', event.target.value)}
                                data-test-id="create-user-person-address"
                            />
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button
                        type="button"
                        variant="outlined"
                        onClick={handleClose}
                        disabled={isSubmitting}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Creando...' : 'Crear Usuario'}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
};

export default CreateUserDialog;
