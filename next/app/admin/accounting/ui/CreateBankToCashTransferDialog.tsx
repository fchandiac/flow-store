'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Dialog from '@/baseComponents/Dialog/Dialog';
import { Button } from '@/baseComponents/Button/Button';
import Select, { type Option as SelectOption } from '@/baseComponents/Select/Select';
import { TextField } from '@/baseComponents/TextField/TextField';
import Alert from '@/baseComponents/Alert/Alert';
import { useAlert } from '@/globalstate/alert/useAlert';
import { createBankToCashTransfer } from '@/actions/bankTransfers';

interface CreateBankToCashTransferDialogProps {
    open: boolean;
    onClose: () => void;
    onCreated: () => void | Promise<void>;
    bankAccountOptions: SelectOption[];
}

interface FormState {
    bankAccountKey: string | null;
    amount: string;
    occurredOn: string;
    notes: string;
}

const todayIso = (): string => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export default function CreateBankToCashTransferDialog({
    open,
    onClose,
    onCreated,
    bankAccountOptions,
}: CreateBankToCashTransferDialogProps) {
    const { success, error } = useAlert();
    const [formState, setFormState] = useState<FormState>({
        bankAccountKey: null,
        amount: '',
        occurredOn: todayIso(),
        notes: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    const hasBankAccounts = bankAccountOptions.length > 0;

    useEffect(() => {
        if (!open) {
            return;
        }
        setValidationErrors([]);
        setFormState({
            bankAccountKey: bankAccountOptions.length === 1 ? String(bankAccountOptions[0].id) : null,
            amount: '',
            occurredOn: todayIso(),
            notes: '',
        });
    }, [open, bankAccountOptions]);

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
        if (!formState.bankAccountKey) {
            messages.push('Selecciona la cuenta bancaria de origen.');
        }
        if (!formState.amount || Number(formState.amount) <= 0) {
            messages.push('Ingresa el monto a transferir (mayor a cero).');
        }
        if (!formState.occurredOn) {
            messages.push('Indica la fecha en que se registró la transferencia.');
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
            const result = await createBankToCashTransfer({
                bankAccountKey: formState.bankAccountKey!,
                amount: Number(formState.amount),
                occurredOn: formState.occurredOn,
                notes: formState.notes.trim() || undefined,
            });

            if (!result.success) {
                throw new Error(result.error);
            }

            success('Transferencia a caja registrada correctamente.');
            await onCreated();
            onClose();
        } catch (submitError) {
            const message = submitError instanceof Error ? submitError.message : 'No se pudo registrar la transferencia a caja.';
            error(message);
            setValidationErrors([message]);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} title="Transferir de banco a caja" size="lg" showCloseButton>
            <form className="space-y-6" onSubmit={handleSubmit}>
                <Alert variant="info">
                    Registra un retiro desde la cuenta bancaria hacia Caja General.
                </Alert>

                {!hasBankAccounts && (
                    <Alert variant="warning">
                        La empresa no tiene cuentas bancarias registradas. Configura una cuenta en Configuración &gt; Empresa para registrar transferencias.
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
                        label="Cuenta bancaria origen"
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
                        disabled={!hasBankAccounts}
                    />
                    <TextField
                        label="Monto a transferir"
                        type="currency"
                        currencySymbol="$"
                        value={formState.amount}
                        onChange={(event) =>
                            setFormState((prev) => ({
                                ...prev,
                                amount: event.target.value,
                            }))
                        }
                        required
                        disabled={!hasBankAccounts}
                    />
                    <TextField
                        label="Fecha de la transferencia"
                        type="date"
                        value={formState.occurredOn}
                        onChange={(event) =>
                            setFormState((prev) => ({
                                ...prev,
                                occurredOn: event.target.value,
                            }))
                        }
                        required
                        disabled={!hasBankAccounts}
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
                    placeholder="Referencia de retiro, folio bancario u otros detalles"
                    disabled={!hasBankAccounts}
                />

                <div className="flex justify-end gap-3">
                    <Button type="button" variant="secondary" onClick={handleClose} disabled={submitting}>
                        Cancelar
                    </Button>
                    <Button type="submit" loading={submitting} disabled={!hasBankAccounts || submitting}>
                        Registrar transferencia
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
