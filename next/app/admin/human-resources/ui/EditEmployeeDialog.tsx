'use client';

import { useEffect, useMemo, useState } from 'react';
import Dialog from '@/baseComponents/Dialog/Dialog';
import Select, { type Option as SelectOption } from '@/baseComponents/Select/Select';
import { TextField } from '@/baseComponents/TextField/TextField';
import { Button } from '@/baseComponents/Button/Button';
import Alert from '@/baseComponents/Alert/Alert';
import { useAlert } from '@/globalstate/alert/useAlert';
import { updateEmployee } from '@/actions/employees';
import { updatePerson } from '@/actions/persons';
import type { EmployeeListItem } from '@/actions/employees';
import type { CostCenterSummary } from '@/actions/costCenters';
import type { OrganizationalUnitSummary } from '@/actions/organizationalUnits';
import { DocumentType } from '@/data/entities/Person';
import { EmployeeStatus, EmploymentType } from '@/data/entities/Employee';

interface EditEmployeeDialogProps {
    open: boolean;
    employee: EmployeeListItem | null;
    onClose: () => void;
    onSuccess?: () => void;
    costCenters: CostCenterSummary[];
    organizationalUnits: OrganizationalUnitSummary[];
}

interface PersonFormState {
    firstName: string;
    lastName: string;
    documentNumber: string;
    documentType: DocumentType;
    email: string;
    phone: string;
}

interface EmployeeFormState {
    organizationalUnitId: string | null;
    costCenterId: string | null;
    employmentType: EmploymentType;
    status: EmployeeStatus;
    hireDate: string;
    terminationDate: string;
    baseSalary: string;
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

const baseDocumentTypeOptions: SelectOption[] = [
    { id: DocumentType.RUN, label: 'RUN' },
    { id: DocumentType.PASSPORT, label: 'Pasaporte' },
    { id: DocumentType.OTHER, label: 'Otro' },
];

const sanitizeNumericInput = (value: string): string => value.replace(/[^0-9]/g, '');

const buildInitialPersonForm = (employee: EmployeeListItem | null): PersonFormState => {
    if (!employee) {
        return {
            firstName: '',
            lastName: '',
            documentNumber: '',
            documentType: DocumentType.RUN,
            email: '',
            phone: '',
        };
    }

    const normalizedDocumentType = employee.person.documentType ?? DocumentType.RUN;

    return {
        firstName: employee.person.firstName ?? '',
        lastName: employee.person.lastName ?? '',
        documentNumber: employee.person.documentNumber ?? '',
        documentType: normalizedDocumentType,
        email: employee.person.email ?? '',
        phone: employee.person.phone ?? '',
    };
};

const buildInitialEmployeeForm = (
    employee: EmployeeListItem | null,
    costCenters: CostCenterSummary[],
): EmployeeFormState => {
    if (!employee) {
        return {
            organizationalUnitId: null,
            costCenterId: costCenters[0]?.id ?? null,
            employmentType: EmploymentType.FULL_TIME,
            status: EmployeeStatus.ACTIVE,
            hireDate: new Date().toISOString().slice(0, 10),
            terminationDate: '',
            baseSalary: '',
        };
    }

    return {
        organizationalUnitId: employee.organizationalUnit?.id ?? null,
        costCenterId: employee.costCenter?.id ?? null,
        employmentType: employee.employmentType,
        status: employee.status,
        hireDate: employee.hireDate ?? new Date().toISOString().slice(0, 10),
        terminationDate: employee.terminationDate ?? '',
        baseSalary: employee.baseSalary != null ? String(Math.round(employee.baseSalary)) : '',
    };
};

export default function EditEmployeeDialog({
    open,
    employee,
    onClose,
    onSuccess,
    costCenters,
    organizationalUnits,
}: EditEmployeeDialogProps) {
    const { success, error } = useAlert();
    const [personForm, setPersonForm] = useState<PersonFormState>(() => buildInitialPersonForm(employee));
    const [employeeForm, setEmployeeForm] = useState<EmployeeFormState>(() => buildInitialEmployeeForm(employee, costCenters));
    const [errors, setErrors] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            setErrors([]);
            setIsSubmitting(false);
            setPersonForm(buildInitialPersonForm(employee));
            setEmployeeForm(buildInitialEmployeeForm(employee, costCenters));
        }
    }, [open, employee, costCenters]);

    const costCenterOptions = useMemo<SelectOption[]>(
        () => costCenters.map((center) => ({ id: center.id, label: `${center.name} (${center.code})` })),
        [costCenters],
    );

    const organizationalUnitOptions = useMemo<SelectOption[]>(
        () => organizationalUnits.map((unit) => ({ id: unit.id, label: `${unit.name} (${unit.code})` })),
        [organizationalUnits],
    );

    const documentTypeOptions = useMemo(() => {
        const options = [...baseDocumentTypeOptions];
        if (
            (employee?.person.documentType === DocumentType.RUT || personForm.documentType === DocumentType.RUT) &&
            !options.some((option) => option.id === DocumentType.RUT)
        ) {
            options.push({ id: DocumentType.RUT, label: 'RUT' });
        }
        return options;
    }, [employee, personForm.documentType]);

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

    const handleEmployeeFieldChange = (field: keyof EmployeeFormState, value: string | null) => {
        setEmployeeForm((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleStatusChange = (id: string | number | null) => {
        if (!id) {
            return;
        }
        const status = id as EmployeeStatus;
        setEmployeeForm((prev) => ({
            ...prev,
            status,
            terminationDate: status === EmployeeStatus.TERMINATED ? prev.terminationDate : '',
        }));
    };

    const handleEmploymentTypeChange = (id: string | number | null) => {
        if (!id) {
            return;
        }
        setEmployeeForm((prev) => ({
            ...prev,
            employmentType: id as EmploymentType,
        }));
    };

    const handleDocumentTypeChange = (id: string | number | null) => {
        if (!id) {
            return;
        }
        setPersonForm((prev) => ({
            ...prev,
            documentType: id as DocumentType,
        }));
    };

    const validateForm = (): string[] => {
        const messages: string[] = [];
        if (!employee) {
            messages.push('No hay un empleado seleccionado para editar.');
        }
        if (!personForm.firstName.trim()) {
            messages.push('El nombre es obligatorio.');
        }
        if (!personForm.lastName.trim()) {
            messages.push('El apellido es obligatorio.');
        }
        if (!employeeForm.hireDate) {
            messages.push('La fecha de ingreso es obligatoria.');
        }
        if (employeeForm.status === EmployeeStatus.TERMINATED && !employeeForm.terminationDate) {
            messages.push('Los empleados terminados requieren fecha de término.');
        }
        return messages;
    };

    const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
        event.preventDefault();
        if (isSubmitting) {
            return;
        }

        const validationErrors = validateForm();
        if (validationErrors.length > 0) {
            setErrors(validationErrors);
            return;
        }

        if (!employee) {
            return;
        }

        setIsSubmitting(true);
        setErrors([]);

        try {
            const trimmedFirstName = personForm.firstName.trim();
            const trimmedLastName = personForm.lastName.trim();
            const trimmedDocumentNumber = personForm.documentNumber.trim();
            const trimmedEmail = personForm.email.trim();
            const trimmedPhone = personForm.phone.trim();

            const personResult = await updatePerson(employee.person.id, {
                firstName: trimmedFirstName,
                lastName: trimmedLastName,
                documentType: personForm.documentType,
                documentNumber: trimmedDocumentNumber || undefined,
                email: trimmedEmail,
                phone: trimmedPhone,
            });

            if (!personResult.success) {
                throw new Error(personResult.error ?? 'No se pudo actualizar la ficha de la persona.');
            }

            const baseSalaryNumber = employeeForm.baseSalary ? Number(employeeForm.baseSalary) : null;
            if (baseSalaryNumber != null && (!Number.isFinite(baseSalaryNumber) || baseSalaryNumber < 0)) {
                throw new Error('El salario base debe ser un número positivo.');
            }

            const employeeResult = await updateEmployee(employee.id, {
                organizationalUnitId: employeeForm.organizationalUnitId ?? null,
                costCenterId: employeeForm.costCenterId ?? null,
                employmentType: employeeForm.employmentType,
                status: employeeForm.status,
                hireDate: employeeForm.hireDate,
                terminationDate: employeeForm.terminationDate || null,
                baseSalary: baseSalaryNumber,
            });

            if (!employeeResult.success) {
                throw new Error(employeeResult.error ?? 'No se pudo actualizar el registro del empleado.');
            }

            success('Empleado actualizado correctamente.');
            onSuccess?.();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Ocurrió un error al actualizar el empleado.';
            setErrors([message]);
            error(message);
            setIsSubmitting(false);
            return;
        }

        setIsSubmitting(false);
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
            title="Editar empleado"
            size="lg"
            showCloseButton
            closeButtonText="Cerrar"
        >
            {employee ? (
                <form className="space-y-6" onSubmit={handleSubmit}>
                    <section className="space-y-4">
                        <h3 className="text-lg font-semibold">Datos personales</h3>
                        <div className="grid gap-4 md:grid-cols-2">
                            <TextField
                                label="Nombre"
                                value={personForm.firstName}
                                onChange={(event) =>
                                    setPersonForm((prev) => ({
                                        ...prev,
                                        firstName: event.target.value,
                                    }))
                                }
                                required
                            />
                            <TextField
                                label="Apellido"
                                value={personForm.lastName}
                                onChange={(event) =>
                                    setPersonForm((prev) => ({
                                        ...prev,
                                        lastName: event.target.value,
                                    }))
                                }
                                required
                            />
                            <Select
                                label="Tipo de documento"
                                options={documentTypeOptions}
                                value={personForm.documentType}
                                onChange={handleDocumentTypeChange}
                            />
                            <TextField
                                label={documentNumberLabel}
                                value={personForm.documentNumber}
                                onChange={(event) =>
                                    setPersonForm((prev) => ({
                                        ...prev,
                                        documentNumber: event.target.value,
                                    }))
                                }
                                placeholder="Ej: 12345678-9"
                            />
                            <TextField
                                label="Correo electrónico"
                                value={personForm.email}
                                onChange={(event) =>
                                    setPersonForm((prev) => ({
                                        ...prev,
                                        email: event.target.value,
                                    }))
                                }
                                type="email"
                                placeholder="correo@empresa.cl"
                            />
                            <TextField
                                label="Teléfono"
                                value={personForm.phone}
                                onChange={(event) =>
                                    setPersonForm((prev) => ({
                                        ...prev,
                                        phone: event.target.value,
                                    }))
                                }
                                placeholder="Ej: 987654321"
                            />
                        </div>
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
                                onChange={(event) =>
                                    handleEmployeeFieldChange('baseSalary', sanitizeNumericInput(event.target.value))
                                }
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
                            Guardar cambios
                        </Button>
                    </div>
                </form>
            ) : (
                <div className="space-y-4">
                    <Alert variant="info">Selecciona un empleado para editar sus datos.</Alert>
                    <div className="flex justify-end">
                        <Button type="button" variant="secondary" onClick={handleClose}>
                            Cerrar
                        </Button>
                    </div>
                </div>
            )}
        </Dialog>
    );
}
