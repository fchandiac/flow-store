'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Dialog from '@/baseComponents/Dialog/Dialog';
import { TextField } from '@/baseComponents/TextField/TextField';
import Select from '@/baseComponents/Select/Select';
import Alert from '@/baseComponents/Alert/Alert';
import { Button } from '@/baseComponents/Button/Button';
import type { CostCenterSummary } from '@/actions/costCenters';
import type { ExpenseCategoryOption } from '@/actions/expenseCategories';
import { createOperatingExpenseCategory } from '@/actions/expenseCategories';

interface OperatingExpenseCategoryDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: (category: ExpenseCategoryOption) => void;
    costCenters: CostCenterSummary[];
    groupNames?: string[];
}

interface FormState {
    name: string;
    description: string;
    groupSelection: string;
    customGroupName: string;
    examples: string;
    defaultCostCenterId: string | null;
}

const INITIAL_FORM_STATE: FormState = {
    name: '',
    description: '',
    groupSelection: '',
    customGroupName: '',
    examples: '',
    defaultCostCenterId: null,
};

const parseExamples = (input: string): string[] => {
    return input
        .split(/\r?\n|,/)
        .map((value) => value.trim())
        .filter((value) => value.length > 0);
};

export default function OperatingExpenseCategoryDialog({
    open,
    onClose,
    onSuccess,
    costCenters,
    groupNames = [],
}: OperatingExpenseCategoryDialogProps) {
    const [formState, setFormState] = useState<FormState>(INITIAL_FORM_STATE);
    const [errors, setErrors] = useState<string[]>([]);
    const [isPending, startTransition] = useTransition();

    const costCenterOptions = useMemo(() => {
        return costCenters.map((center) => ({ id: center.id, label: `${center.name} (${center.code})` }));
    }, [costCenters]);

    const groupOptions = useMemo(() => {
        const existing = groupNames.map((name) => ({ id: name, label: name }));
        return [
            { id: '', label: 'Sin agrupación' },
            ...existing,
            { id: '__custom', label: 'Crear nueva agrupación' },
        ];
    }, [groupNames]);

    const resetForm = () => {
        setFormState(INITIAL_FORM_STATE);
        setErrors([]);
    };

    useEffect(() => {
        if (!open) {
            resetForm();
        }
    }, [open]);

    const handleClose = () => {
        if (isPending) {
            return;
        }
        resetForm();
        onClose();
    };

    const handleSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
        event.preventDefault();

        const validationErrors: string[] = [];

        if (!formState.name.trim()) {
            validationErrors.push('El nombre de la categoría es obligatorio.');
        }

        if (formState.groupSelection === '__custom' && !formState.customGroupName.trim()) {
            validationErrors.push('Debes ingresar el nombre de la nueva agrupación.');
        }

        if (validationErrors.length > 0) {
            setErrors(validationErrors);
            return;
        }

        setErrors([]);

        const groupName = (() => {
            if (formState.groupSelection === '__custom') {
                return formState.customGroupName.trim();
            }
            const normalized = formState.groupSelection.trim();
            return normalized.length > 0 ? normalized : undefined;
        })();

        startTransition(async () => {
            const result = await createOperatingExpenseCategory({
                name: formState.name.trim(),
                description: formState.description.trim() || undefined,
                groupName,
                examples: parseExamples(formState.examples),
                defaultCostCenterId: formState.defaultCostCenterId,
            });

            if (!result.success || !result.category) {
                setErrors([result.error ?? 'No se pudo crear la categoría.']);
                return;
            }

            onSuccess?.(result.category);
            resetForm();
            onClose();
        });
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            showCloseButton
            closeButtonText="Cancelar"
            title="Nueva categoría de gasto"
            size="lg"
        >
            <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid gap-4 md:grid-cols-2">
                    <TextField
                        label="Nombre"
                        value={formState.name}
                        onChange={(event) =>
                            setFormState((prev) => ({
                                ...prev,
                                name: event.target.value,
                            }))
                        }
                        required
                    />
                    <Select
                        label="Agrupación"
                        options={groupOptions}
                        value={formState.groupSelection}
                        onChange={(value) => {
                            const id = typeof value === 'number' ? String(value) : value ?? '';
                            setFormState((prev) => ({
                                ...prev,
                                groupSelection: id,
                                customGroupName: id === '__custom' ? prev.customGroupName : '',
                            }));
                        }}
                        placeholder="Elige una agrupación"
                        allowClear
                    />
                    <Select
                        label="Centro de costos por defecto"
                        options={costCenterOptions}
                        value={formState.defaultCostCenterId}
                        onChange={(id) =>
                            setFormState((prev) => ({
                                ...prev,
                                defaultCostCenterId: typeof id === 'string' ? id : id != null ? String(id) : null,
                            }))
                        }
                        allowClear
                        placeholder="Sin centro de costos"
                    />
                </div>

                {formState.groupSelection === '__custom' && (
                    <TextField
                        label="Nueva agrupación"
                        value={formState.customGroupName}
                        onChange={(event) =>
                            setFormState((prev) => ({
                                ...prev,
                                customGroupName: event.target.value,
                            }))
                        }
                        placeholder="Ej. Servicios básicos"
                    />
                )}

                <TextField
                    label="Descripción"
                    value={formState.description}
                    onChange={(event) =>
                        setFormState((prev) => ({
                            ...prev,
                            description: event.target.value,
                        }))
                    }
                    rows={3}
                    type="textarea"
                    placeholder="Describe cómo se utiliza esta categoría"
                />

                <TextField
                    label="Ejemplos (separados por coma o salto de línea)"
                    value={formState.examples}
                    onChange={(event) =>
                        setFormState((prev) => ({
                            ...prev,
                            examples: event.target.value,
                        }))
                    }
                    rows={3}
                    type="textarea"
                    placeholder="Ej. Luz, Agua, Internet"
                />

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
                    <Button type="button" variant="secondary" onClick={handleClose} disabled={isPending}>
                        Cancelar
                    </Button>
                    <Button type="submit" loading={isPending}>
                        Crear categoría
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
