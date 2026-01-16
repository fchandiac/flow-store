'use client';

import { useEffect, useState, useTransition } from 'react';
import Dialog from '@/baseComponents/Dialog/Dialog';
import Select, { type Option } from '@/baseComponents/Select/Select';
import { TextField } from '@/baseComponents/TextField/TextField';
import { Button } from '@/baseComponents/Button/Button';
import Alert from '@/baseComponents/Alert/Alert';
import { createOperatingExpense, type ExpenseCategoryOption } from '@/actions/operatingExpenses';
import type { CostCenterSummary } from '@/actions/costCenters';
import type { PaymentMethod } from '@/data/entities/Transaction';

interface OperatingExpensesDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    categories: ExpenseCategoryOption[];
    costCenters: CostCenterSummary[];
}

interface FormState {
    expenseCategoryId: string | null;
    costCenterId: string | null;
    paymentMethod: PaymentMethod | null;
    amount: string;
    taxAmount: string;
    notes: string;
    externalReference: string;
}

const PAYMENT_METHOD_OPTIONS: Option[] = [
    { id: 'CASH', label: 'Efectivo' },
    { id: 'TRANSFER', label: 'Transferencia bancaria' },
    { id: 'DEBIT_CARD', label: 'Tarjeta de débito' },
    { id: 'CREDIT_CARD', label: 'Tarjeta de crédito' },
];

const INITIAL_FORM_STATE: FormState = {
    expenseCategoryId: null,
    costCenterId: null,
    paymentMethod: 'CASH' as PaymentMethod,
    amount: '',
    taxAmount: '',
    notes: '',
    externalReference: '',
};

export default function OperatingExpensesDialog({ open, onClose, onSuccess, categories, costCenters }: OperatingExpensesDialogProps) {
    const [formState, setFormState] = useState<FormState>(INITIAL_FORM_STATE);
    const [errors, setErrors] = useState<string[]>([]);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (open) {
            setErrors([]);
        }
    }, [open]);

    useEffect(() => {
        if (!formState.expenseCategoryId && categories.length > 0) {
            setFormState((prev) => ({ ...prev, expenseCategoryId: categories[0].id }));
        }
    }, [categories, formState.expenseCategoryId]);

    useEffect(() => {
        if (!formState.costCenterId && costCenters.length > 0) {
            setFormState((prev) => ({ ...prev, costCenterId: costCenters[0].id }));
        }
    }, [costCenters, formState.costCenterId]);

    const resetForm = () => {
        setFormState({
            ...INITIAL_FORM_STATE,
            expenseCategoryId: categories[0]?.id ?? null,
            costCenterId: costCenters[0]?.id ?? null,
        });
    };

    const handleClose = () => {
        if (isPending) {
            return;
        }
        resetForm();
        setErrors([]);
        onClose();
    };

    const handleSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
        event.preventDefault();

        if (!formState.expenseCategoryId) {
            setErrors(['Selecciona una categoría de gasto.']);
            return;
        }
        if (!formState.costCenterId) {
            setErrors(['Selecciona un centro de costos.']);
            return;
        }
        if (!formState.paymentMethod) {
            setErrors(['Selecciona un método de pago.']);
            return;
        }

        const parsedAmount = Number(formState.amount);
        const parsedTaxAmount = formState.taxAmount ? Number(formState.taxAmount) : 0;

        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
            setErrors(['Ingresa un monto válido mayor a cero.']);
            return;
        }

        if (!Number.isFinite(parsedTaxAmount) || parsedTaxAmount < 0) {
            setErrors(['El impuesto debe ser un número positivo.']);
            return;
        }

        setErrors([]);

        startTransition(async () => {
            const result = await createOperatingExpense({
                expenseCategoryId: formState.expenseCategoryId as string,
                costCenterId: formState.costCenterId as string,
                amount: parsedAmount,
                taxAmount: parsedTaxAmount,
                paymentMethod: formState.paymentMethod as PaymentMethod,
                notes: formState.notes.trim() ? formState.notes.trim() : undefined,
                externalReference: formState.externalReference.trim() ? formState.externalReference.trim() : undefined,
            });

            if (!result.success) {
                setErrors([result.error ?? 'No se pudo registrar el gasto.']);
                return;
            }

            resetForm();
            onSuccess?.();
            onClose();
        });
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            title="Registrar gasto operativo"
            size="lg"
            showCloseButton
            closeButtonText="Cancelar"
        >
            <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid gap-4 md:grid-cols-2">
                    <Select
                        label="Categoría de gasto"
                        options={categories.map((category) => ({ id: category.id, label: category.name }))}
                        value={formState.expenseCategoryId}
                        onChange={(id) =>
                            setFormState((prev) => ({
                                ...prev,
                                expenseCategoryId: typeof id === 'string' ? id : id != null ? String(id) : null,
                            }))
                        }
                        required
                    />
                    <Select
                        label="Centro de costos"
                        options={costCenters.map((center) => ({ id: center.id, label: `${center.name} (${center.code})` }))}
                        value={formState.costCenterId}
                        onChange={(id) =>
                            setFormState((prev) => ({
                                ...prev,
                                costCenterId: typeof id === 'string' ? id : id != null ? String(id) : null,
                            }))
                        }
                        required
                    />
                    <Select
                        label="Método de pago"
                        options={PAYMENT_METHOD_OPTIONS}
                        value={formState.paymentMethod}
                        onChange={(id) =>
                            setFormState((prev) => ({
                                ...prev,
                                paymentMethod: (typeof id === 'string' ? id : String(id)) as PaymentMethod,
                            }))
                        }
                        required
                    />
                    <TextField
                        label="Monto total (CLP)"
                        type="number"
                        value={formState.amount}
                        onChange={(event) =>
                            setFormState((prev) => ({
                                ...prev,
                                amount: event.target.value,
                            }))
                        }
                        required
                        min={0}
                        step={0.01}
                    />
                    <TextField
                        label="Impuesto (opcional)"
                        type="number"
                        value={formState.taxAmount}
                        onChange={(event) =>
                            setFormState((prev) => ({
                                ...prev,
                                taxAmount: event.target.value,
                            }))
                        }
                        min={0}
                        step={0.01}
                    />
                    <TextField
                        label="Referencia externa"
                        value={formState.externalReference}
                        onChange={(event) =>
                            setFormState((prev) => ({
                                ...prev,
                                externalReference: event.target.value,
                            }))
                        }
                        placeholder="N° de factura, folio, etc."
                    />
                </div>

                <TextField
                    label="Notas"
                    value={formState.notes}
                    onChange={(event) =>
                        setFormState((prev) => ({
                            ...prev,
                            notes: event.target.value,
                        }))
                    }
                    placeholder="Detalles adicionales del gasto"
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
                        Registrar gasto
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
