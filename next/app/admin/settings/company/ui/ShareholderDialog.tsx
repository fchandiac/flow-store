'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Dialog from '@/baseComponents/Dialog/Dialog';
import AutoComplete, { type Option as AutoCompleteOption } from '@/baseComponents/AutoComplete/AutoComplete';
import { TextField } from '@/baseComponents/TextField/TextField';
import { Button } from '@/baseComponents/Button/Button';
import Alert from '@/baseComponents/Alert/Alert';
import Select from '@/baseComponents/Select/Select';
import { createPerson, searchPersons } from '@/app/actions/persons';
import type { ShareholderRecord } from '@/actions/shareholders';
import { DocumentType, PersonType } from '@/data/entities/Person';

export interface ShareholderFormValues {
    personId: string;
    role: string | null;
    ownershipPercentage: number | null;
    notes: string | null;
}

interface ShareholderDialogProps {
    open: boolean;
    mode: 'create' | 'edit';
    shareholder?: ShareholderRecord | null;
    onClose: () => void;
    onSubmit: (values: ShareholderFormValues) => Promise<{ success: boolean; error?: string }>;
}

type RawPersonSearchResult = Awaited<ReturnType<typeof searchPersons>>[number];

interface PersonSearchResult {
    id: string;
    type: PersonType;
    firstName: string;
    lastName: string | null;
    businessName: string | null;
    documentType: DocumentType | null;
    documentNumber: string | null;
    email: string | null;
    phone: string | null;
}

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
}

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

const buildPersonOption = (person: PersonSearchResult): PersonOption => {
    const displayName = buildPersonDisplayName(person);
    const documentLabel = person.documentNumber
        ? `${person.documentType ?? ''} ${person.documentNumber}`.trim()
        : 'Sin documento';

    return {
        id: person.id,
        label: `${displayName} · ${documentLabel}`,
        person,
    };
};

const buildCreateOption = (term: string): PersonOption => ({
    id: '__create__',
    label: 'Crear nueva persona',
    isCreateOption: true,
    searchTerm: term,
});

const normalizePersonResult = (person: RawPersonSearchResult): PersonSearchResult => ({
    id: person.id,
    type: person.type,
    firstName: person.firstName,
    lastName: person.lastName ?? null,
    businessName: person.businessName ?? null,
    documentType: person.documentType ?? null,
    documentNumber: person.documentNumber ?? null,
    email: person.email ?? null,
    phone: person.phone ?? null,
});

const personTypeOptions = [
    { id: PersonType.NATURAL, label: 'Persona natural' },
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

const createInitialPersonForm = (): PersonFormState => ({
    personType: PersonType.NATURAL,
    documentType: DocumentType.RUN,
    firstName: '',
    lastName: '',
    businessName: '',
    documentNumber: '',
    email: '',
    phone: '',
});

const isDocumentLike = (value: string): boolean => {
    const sanitized = value.replace(/\s+/g, '');
    return /^[0-9.\-kK]+$/.test(sanitized);
};

const parseOwnershipValue = (value: string): number | null => {
    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }

    const normalized = Number(trimmed);
    if (!Number.isFinite(normalized)) {
        throw new Error('Ingresa un número válido para el porcentaje.');
    }

    if (normalized < 0 || normalized > 100) {
        throw new Error('El porcentaje debe estar entre 0 y 100.');
    }

    return Number(normalized.toFixed(2));
};

export default function ShareholderDialog({ open, mode, shareholder, onClose, onSubmit }: ShareholderDialogProps) {
    const [errors, setErrors] = useState<string[]>([]);
    const [personOptions, setPersonOptions] = useState<PersonOption[]>([]);
    const [selectedPerson, setSelectedPerson] = useState<PersonOption | null>(null);
    const [isCreatingPerson, setIsCreatingPerson] = useState(false);
    const [personForm, setPersonForm] = useState<PersonFormState>(() => createInitialPersonForm());
    const [personSearchTerm, setPersonSearchTerm] = useState('');
    const [role, setRole] = useState('');
    const [ownership, setOwnership] = useState('');
    const [notes, setNotes] = useState('');
    const [isPending, startTransition] = useTransition();
    const [isSearchingPersons, setIsSearchingPersons] = useState(false);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!open) {
            return;
        }

        if (mode === 'edit' && shareholder?.person) {
            const personOption = buildPersonOption({
                id: shareholder.person.id,
                type: shareholder.person.type,
                firstName: shareholder.person.firstName ?? '',
                lastName: shareholder.person.lastName ?? null,
                businessName: shareholder.person.businessName ?? null,
                documentType: shareholder.person.documentType ?? null,
                documentNumber: shareholder.person.documentNumber ?? null,
                email: shareholder.person.email ?? null,
                phone: shareholder.person.phone ?? null,
            });

            setSelectedPerson(personOption);
            setPersonOptions([personOption]);
        } else {
            setSelectedPerson(null);
            setPersonOptions([]);
        }

        setIsCreatingPerson(false);
        setPersonForm(createInitialPersonForm());
        setPersonSearchTerm('');
        setIsSearchingPersons(false);
        setRole(shareholder?.role ?? '');
        setOwnership(
            shareholder?.ownershipPercentage !== null && shareholder?.ownershipPercentage !== undefined
                ? shareholder.ownershipPercentage.toString()
                : '',
        );
        setNotes(shareholder?.notes ?? '');
        setErrors([]);
    }, [open, mode, shareholder]);

    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, []);

    const dialogTitle = useMemo(
        () => (mode === 'create' ? 'Agregar socio' : 'Editar socio'),
        [mode],
    );

    const handlePersonSearch = (value: string) => {
        if (mode === 'edit' || isCreatingPerson) {
            return;
        }

        setPersonSearchTerm(value);

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        const term = value.trim();
        if (!term) {
            setPersonOptions([]);
            setIsSearchingPersons(false);
            return;
        }

        if (term.length < 2) {
            setPersonOptions([buildCreateOption(term)]);
            setIsSearchingPersons(false);
            return;
        }

        searchTimeoutRef.current = setTimeout(async () => {
            setIsSearchingPersons(true);
            try {
                const results = await searchPersons({ term, limit: 10 });
                const normalized = results.map(normalizePersonResult);
                const options = normalized.map(buildPersonOption);
                options.push(buildCreateOption(term));
                setPersonOptions(options);
            } catch (error) {
                console.error('[ShareholderDialog] searchPersons error:', error);
                setPersonOptions([buildCreateOption(term)]);
            } finally {
                setIsSearchingPersons(false);
            }
        }, 250);
    };

    const enterCreatePersonMode = (term?: string) => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
            searchTimeoutRef.current = null;
        }

        setSelectedPerson(null);
        setPersonOptions([]);
        setPersonSearchTerm('');
        setIsSearchingPersons(false);
        setIsCreatingPerson(true);
        setPersonForm(() => {
            const base = createInitialPersonForm();
            const searchTerm = term?.trim();
            if (searchTerm) {
                if (isDocumentLike(searchTerm)) {
                    base.documentNumber = searchTerm.replace(/\s+/g, '');
                } else {
                    base.firstName = searchTerm;
                    base.businessName = searchTerm;
                }
            }
            return base;
        });
        setErrors((prev) => prev.filter((message) => !message.toLowerCase().includes('persona')));
    };

    const handlePersonSelection = (option: PersonOption | null) => {
        if (!option) {
            setSelectedPerson(null);
            return;
        }

        if (option.isCreateOption) {
            enterCreatePersonMode(option.searchTerm);
            return;
        }

        if (!option.person) {
            setSelectedPerson(null);
            return;
        }

        setSelectedPerson(option);
        setIsCreatingPerson(false);
        setPersonForm(createInitialPersonForm());
        setErrors((prev) => prev.filter((message) => !message.toLowerCase().includes('persona')));
    };

    const handleToggleCreatePerson = () => {
        if (isCreatingPerson) {
            setIsCreatingPerson(false);
            setPersonForm(createInitialPersonForm());
            setErrors((prev) => prev.filter((message) => !message.toLowerCase().includes('persona')));
            return;
        }

        enterCreatePersonMode(personSearchTerm);
    };

    const handlePersonFormChange = (field: keyof PersonFormState, value: string) => {
        setPersonForm((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handlePersonTypeChange = (value: PersonType) => {
        setPersonForm((prev) => {
            const next: PersonFormState = {
                ...prev,
                personType: value,
            };

            if (value === PersonType.COMPANY) {
                next.documentType = DocumentType.RUT;
                next.lastName = '';
            } else if (prev.documentType === DocumentType.RUT) {
                next.documentType = DocumentType.RUN;
            }

            return next;
        });
    };

    const handleDocumentTypeChange = (value: DocumentType) => {
        setPersonForm((prev) => ({
            ...prev,
            documentType: value,
        }));
    };

    const documentTypeOptions = personForm.personType === PersonType.COMPANY ? companyDocumentTypeOptions : naturalDocumentTypeOptions;
    const documentLabel = personForm.documentType === DocumentType.RUT
        ? 'RUT'
        : personForm.documentType === DocumentType.RUN
            ? 'RUN'
            : 'Número de documento';
    const documentPlaceholder = documentLabel;
    const documentInputType =
        personForm.documentType === DocumentType.RUT || personForm.documentType === DocumentType.RUN ? 'dni' : 'text';
    const selectedPersonDetails = selectedPerson?.person ?? null;

    const handleSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
        event.preventDefault();

        const validationErrors: string[] = [];

        if (mode === 'create') {
            if (!isCreatingPerson && !selectedPerson?.person) {
                validationErrors.push('Selecciona una persona para registrar como socia.');
            }

            if (isCreatingPerson) {
                if (personForm.personType === PersonType.NATURAL) {
                    if (!personForm.firstName.trim()) {
                        validationErrors.push('Ingresa el nombre de la persona.');
                    }
                    if (!personForm.lastName.trim()) {
                        validationErrors.push('Ingresa el apellido de la persona.');
                    }
                } else if (!personForm.businessName.trim()) {
                    validationErrors.push('La razón social es obligatoria para empresas.');
                }

                if (!personForm.documentNumber.trim()) {
                    validationErrors.push('Ingresa el documento de la persona.');
                }

                if (personForm.personType === PersonType.NATURAL && personForm.documentType === DocumentType.RUT) {
                    validationErrors.push('Las personas naturales no pueden usar documento tipo RUT.');
                }
            }
        }

        let parsedOwnership: number | null = null;
        if (ownership.trim()) {
            try {
                parsedOwnership = parseOwnershipValue(ownership);
            } catch (error) {
                validationErrors.push(error instanceof Error ? error.message : 'Porcentaje inválido.');
            }
        }

        if (validationErrors.length > 0) {
            setErrors(validationErrors);
            return;
        }

        setErrors([]);

        const basePersonId = mode === 'edit' ? shareholder?.personId ?? null : selectedPerson?.person?.id ?? null;

        startTransition(async () => {
            let resolvedPersonId = basePersonId;

            if (mode === 'create' && isCreatingPerson) {
                const resolvedDocumentType = personForm.personType === PersonType.COMPANY
                    ? DocumentType.RUT
                    : personForm.documentType ?? DocumentType.RUN;

                const newPersonResult = await createPerson({
                    type: personForm.personType,
                    firstName:
                        personForm.personType === PersonType.COMPANY
                            ? (personForm.businessName.trim() || personForm.firstName.trim())
                            : personForm.firstName.trim(),
                    lastName: personForm.personType === PersonType.NATURAL ? personForm.lastName.trim() || undefined : undefined,
                    businessName: personForm.personType === PersonType.COMPANY ? personForm.businessName.trim() || undefined : undefined,
                    documentType: resolvedDocumentType,
                    documentNumber: personForm.documentNumber.trim() || undefined,
                    email: personForm.email.trim() || undefined,
                    phone: personForm.phone.trim() || undefined,
                    address: undefined,
                });

                if (!newPersonResult.success || !newPersonResult.person) {
                    setErrors([newPersonResult.error ?? 'No se pudo crear la persona.']);
                    return;
                }

                const createdPerson: PersonSearchResult = {
                    id: newPersonResult.person.id,
                    type: newPersonResult.person.type,
                    firstName: newPersonResult.person.firstName,
                    lastName: newPersonResult.person.lastName ?? null,
                    businessName: newPersonResult.person.businessName ?? null,
                    documentType: newPersonResult.person.documentType ?? null,
                    documentNumber: newPersonResult.person.documentNumber ?? null,
                    email: newPersonResult.person.email ?? null,
                    phone: newPersonResult.person.phone ?? null,
                };
                const createdOption = buildPersonOption(createdPerson);
                setSelectedPerson(createdOption);
                setPersonOptions([createdOption]);
                setIsCreatingPerson(false);
                setPersonForm(createInitialPersonForm());
                resolvedPersonId = createdPerson.id;
            }

            if (!resolvedPersonId) {
                setErrors(['No se pudo determinar la persona seleccionada.']);
                return;
            }

            const result = await onSubmit({
                personId: resolvedPersonId,
                role: role.trim() ? role.trim() : null,
                ownershipPercentage: parsedOwnership,
                notes: notes.trim() ? notes.trim() : null,
            });

            if (!result.success) {
                setErrors([result.error ?? 'No se pudo guardar la información del socio.']);
                return;
            }

            setSelectedPerson(null);
            setPersonOptions([]);
            setPersonSearchTerm('');
            setIsCreatingPerson(false);
            setPersonForm(createInitialPersonForm());
            setRole('');
            setOwnership('');
            setNotes('');
            setErrors([]);
            onClose();
        });
    };

    const handleClose = () => {
        if (isPending) {
            return;
        }
        onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            title={dialogTitle}
            size="md"
        >
            <form className="space-y-5" onSubmit={handleSubmit}>
                {errors.length > 0 && (
                    <Alert variant="error">
                        <ul className="list-disc list-inside text-sm">
                            {errors.map((message) => (
                                <li key={message}>{message}</li>
                            ))}
                        </ul>
                    </Alert>
                )}

                {mode === 'create' ? (
                    <section className="space-y-4">
                        <div className="flex items-center justify-between gap-3">
                            <h3 className="text-sm font-medium text-neutral-700">Persona vinculada</h3>
                            <Button
                                type="button"
                                variant="text"
                                onClick={handleToggleCreatePerson}
                                disabled={isPending}
                            >
                                {isCreatingPerson ? 'Buscar persona existente' : 'Crear nueva persona'}
                            </Button>
                        </div>

                        {!isCreatingPerson && (
                            <div className="space-y-2">
                                <AutoComplete<PersonOption>
                                    label="Persona"
                                    value={selectedPerson}
                                    options={personOptions}
                                    placeholder={isSearchingPersons ? 'Buscando…' : 'Busca por nombre o documento'}
                                    onInputChange={handlePersonSearch}
                                    onChange={handlePersonSelection}
                                    filterOption={(option, inputValue) => {
                                        const personOption = option as PersonOption;
                                        if (personOption.isCreateOption) {
                                            return true;
                                        }
                                        return option.label.toLowerCase().includes(inputValue.toLowerCase());
                                    }}
                                    getOptionLabel={(option) => option.label}
                                    getOptionValue={(option) => option.id}
                                    required={!isCreatingPerson}
                                    disabled={isPending}
                                />
                                {isSearchingPersons && (
                                    <p className="text-xs text-neutral-500">Buscando personas…</p>
                                )}
                                {selectedPersonDetails && (
                                    <div className="space-y-1 rounded-md border border-neutral-200 bg-neutral-50 p-4 text-sm">
                                        <p className="font-medium text-neutral-800">{buildPersonDisplayName(selectedPersonDetails)}</p>
                                        {selectedPersonDetails.documentNumber && (
                                            <p className="text-neutral-600">
                                                Documento: {`${selectedPersonDetails.documentType ?? ''} ${selectedPersonDetails.documentNumber}`.trim()}
                                            </p>
                                        )}
                                        {selectedPersonDetails.email && (
                                            <p className="text-neutral-600">Correo: {selectedPersonDetails.email}</p>
                                        )}
                                        {selectedPersonDetails.phone && (
                                            <p className="text-neutral-600">Teléfono: {selectedPersonDetails.phone}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {isCreatingPerson && (
                            <div className="space-y-4 rounded-md border border-neutral-200 bg-neutral-50 p-4">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <Select
                                        label="Tipo de persona"
                                        options={personTypeOptions}
                                        value={personForm.personType}
                                        onChange={(value) => handlePersonTypeChange(value as PersonType)}
                                        disabled={isPending}
                                    />
                                    <Select
                                        label="Tipo de documento"
                                        options={documentTypeOptions}
                                        value={personForm.documentType}
                                        onChange={(value) => handleDocumentTypeChange(value as DocumentType)}
                                        disabled={isPending || personForm.personType === PersonType.COMPANY}
                                    />
                                </div>

                                {personForm.personType === PersonType.NATURAL ? (
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <TextField
                                            label="Nombres"
                                            value={personForm.firstName}
                                            onChange={(event) => handlePersonFormChange('firstName', event.target.value)}
                                            disabled={isPending}
                                            required
                                        />
                                        <TextField
                                            label="Apellidos"
                                            value={personForm.lastName}
                                            onChange={(event) => handlePersonFormChange('lastName', event.target.value)}
                                            disabled={isPending}
                                            required
                                        />
                                    </div>
                                ) : (
                                    <TextField
                                        label="Razón social"
                                        value={personForm.businessName}
                                        onChange={(event) => handlePersonFormChange('businessName', event.target.value)}
                                        disabled={isPending}
                                        required
                                    />
                                )}

                                <TextField
                                    label={documentLabel}
                                    placeholder={documentPlaceholder}
                                    value={personForm.documentNumber}
                                    onChange={(event) => handlePersonFormChange('documentNumber', event.target.value)}
                                    disabled={isPending}
                                    required
                                    type={documentInputType}
                                />

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <TextField
                                        label="Correo (opcional)"
                                        type="email"
                                        value={personForm.email}
                                        onChange={(event) => handlePersonFormChange('email', event.target.value)}
                                        disabled={isPending}
                                    />
                                    <TextField
                                        label="Teléfono (opcional)"
                                        value={personForm.phone}
                                        onChange={(event) => handlePersonFormChange('phone', event.target.value)}
                                        disabled={isPending}
                                    />
                                </div>
                            </div>
                        )}
                    </section>
                ) : (
                    <TextField
                        label="Persona"
                        value={shareholder?.person?.displayName ?? 'Sin datos'}
                        onChange={(event) => event.preventDefault()}
                        readOnly
                    />
                )}

                <TextField
                    label="Rol en la empresa (opcional)"
                    value={role}
                    onChange={(event) => setRole(event.target.value)}
                    placeholder="Ej. Socia fundadora, Director, etc."
                    disabled={isPending}
                />

                <TextField
                    label="Participación % (opcional)"
                    value={ownership}
                    onChange={(event) => setOwnership(event.target.value)}
                    type="number"
                    step="0.01"
                    min={0}
                    max={100}
                    placeholder="Ej. 50"
                    disabled={isPending}
                />

                <TextField
                    label="Notas (opcional)"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    type="textarea"
                    rows={3}
                    placeholder="Información relevante sobre el socio"
                    disabled={isPending}
                />

                <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outlined" onClick={handleClose} disabled={isPending}>
                        Cancelar
                    </Button>
                    <Button type="submit" loading={isPending}>
                        Guardar
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
