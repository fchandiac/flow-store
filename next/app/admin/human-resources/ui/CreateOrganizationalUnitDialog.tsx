'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import Dialog from '@/baseComponents/Dialog/Dialog';
import { TextField } from '@/baseComponents/TextField/TextField';
import Select, { type Option as SelectOption } from '@/baseComponents/Select/Select';
import { Button } from '@/baseComponents/Button/Button';
import Alert from '@/baseComponents/Alert/Alert';
import { useAlert } from '@/globalstate/alert/useAlert';
import { createOrganizationalUnit } from '@/actions/organizationalUnits';

interface BranchOption {
    id: string;
    name: string;
    isHeadquarters: boolean;
}

interface CreateOrganizationalUnitDialogProps {
    open: boolean;
    onClose: () => void;
    branches: BranchOption[];
    onSuccess?: () => Promise<void> | void;
}

interface OrganizationalUnitFormState {
    name: string;
    description: string;
    branchId: string | null;
}

const createInitialForm = (): OrganizationalUnitFormState => ({
    name: '',
    description: '',
    branchId: null,
});

export default function CreateOrganizationalUnitDialog({ open, onClose, branches, onSuccess }: CreateOrganizationalUnitDialogProps) {
    const { success, error } = useAlert();
    const [formState, setFormState] = useState<OrganizationalUnitFormState>(createInitialForm);
    const [errors, setErrors] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!open) {
            return;
        }
        setFormState(createInitialForm());
        setErrors([]);
    }, [open]);

    const branchOptions = useMemo<SelectOption[]>(
        () => branches.map((branch) => ({ id: branch.id, label: branch.name })),
        [branches],
    );

    const handleFieldChange = useCallback(<K extends keyof OrganizationalUnitFormState>(field: K, value: OrganizationalUnitFormState[K]) => {
        setFormState((prev) => ({
            ...prev,
            [field]: value,
        }));
    }, []);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isSubmitting) {
            return;
        }

        const trimmedName = formState.name.trim();
        const trimmedDescription = formState.description.trim();
        const validationErrors: string[] = [];

        if (!trimmedName) {
            validationErrors.push('El nombre es obligatorio.');
        }

        if (validationErrors.length > 0) {
            setErrors(validationErrors);
            return;
        }

        setIsSubmitting(true);
        setErrors([]);

        try {
            const result = await createOrganizationalUnit({
                name: trimmedName,
                description: trimmedDescription || undefined,
                branchId: formState.branchId || undefined,
            });

            if (!result.success) {
                throw new Error(result.error ?? 'No se pudo crear la unidad organizativa.');
            }

            success('Unidad organizativa creada correctamente.');
            if (onSuccess) {
                await onSuccess();
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Ocurrió un error al crear la unidad organizativa.';
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
            title="Crear unidad organizativa"
            size="md"
            showCloseButton
            closeButtonText="Cerrar"
        >
            <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="grid gap-4">
                    <TextField
                        label="Nombre"
                        value={formState.name}
                        onChange={(event) => handleFieldChange('name', event.target.value)}
                        required
                    />
                    <TextField
                        label="Descripción"
                        type="textarea"
                        rows={4}
                        value={formState.description}
                        onChange={(event) => handleFieldChange('description', event.target.value)}
                        placeholder="Describe brevemente la unidad"
                    />
                    <Select
                        label="Sucursal (opcional)"
                        options={branchOptions}
                        value={formState.branchId}
                        onChange={(id) => handleFieldChange('branchId', typeof id === 'string' ? id : id != null ? String(id) : null)}
                        allowClear
                        disabled={branchOptions.length === 0}
                    />
                </div>

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
                        Crear unidad
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
