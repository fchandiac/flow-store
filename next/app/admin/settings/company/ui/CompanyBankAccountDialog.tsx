'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Dialog from '@/baseComponents/Dialog/Dialog';
import Select, { type Option } from '@/baseComponents/Select/Select';
import { TextField } from '@/baseComponents/TextField/TextField';
import { Button } from '@/baseComponents/Button/Button';
import Alert from '@/baseComponents/Alert/Alert';
import { addCompanyBankAccount } from '@/app/actions/companies';
import type { CompanyBankAccount, CompanyType } from './CompanyForm';
import type { BankName, AccountTypeName } from '@/data/entities/Person';

interface CompanyBankAccountDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: (company: CompanyType) => void;
    defaultHolderName?: string;
    mustBePrimary?: boolean;
}

interface FormState {
    bankName: string;
    accountType: string;
    accountNumber: string;
    accountHolderName: string;
    notes: string;
    isPrimary: boolean;
}

const BANK_OPTIONS: Option[] = [
    { id: 'Banco de Chile', label: 'Banco de Chile' },
    { id: 'Banco del Estado de Chile', label: 'Banco Estado' },
    { id: 'Banco Santander Chile', label: 'Banco Santander' },
    { id: 'Banco de Crédito e Inversiones', label: 'Banco BCI' },
    { id: 'Banco Falabella', label: 'Banco Falabella' },
    { id: 'Banco Security', label: 'Banco Security' },
    { id: 'Banco CrediChile', label: 'Banco CrediChile' },
    { id: 'Banco Itaú Corpbanca', label: 'Banco Itaú' },
    { id: 'Scotiabank Chile', label: 'Scotiabank' },
    { id: 'Banco Consorcio', label: 'Banco Consorcio' },
    { id: 'Banco Ripley', label: 'Banco Ripley' },
    { id: 'Banco Internacional', label: 'Banco Internacional' },
    { id: 'Banco BICE', label: 'Banco BICE' },
    { id: 'Banco Paris', label: 'Banco Paris' },
    { id: 'Banco Mercado Pago', label: 'Banco Mercado Pago' },
    { id: 'Otro', label: 'Otro banco' },
];

const ACCOUNT_TYPE_OPTIONS: Option[] = [
    { id: 'Cuenta Corriente', label: 'Cuenta Corriente' },
    { id: 'Cuenta de Ahorro', label: 'Cuenta de Ahorro' },
    { id: 'Cuenta Vista', label: 'Cuenta Vista' },
    { id: 'Cuenta RUT', label: 'Cuenta RUT' },
    { id: 'Cuenta Chequera Electrónica', label: 'Cuenta Chequera Electrónica' },
    { id: 'Otro', label: 'Otro tipo' },
];

const buildInitialState = (holderName: string, mustBePrimary: boolean): FormState => ({
    bankName: BANK_OPTIONS[0]?.id?.toString() ?? '',
    accountType: ACCOUNT_TYPE_OPTIONS[0]?.id?.toString() ?? '',
    accountNumber: '',
    accountHolderName: holderName,
    notes: '',
    isPrimary: mustBePrimary,
});

export default function CompanyBankAccountDialog({ open, onClose, onSuccess, defaultHolderName = '', mustBePrimary = false }: CompanyBankAccountDialogProps) {
    const [formState, setFormState] = useState<FormState>(() => buildInitialState(defaultHolderName, mustBePrimary));
    const [errors, setErrors] = useState<string[]>([]);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (open) {
            setFormState(buildInitialState(defaultHolderName, mustBePrimary));
            setErrors([]);
        }
    }, [open, defaultHolderName, mustBePrimary]);

    const holderNamePlaceholder = useMemo(() => defaultHolderName || 'Nombre del titular', [defaultHolderName]);

    const handleClose = () => {
        if (isPending) {
            return;
        }
        onClose();
    };

    const handleSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
        event.preventDefault();

        const validationErrors: string[] = [];
        if (!formState.bankName) validationErrors.push('Selecciona un banco.');
        if (!formState.accountType) validationErrors.push('Selecciona un tipo de cuenta.');
        if (!formState.accountNumber.trim()) validationErrors.push('Ingresa el número de cuenta.');
        if (!formState.accountHolderName.trim()) validationErrors.push('Ingresa el titular de la cuenta.');

        if (validationErrors.length > 0) {
            setErrors(validationErrors);
            return;
        }

        setErrors([]);

        startTransition(async () => {
            const result = await addCompanyBankAccount({
                bankName: formState.bankName as BankName,
                accountType: formState.accountType as AccountTypeName,
                accountNumber: formState.accountNumber.trim(),
                accountHolderName: formState.accountHolderName.trim(),
                notes: formState.notes.trim() || undefined,
                isPrimary: formState.isPrimary,
            });

            if (!result.success || !result.company) {
                setErrors([result.error ?? 'No se pudo agregar la cuenta bancaria.']);
                return;
            }

            setFormState(buildInitialState(defaultHolderName, mustBePrimary));
            onSuccess(result.company as CompanyType);
        });
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            title="Agregar cuenta bancaria"
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

                <div className="grid gap-4 md:grid-cols-2">
                    <Select
                        label="Banco"
                        options={BANK_OPTIONS}
                        value={formState.bankName}
                        onChange={(value) =>
                            setFormState((prev) => ({
                                ...prev,
                                bankName: value ? value.toString() : '',
                            }))
                        }
                        required
                    />
                    <Select
                        label="Tipo de cuenta"
                        options={ACCOUNT_TYPE_OPTIONS}
                        value={formState.accountType}
                        onChange={(value) =>
                            setFormState((prev) => ({
                                ...prev,
                                accountType: value ? value.toString() : '',
                            }))
                        }
                        required
                    />
                </div>

                <TextField
                    label="Número de cuenta"
                    value={formState.accountNumber}
                    onChange={(event) =>
                        setFormState((prev) => ({
                            ...prev,
                            accountNumber: event.target.value,
                        }))
                    }
                    required
                />

                <TextField
                    label="Titular de la cuenta"
                    value={formState.accountHolderName}
                    onChange={(event) =>
                        setFormState((prev) => ({
                            ...prev,
                            accountHolderName: event.target.value,
                        }))
                    }
                    placeholder={holderNamePlaceholder}
                    required
                />

                <div className="flex items-center gap-3">
                    <input
                        id="company-bank-account-primary"
                        type="checkbox"
                        checked={formState.isPrimary}
                        onChange={(event) =>
                            setFormState((prev) => ({
                                ...prev,
                                isPrimary: event.target.checked,
                            }))
                        }
                        className="h-4 w-4 rounded border-neutral-300 text-primary focus:ring-primary/40"
                    />
                    <label htmlFor="company-bank-account-primary" className="text-sm text-neutral-700">
                        Marcar como cuenta principal
                    </label>
                </div>

                <TextField
                    label="Notas (opcional)"
                    value={formState.notes}
                    onChange={(event) =>
                        setFormState((prev) => ({
                            ...prev,
                            notes: event.target.value,
                        }))
                    }
                    placeholder="Información adicional relevante"
                />

                <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outlined" type="button" onClick={handleClose} disabled={isPending}>
                        Cancelar
                    </Button>
                    <Button type="submit" loading={isPending}>
                        Guardar cuenta
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
