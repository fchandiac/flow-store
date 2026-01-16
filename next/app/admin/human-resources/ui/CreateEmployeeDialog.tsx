'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import Dialog from '@/baseComponents/Dialog/Dialog';
import AutoComplete, { type Option as AutoCompleteOption } from '@/baseComponents/AutoComplete/AutoComplete';
import Select, { type Option as SelectOption } from '@/baseComponents/Select/Select';
import { TextField } from '@/baseComponents/TextField/TextField';
import { Button } from '@/baseComponents/Button/Button';
import Alert from '@/baseComponents/Alert/Alert';
import { useAlert } from '@/globalstate/alert/useAlert';
import { createEmployee } from '@/actions/employees';
import { createPerson, searchPersons, type PersonPlainObject } from '@/actions/persons';
import type { CostCenterSummary } from '@/actions/costCenters';
import type { OrganizationalUnitSummary } from '@/actions/organizationalUnits';
import { DocumentType, PersonType } from '@/data/entities/Person';
import { EmployeeStatus, EmploymentType } from '@/data/entities/Employee';

type PersonSearchResult = Awaited<ReturnType<typeof searchPersons>>[number];

type PersonOption = AutoCompleteOption & {
    person?: PersonSearchResult | PersonPlainObject;
};

interface EmployeeFormState {
    organizationalUnitId: string | null;
    costCenterId: string | null;
    employmentType: EmploymentType;
    status: EmployeeStatus;
    hireDate: string;
    terminationDate: string;
    baseSalary: string;
}

interface PersonFormState {
    firstName: string;
    lastName: string;
    documentNumber: string;
    documentType: DocumentType;
    email: string;
    phone: string;
}

interface CreateEmployeeDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => Promise<void> | void;
    costCenters: CostCenterSummary[];
    organizationalUnits: OrganizationalUnitSummary[];
}

const employmentTypeOptions: SelectOption[] = [
    { id: EmploymentType.FULL_TIME, label: 'Tiempo completo' },
    { id: EmploymentType.PART_TIME, label: 'Medio tiempo' },
    { id: EmploymentType.CONTRACTOR, label: 'Contratista' },
    { id: EmploymentType.TEMPORARY, label: 'Temporal' },
    { id: EmploymentType.INTERN, label: 'Práctica / Interno' },
];

const statusOptions: SelectOption[] = [
    { id: EmployeeStatus.ACTIVE, label: 'Activo' },
    { id: EmployeeStatus.SUSPENDED, label: 'Suspendido' },
    { id: EmployeeStatus.TERMINATED, label: 'Terminado' },
];

const documentTypeOptions: SelectOption[] = [
    { id: DocumentType.RUN, label: 'RUN' },
    { id: DocumentType.PASSPORT, label: 'Pasaporte' },
    { id: DocumentType.OTHER, label: 'Otro' },
];

const createInitialPersonForm = (): PersonFormState => ({
    firstName: '',
    lastName: '',
    documentNumber: '',
    documentType: DocumentType.RUN,
    email: '',
    phone: '',
});

const buildPersonLabel = (person: PersonSearchResult | PersonPlainObject): string => {
    const fullName = [person.firstName, person.lastName].filter(Boolean).join(' ').trim();
    const baseName = fullName || person.businessName || 'Sin nombre';
    const document = person.documentNumber ? `${person.documentType ?? ''} ${person.documentNumber}`.trim() : 'Sin documento';
    return `${baseName} · ${document}`;
};

const sanitizeNumericInput = (value: string): string => value.replace(/[^0-9]/g, '');

const todayISO = (): string => new Date().toISOString().slice(0, 10);

export default function CreateEmployeeDialog({
    open,
    onClose,
    onSuccess,
    costCenters,
    organizationalUnits,
}: CreateEmployeeDialogProps) {
    const { success, error } = useAlert();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);
    const [personOptions, setPersonOptions] = useState<PersonOption[]>([]);
    const [selectedPerson, setSelectedPerson] = useState<PersonOption | null>(null);
    const [personForm, setPersonForm] = useState<PersonFormState>(createInitialPersonForm);
    const [isCreatingPerson, setIsCreatingPerson] = useState(false);
    const [personSearchTerm, setPersonSearchTerm] = useState('');
    const [isSearchingPersons, setIsSearchingPersons] = useState(false);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [employeeForm, setEmployeeForm] = useState<EmployeeFormState>(() => ({
        organizationalUnitId: null,
        costCenterId: costCenters[0]?.id ?? null,
        employmentType: EmploymentType.FULL_TIME,
        status: EmployeeStatus.ACTIVE,
        hireDate: todayISO(),
        terminationDate: '',
        baseSalary: '',
    }));

    useEffect(() => {
        if (!open) {
            return;
        }

        setErrors([]);
        setSelectedPerson(null);
        setPersonForm(createInitialPersonForm);
        setIsCreatingPerson(false);
        setPersonSearchTerm('');
        setPersonOptions([]);
        setEmployeeForm({
            organizationalUnitId: null,
            costCenterId: costCenters[0]?.id ?? null,
            employmentType: EmploymentType.FULL_TIME,
            status: EmployeeStatus.ACTIVE,
            hireDate: todayISO(),
            terminationDate: '',
            baseSalary: '',
        });
    }, [open, costCenters, organizationalUnits]);

    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, []);

    const costCenterOptions = useMemo<SelectOption[]>(
        () => costCenters.map((center) => ({ id: center.id, label: `${center.name} (${center.code})` })),
        [costCenters],
    );

    const organizationalUnitOptions = useMemo<SelectOption[]>(
        () =>
            organizationalUnits.map((unit) => ({
                id: unit.id,
                label: `${unit.name} (${unit.code})`,
            })),
        [organizationalUnits],
    );

    const documentNumberLabel = useMemo(() => {
        switch (personForm.documentType) {
            case DocumentType.RUN:
                return 'RUN';
            case DocumentType.PASSPORT:
                return 'Pasaporte';
            default:
                return 'Número de documento';
        }
    }, [personForm.documentType]);

    const documentNumberInputType = useMemo(() => {
        return personForm.documentType === DocumentType.RUN ? 'dni' : 'text';
    }, [personForm.documentType]);

    const handleEmployeeFieldChange = useCallback(
        (field: keyof EmployeeFormState, value: string | null) => {
            setEmployeeForm((prev) => ({
                ...prev,
                [field]: value,
            }));
        },
        [],
    );

    const handleStatusChange = useCallback(
        (id: string | number | null) => {
            if (!id) {
                return;
            }
            const status = id as EmployeeStatus;
            setEmployeeForm((prev) => ({
                ...prev,
                status,
                terminationDate: status === EmployeeStatus.TERMINATED ? prev.terminationDate : '',
            }));
        },
        [],
    );

    const handleEmploymentTypeChange = useCallback(
        (id: string | number | null) => {
            if (!id) {
                return;
            }
            setEmployeeForm((prev) => ({
                ...prev,
                employmentType: id as EmploymentType,
            }));
        },
        [],
    );

    const handlePersonInputChange = useCallback((value: string) => {
        setPersonSearchTerm(value);
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (!value.trim()) {
            setPersonOptions([]);
            return;
        }

        searchTimeoutRef.current = setTimeout(async () => {
            setIsSearchingPersons(true);
            try {
                const results = await searchPersons({ term: value, limit: 12, type: PersonType.NATURAL });
                setPersonOptions(results.map((person) => ({ id: person.id, label: buildPersonLabel(person), person })));
            } catch (err) {
                console.error('No se pudieron buscar personas:', err);
            } finally {
                setIsSearchingPersons(false);
            }
        }, 300);
    }, []);

    const handlePersonSelection = useCallback((option: PersonOption | null) => {
        setSelectedPerson(option);
        setIsCreatingPerson(false);
        setErrors((prev) => prev.filter((message) => !message.includes('persona')));
    }, []);

    const handlePersonFieldChange = useCallback((field: keyof PersonFormState, value: string) => {
        setPersonForm((prev) => ({
            ...prev,
            [field]: value,
        }));
    }, []);

    const validatePersonForm = (): string[] => {
        const nextErrors: string[] = [];
        if (!personForm.firstName.trim()) {
            nextErrors.push('El nombre de la persona es obligatorio.');
        }
        if (!personForm.lastName.trim()) {
            nextErrors.push('El apellido es obligatorio.');
        }
        return nextErrors;
    };

    const validateEmployeeForm = (): string[] => {
        const messages: string[] = [];
        if (!isCreatingPerson && !selectedPerson?.person) {
            messages.push('Selecciona una persona existente o crea una nueva ficha.');
        }
        if (!employeeForm.hireDate) {
            messages.push('La fecha de ingreso es obligatoria.');
        }
        if (employeeForm.status === EmployeeStatus.TERMINATED && !employeeForm.terminationDate) {
            messages.push('Los empleados terminados requieren fecha de término.');
        }
        return messages;
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isSubmitting) {
            return;
        }

        let validationErrors = validateEmployeeForm();
        if (isCreatingPerson) {
            validationErrors = [...validationErrors, ...validatePersonForm()];
        }

        if (validationErrors.length > 0) {
            setErrors(validationErrors);
            return;
        }

        setIsSubmitting(true);
        setErrors([]);

        try {
            let personId = selectedPerson?.person?.id ?? null;

            if (isCreatingPerson) {
                const personResult = await createPerson({
                    type: PersonType.NATURAL,
                    firstName: personForm.firstName.trim(),
                    lastName: personForm.lastName.trim(),
                    businessName: undefined,
                    documentType: personForm.documentType,
                    documentNumber: personForm.documentNumber.trim() || undefined,
                    email: personForm.email.trim() || undefined,
                    phone: personForm.phone.trim() || undefined,
                    address: undefined,
                });

                if (!personResult.success || !personResult.person) {
                    throw new Error(personResult.error ?? 'No se pudo crear la persona.');
                }

                personId = personResult.person.id;
                setSelectedPerson({ id: personResult.person.id, label: buildPersonLabel(personResult.person), person: personResult.person });
            }

            if (!personId) {
                throw new Error('No se pudo determinar la persona asociada al empleado.');
            }

            const baseSalaryNumber = employeeForm.baseSalary ? Number(employeeForm.baseSalary) : undefined;
            if (baseSalaryNumber !== undefined && (!Number.isFinite(baseSalaryNumber) || baseSalaryNumber < 0)) {
                throw new Error('El salario base debe ser un número positivo.');
            }

            const result = await createEmployee({
                personId,
                organizationalUnitId: employeeForm.organizationalUnitId ?? undefined,
                costCenterId: employeeForm.costCenterId ?? undefined,
                employmentType: employeeForm.employmentType,
                status: employeeForm.status,
                hireDate: employeeForm.hireDate,
                terminationDate: employeeForm.terminationDate || undefined,
                baseSalary: baseSalaryNumber,
            });

            if (!result.success) {
                throw new Error(result.error ?? 'No se pudo crear el empleado.');
            }

            success('Empleado creado correctamente.');
            if (onSuccess) {
                await onSuccess();
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Ocurrió un error al crear el empleado.';
            setErrors([message]);
            error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (isSubmitting) {
            return;
        }
        onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            title="Registrar empleado"
            size="lg"
            showCloseButton
            closeButtonText="Cerrar"
        >
            <form className="space-y-6" onSubmit={handleSubmit}>
                <section className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                        <h3 className="text-lg font-semibold">Persona vinculada</h3>
                        <Button
                            type="button"
                            variant="text"
                            onClick={() => {
                                setIsCreatingPerson((prev) => !prev);
                                setSelectedPerson(null);
                                setErrors([]);
                            }}
                        >
                            {isCreatingPerson ? 'Buscar persona existente' : 'Crear nueva persona'}
                        </Button>
                    </div>

                    {!isCreatingPerson && (
                        <AutoComplete<PersonOption>
                            label="Persona"
                            options={personOptions}
                            value={selectedPerson}
                            onChange={handlePersonSelection}
                            onInputChange={handlePersonInputChange}
                            placeholder="Busca por nombre o documento"
                            required
                            disabled={isSubmitting}
                        />
                    )}

                    {isCreatingPerson && (
                        <div className="grid gap-4 md:grid-cols-2">
                            <TextField
                                label="Nombre"
                                value={personForm.firstName}
                                onChange={(event) => handlePersonFieldChange('firstName', event.target.value)}
                                required
                            />
                            <TextField
                                label="Apellido"
                                value={personForm.lastName}
                                onChange={(event) => handlePersonFieldChange('lastName', event.target.value)}
                                required
                            />
                            <Select
                                label="Tipo de documento"
                                options={documentTypeOptions}
                                value={personForm.documentType}
                                onChange={(id) => handlePersonFieldChange('documentType', id as DocumentType)}
                            />
                            <TextField
                                label={documentNumberLabel}
                                type={documentNumberInputType}
                                value={personForm.documentNumber}
                                onChange={(event) => handlePersonFieldChange('documentNumber', event.target.value)}
                                placeholder="Ej: 12.345.678-9"
                            />
                            <TextField
                                label="Correo electrónico"
                                value={personForm.email}
                                onChange={(event) => handlePersonFieldChange('email', event.target.value)}
                                type="email"
                                placeholder="correo@dominio.cl"
                            />
                            <TextField
                                label="Teléfono"
                                value={personForm.phone}
                                onChange={(event) => handlePersonFieldChange('phone', sanitizeNumericInput(event.target.value))}
                                placeholder="Ej: 987654321"
                            />
                        </div>
                    )}
                </section>

                <section className="space-y-4">
                    <h3 className="text-lg font-semibold">Detalles del contrato</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                        <Select
                            label="Unidad organizativa"
                            options={organizationalUnitOptions}
                            value={employeeForm.organizationalUnitId}
                            onChange={(id) =>
                                handleEmployeeFieldChange(
                                    'organizationalUnitId',
                                    typeof id === 'string' ? id : id != null ? String(id) : null,
                                )
                            }
                            allowClear
                            disabled={organizationalUnitOptions.length === 0}
                        />
                        <Select
                            label="Centro de costos"
                            options={costCenterOptions}
                            value={employeeForm.costCenterId}
                            onChange={(id) =>
                                handleEmployeeFieldChange(
                                    'costCenterId',
                                    typeof id === 'string' ? id : id != null ? String(id) : null,
                                )
                            }
                            allowClear
                            disabled={costCenterOptions.length === 0}
                        />
                        <Select
                            label="Tipo de contrato"
                            options={employmentTypeOptions}
                            value={employeeForm.employmentType}
                            onChange={handleEmploymentTypeChange}
                            required
                        />
                        <Select
                            label="Estado"
                            options={statusOptions}
                            value={employeeForm.status}
                            onChange={handleStatusChange}
                            required
                        />
                        <TextField
                            label="Fecha de ingreso"
                            type="date"
                            value={employeeForm.hireDate}
                            onChange={(event) => handleEmployeeFieldChange('hireDate', event.target.value)}
                            required
                        />
                        <TextField
                            label="Fecha de término"
                            type="date"
                            value={employeeForm.terminationDate}
                            onChange={(event) => handleEmployeeFieldChange('terminationDate', event.target.value)}
                            disabled={employeeForm.status !== EmployeeStatus.TERMINATED}
                        />
                        <TextField
                            label="Salario base (CLP)"
                            type="number"
                            value={employeeForm.baseSalary}
                            onChange={(event) => handleEmployeeFieldChange('baseSalary', sanitizeNumericInput(event.target.value))}
                            min={0}
                            step={1}
                            placeholder="Ej: 850000"
                        />
                    </div>
                </section>

                {errors.length > 0 && (
                    <Alert variant="error">
                        <ul className="list-disc pl-5 text-sm">
                            {errors.map((message) => (
                                <li key={message}>{message}</li>
                            ))}
                        </ul>
                    </Alert>
                )}

                <div className="flex justify-end gap-3">
                    <Button type="button" variant="secondary" onClick={handleClose} disabled={isSubmitting}>
                        Cancelar
                    </Button>
                    <Button type="submit" loading={isSubmitting}>
                        Registrar empleado
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
