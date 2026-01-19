'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Dialog from '@/baseComponents/Dialog/Dialog';
import { Button } from '@/baseComponents/Button/Button';
import Select, { type Option as SelectOption } from '@/baseComponents/Select/Select';
import { TextField } from '@/baseComponents/TextField/TextField';
import Alert from '@/baseComponents/Alert/Alert';
import { useAlert } from '@/globalstate/alert/useAlert';
import { createCapitalContribution } from '@/actions/capitalContributions';

interface CreateCapitalContributionDialogProps {
    open: boolean;
    onClose: () => void;
    onCreated: () => void | Promise<void>;
    shareholderOptions: SelectOption[];
    bankAccountOptions: SelectOption[];
}

interface FormState {
    shareholderId: string | null;
    bankAccountKey: string | null;
    amount: string;
    occurredOn: string;
    notes: string;
}

const todayIso = (): string => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export default function CreateCapitalContributionDialog({
    open,
    onClose,
    onCreated,
    shareholderOptions,
    bankAccountOptions,
}: CreateCapitalContributionDialogProps) {
    const { success, error } = useAlert();
    const [formState, setFormState] = useState<FormState>({
        shareholderId: null,
        bankAccountKey: null,
        amount: '',
        occurredOn: todayIso(),
        notes: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    const hasShareholders = shareholderOptions.length > 0;
    const hasBankAccounts = bankAccountOptions.length > 0;

    useEffect(() => {
        if (!open) {
            return;
        }

        setValidationErrors([]);
        setFormState({
            shareholderId: shareholderOptions.length === 1 ? String(shareholderOptions[0].id) : null,
            bankAccountKey: bankAccountOptions.length === 1 ? String(bankAccountOptions[0].id) : null,
            amount: '',
            occurredOn: todayIso(),
            notes: '',
        });
    }, [open, shareholderOptions, bankAccountOptions]);

    const normalizedShareholderOptions = useMemo<SelectOption[]>(
        () => shareholderOptions.map((option) => ({ id: String(option.id), label: option.label })),
        [shareholderOptions],
    );

    const normalizedBankAccountOptions = useMemo<SelectOption[]>(
        () => bankAccountOptions.map((option) => ({ id: String(option.id), label: option.label })),
        [bankAccountOptions],
    );

    const handleClose = () => {
        if (submitting) {
            return;
        }
        onClose();
    };

    const validateForm = (): string[] => {
        const messages: string[] = [];
        if (!formState.shareholderId) {
            messages.push('Selecciona el socio que realiza el aporte.');
        }
        if (!formState.bankAccountKey) {
            messages.push('Selecciona la cuenta bancaria de destino.');
        }
        if (!formState.amount || Number(formState.amount) <= 0) {
            messages.push('Ingresa el monto del aporte (mayor a cero).');
        }
        if (!formState.occurredOn) {
            messages.push('Indica la fecha en que se registró el aporte.');
        }
        return messages;
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (submitting) {
            return;
        }

        const errorsList = validateForm();
        if (errorsList.length > 0) {
            setValidationErrors(errorsList);
            return;
        }

        setSubmitting(true);
        setValidationErrors([]);

        try {
            const result = await createCapitalContribution({
                shareholderId: formState.shareholderId!,
                bankAccountKey: formState.bankAccountKey!,
                amount: Number(formState.amount),
                occurredOn: formState.occurredOn,
                notes: formState.notes.trim() || undefined,
            });

            if (!result.success) {
                throw new Error(result.error);
            }

            success('Aporte de capital registrado correctamente.');
            await onCreated();
            onClose();
        } catch (submitError) {
            const message = submitError instanceof Error ? submitError.message : 'No se pudo registrar el aporte de capital.';
            error(message);
            setValidationErrors([message]);
        } finally {
            setSubmitting(false);
        }
    };

    const isReady = hasShareholders && hasBankAccounts;

    return (
        <Dialog open={open} onClose={handleClose} title="Registrar aporte de capital" size="lg">
            <form className="space-y-6" onSubmit={handleSubmit}>
                {!hasShareholders && (
                    <Alert variant="warning">
                        No existen socios activos registrados en la compañía. Agrega socios en Configuración &gt; Empresa antes de registrar aportes.
                    </Alert>
                )}

                {!hasBankAccounts && (
                    <Alert variant="warning">
                        La empresa no tiene cuentas bancarias registradas. Configura al menos una cuenta en Configuración &gt; Empresa para recibir aportes.
                    </Alert>
                )}

                {validationErrors.length > 0 && (
                    <Alert variant="error">
                        <ul className="list-disc pl-5 text-sm">
                            {validationErrors.map((message) => (
                                <li key={message}>{message}</li>
                            ))}
                        </ul>
                    </Alert>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                    <Select
                        label="Socio"
                        options={normalizedShareholderOptions}
                        value={formState.shareholderId}
                        onChange={(value) =>
                            setFormState((prev) => ({
                                ...prev,
                                shareholderId: value ? String(value) : null,
                            }))
                        }
                        placeholder="Selecciona socio"
                        required
                        disabled={!isReady}
                    />
                    <Select
                        label="Cuenta bancaria"
                        options={normalizedBankAccountOptions}
                        value={formState.bankAccountKey}
                        onChange={(value) =>
                            setFormState((prev) => ({
                                ...prev,
                                bankAccountKey: value ? String(value) : null,
                            }))
                        }
                        placeholder="Selecciona cuenta"
                        required
                        disabled={!isReady}
                    />
                    <TextField
                        label="Monto"
                        type="currency"
                        value={formState.amount}
                        onChange={(event) =>
                            setFormState((prev) => ({
                                ...prev,
                                amount: event.target.value,
                            }))
                        }
                        required
                        disabled={!isReady}
                        inputMode="numeric"
                    />
                    <TextField
                        label="Fecha del aporte"
                        type="date"
                        value={formState.occurredOn}
                        onChange={(event) =>
                            setFormState((prev) => ({
                                ...prev,
                                occurredOn: event.target.value,
                            }))
                        }
                        required
                        disabled={!isReady}
                    />
                </div>

                <TextField
                    label="Notas (opcional)"
                    type="textarea"
                    value={formState.notes}
                    onChange={(event) =>
                        setFormState((prev) => ({
                            ...prev,
                            notes: event.target.value,
                        }))
                    }
                    rows={3}
                    placeholder="Observaciones internas, referencia de transferencia u otros detalles"
                    disabled={!isReady}
                />

                <div className="flex justify-end gap-3">
                    <Button type="button" variant="secondary" onClick={handleClose} disabled={submitting}>
                        Cancelar
                    </Button>
                    <Button type="submit" loading={submitting} disabled={!isReady || submitting}>
                        Registrar aporte
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
