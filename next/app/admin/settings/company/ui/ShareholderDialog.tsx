'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Dialog from '@/baseComponents/Dialog/Dialog';
import AutoComplete, { type Option as AutoCompleteOption } from '@/baseComponents/AutoComplete/AutoComplete';
import { TextField } from '@/baseComponents/TextField/TextField';
import { Button } from '@/baseComponents/Button/Button';
import Alert from '@/baseComponents/Alert/Alert';
import { searchPersons } from '@/app/actions/persons';
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
    person: PersonSearchResult;
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
        if (mode === 'edit') {
            return;
        }

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        const term = value.trim();
        if (!term) {
            setPersonOptions([]);
            setIsSearchingPersons(false);
            return;
        }

        searchTimeoutRef.current = setTimeout(async () => {
            setIsSearchingPersons(true);
            try {
                const results = await searchPersons({ term, limit: 10 });
                const normalized = results.map(normalizePersonResult);
                setPersonOptions(normalized.map(buildPersonOption));
            } catch (error) {
                console.error('[ShareholderDialog] searchPersons error:', error);
            } finally {
                setIsSearchingPersons(false);
            }
        }, 250);
    };

    const handleSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
        event.preventDefault();

        const validationErrors: string[] = [];
        if (mode === 'create' && !selectedPerson) {
            validationErrors.push('Selecciona una persona para registrar como socia.');
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

        const personId = mode === 'edit' ? shareholder?.personId : selectedPerson?.person.id;
        if (!personId) {
            setErrors(['No se pudo determinar la persona seleccionada.']);
            return;
        }

        startTransition(async () => {
            const result = await onSubmit({
                personId,
                role: role.trim() ? role.trim() : null,
                ownershipPercentage: parsedOwnership,
                notes: notes.trim() ? notes.trim() : null,
            });

            if (!result.success) {
                setErrors([result.error ?? 'No se pudo guardar la información del socio.']);
                return;
            }

            setSelectedPerson(null);
            setRole('');
            setOwnership('');
            setNotes('');
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
            showCloseButton
            closeButtonText="Cancelar"
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
                    <AutoComplete<PersonOption>
                        label="Persona"
                        value={selectedPerson}
                        options={personOptions}
                        placeholder={isSearchingPersons ? 'Buscando…' : 'Busca por nombre o RUT'}
                        onInputChange={handlePersonSearch}
                        onChange={(option) => setSelectedPerson(option)}
                        getOptionLabel={(option) => option.label}
                        getOptionValue={(option) => option.id}
                        required
                        disabled={isPending}
                    />
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
