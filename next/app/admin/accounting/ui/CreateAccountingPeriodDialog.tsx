'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Dialog from '@/baseComponents/Dialog/Dialog';
import { TextField } from '@/baseComponents/TextField/TextField';
import { Button } from '@/baseComponents/Button/Button';
import Alert from '@/baseComponents/Alert/Alert';
import { useAlert } from '@/globalstate/alert/useAlert';
import { createAccountingPeriod, type AccountingPeriodSummary } from '@/actions/accounting';

interface CreateAccountingPeriodDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void | Promise<void>;
    existingPeriods: AccountingPeriodSummary[];
}

interface FormState {
    startDate: string;
    endDate: string;
}

const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

const defaultRange = (periods: AccountingPeriodSummary[]): FormState => {
    if (!periods || periods.length === 0) {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return { startDate: formatDate(start), endDate: formatDate(end) };
    }

    const sorted = [...periods].sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
    const last = sorted[sorted.length - 1];
    const nextStartCandidate = addDays(new Date(last.endDate), 1);
    const startDate = formatDate(nextStartCandidate);
    const endOfMonth = new Date(nextStartCandidate.getFullYear(), nextStartCandidate.getMonth() + 1, 0);
    const endDate = formatDate(endOfMonth);
    return { startDate, endDate };
};

const overlapsWithExisting = (
    startDate: string,
    endDate: string,
    periods: AccountingPeriodSummary[],
): boolean => {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();

    return periods.some((period) => {
        const periodStart = new Date(period.startDate).getTime();
        const periodEnd = new Date(period.endDate).getTime();
        return start <= periodEnd && end >= periodStart;
    });
};

export default function CreateAccountingPeriodDialog({ open, onClose, onSuccess, existingPeriods }: CreateAccountingPeriodDialogProps) {
    const { success, error } = useAlert();
    const [formState, setFormState] = useState<FormState>(() => defaultRange(existingPeriods));
    const [errors, setErrors] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            setErrors([]);
            setIsSubmitting(false);
            setFormState(defaultRange(existingPeriods));
        }
    }, [open, existingPeriods]);

    const periodSuggestion = useMemo(() => {
        if (!formState.startDate || !formState.endDate) {
            return null;
        }
        return `Desde ${new Date(formState.startDate).toLocaleDateString('es-CL')} hasta ${new Date(formState.endDate).toLocaleDateString('es-CL')}`;
    }, [formState.startDate, formState.endDate]);

    const validateForm = (): string[] => {
        const messages: string[] = [];
        if (!formState.startDate) {
            messages.push('Debes indicar la fecha de inicio del período.');
        }
        if (!formState.endDate) {
            messages.push('Debes indicar la fecha de término del período.');
        }

        const start = new Date(formState.startDate);
        const end = new Date(formState.endDate);

        if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
            messages.push('Las fechas ingresadas no son válidas.');
        } else if (end < start) {
            messages.push('La fecha de término no puede ser anterior a la fecha de inicio.');
        }

        if (messages.length === 0 && overlapsWithExisting(formState.startDate, formState.endDate, existingPeriods)) {
            messages.push('El período se superpone con otro período contable existente.');
        }

        return messages;
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isSubmitting) {
            return;
        }

        const validationErrors = validateForm();
        if (validationErrors.length > 0) {
            setErrors(validationErrors);
            return;
        }

        setErrors([]);
        setIsSubmitting(true);

        try {
            const result = await createAccountingPeriod({
                startDate: formState.startDate,
                endDate: formState.endDate,
            });

            if (!result.success) {
                throw new Error(result.error ?? 'No se pudo crear el período contable.');
            }

            success('Período contable creado correctamente.');
            await onSuccess();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Ocurrió un error al crear el período contable.';
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
        <Dialog open={open} onClose={handleClose} title="Nuevo período contable" size="md" showCloseButton>
            <form className="space-y-6" onSubmit={handleSubmit}>
                <Alert variant="info">
                    Define las fechas de inicio y término para el período contable. No debe solaparse con períodos ya registrados.
                    {periodSuggestion && <div className="mt-2 text-xs text-muted-foreground">Sugerencia: {periodSuggestion}</div>}
                </Alert>

                <div className="grid gap-4 md:grid-cols-2">
                    <TextField
                        label="Fecha de inicio"
                        type="date"
                        value={formState.startDate}
                        onChange={(event) =>
                            setFormState((prev) => ({
                                ...prev,
                                startDate: event.target.value,
                            }))
                        }
                        required
                    />
                    <TextField
                        label="Fecha de término"
                        type="date"
                        value={formState.endDate}
                        onChange={(event) =>
                            setFormState((prev) => ({
                                ...prev,
                                endDate: event.target.value,
                            }))
                        }
                        required
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
                        Crear período
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
