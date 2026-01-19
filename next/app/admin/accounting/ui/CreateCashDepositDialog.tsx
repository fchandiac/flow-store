'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Dialog from '@/baseComponents/Dialog/Dialog';
import { Button } from '@/baseComponents/Button/Button';
import Select, { type Option as SelectOption } from '@/baseComponents/Select/Select';
import { TextField } from '@/baseComponents/TextField/TextField';
import Alert from '@/baseComponents/Alert/Alert';
import { useAlert } from '@/globalstate/alert/useAlert';
import { createCashDeposit } from '@/actions/cashDeposits';

interface CreateCashDepositDialogProps {
    open: boolean;
    onClose: () => void;
    onCreated: () => void | Promise<void>;
    bankAccountOptions: SelectOption[];
    availableCash: number;
}

interface FormState {
    bankAccountKey: string | null;
    amount: string;
    occurredOn: string;
    notes: string;
}

const currencyFormatter = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
});

const todayIso = (): string => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export default function CreateCashDepositDialog({
    open,
    onClose,
    onCreated,
    bankAccountOptions,
    availableCash,
}: CreateCashDepositDialogProps) {
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
    const hasCashAvailable = availableCash > 0;

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
            messages.push('Selecciona la cuenta bancaria destino.');
        }
        const numericAmount = Number(formState.amount || 0);
        if (!numericAmount || numericAmount <= 0) {
            messages.push('Ingresa el monto a depositar (mayor a cero).');
        }
        if (numericAmount > availableCash) {
            messages.push('El monto excede el saldo disponible en Caja General.');
        }
        if (!formState.occurredOn) {
            messages.push('Indica la fecha en que se realizó el depósito.');
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
            const result = await createCashDeposit({
                bankAccountKey: formState.bankAccountKey!,
                amount: Number(formState.amount),
                occurredOn: formState.occurredOn,
                notes: formState.notes.trim() || undefined,
            });

            if (!result.success) {
                throw new Error(result.error);
            }

            success('Depósito en banco registrado correctamente.');
            await onCreated();
            onClose();
        } catch (submitError) {
            const message = submitError instanceof Error ? submitError.message : 'No se pudo registrar el depósito.';
            error(message);
            setValidationErrors([message]);
        } finally {
            setSubmitting(false);
        }
    };

    const infoMessage = hasCashAvailable
        ? `Saldo disponible en Caja General: ${currencyFormatter.format(availableCash)}`
        : 'No hay saldo disponible en Caja General para depositar.';

    return (
        <Dialog open={open} onClose={handleClose} title="Depositar efectivo en banco" size="lg" showCloseButton>
            <form className="space-y-6" onSubmit={handleSubmit}>
                <Alert variant="info">{infoMessage}</Alert>

                {!hasBankAccounts && (
                    <Alert variant="warning">
                        La empresa no tiene cuentas bancarias registradas. Configura una cuenta en Configuración &gt; Empresa para registrar depósitos.
                    </Alert>
                )}

                {!hasCashAvailable && (
                    <Alert variant="warning">
                        No hay saldo disponible en Caja General (1.1.01). Registra movimientos de entrada antes de realizar depósitos.
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
                        label="Cuenta bancaria destino"
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
                        disabled={!hasBankAccounts || !hasCashAvailable}
                    />
                    <TextField
                        label="Monto a depositar"
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
                        disabled={!hasBankAccounts || !hasCashAvailable}
                        inputMode="numeric"
                    />
                    <TextField
                        label="Fecha del depósito"
                        type="date"
                        value={formState.occurredOn}
                        onChange={(event) =>
                            setFormState((prev) => ({
                                ...prev,
                                occurredOn: event.target.value,
                            }))
                        }
                        required
                        disabled={!hasBankAccounts || !hasCashAvailable}
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
                    placeholder="Referencia del depósito, número de comprobante u otros detalles"
                    disabled={!hasBankAccounts || !hasCashAvailable}
                />

                <div className="flex justify-end gap-3">
                    <Button type="button" variant="secondary" onClick={handleClose} disabled={submitting}>
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        loading={submitting}
                        disabled={!hasBankAccounts || !hasCashAvailable || submitting}
                    >
                        Registrar depósito
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
