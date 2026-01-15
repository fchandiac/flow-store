'use client';

import { useMemo, useState } from 'react';
import Dialog from '@/baseComponents/Dialog/Dialog';
import CreateBaseForm, { type BaseFormFieldGroup } from '@/baseComponents/BaseForm/CreateBaseForm';
import { useAlert } from '@/globalstate/alert/useAlert';
import { BudgetCurrency } from '@/data/entities/Budget';
import type { CostCenterSummary } from '../../ui/types';
import { createBudget } from '@/actions/budgets';

interface CreateBudgetDialogProps {
    open: boolean;
    onClose: () => void;
    costCenters: CostCenterSummary[];
    onSuccess: () => void;
    dataTestId?: string;
}

const defaultFormState = {
    costCenterId: '',
    periodStart: '',
    periodEnd: '',
    budgetedAmount: '',
    currency: BudgetCurrency.CLP,
};

const currencyOptions = [
    { id: BudgetCurrency.CLP, label: 'CLP · Peso chileno' },
];

const sanitizeAmount = (value: string): number => {
    const digits = value.replace(/[^0-9]/g, '');
    if (!digits) {
        return 0;
    }
    return Number(digits);
};

const CreateBudgetDialog: React.FC<CreateBudgetDialogProps> = ({
    open,
    onClose,
    costCenters,
    onSuccess,
    dataTestId,
}) => {
    const { success, error } = useAlert();
    const [formData, setFormData] = useState(defaultFormState);
    const [errors, setErrors] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const costCenterOptions = useMemo(() => {
        const activeCenters = costCenters.filter((center) => center.isActive);
        return [
            { id: '', label: 'Selecciona un centro de costo' },
            ...activeCenters.map((center) => {
                const branchName = center.branch?.name ? ` · ${center.branch.name}` : '';
                return {
                    id: center.id,
                    label: `${center.code} · ${center.name}${branchName}`,
                };
            }),
        ];
    }, [costCenters]);

    const fields: BaseFormFieldGroup[] = useMemo(() => [
        {
            id: 'context',
            columns: 2,
            fields: [
                {
                    name: 'costCenterId',
                    label: 'Centro de costo',
                    type: 'select',
                    required: true,
                    options: costCenterOptions,
                },
                {
                    name: 'currency',
                    label: 'Moneda',
                    type: 'select',
                    required: true,
                    options: currencyOptions,
                },
            ],
        },
        {
            id: 'period',
            columns: 2,
            fields: [
                {
                    name: 'periodStart',
                    label: 'Período desde',
                    type: 'date',
                    required: true,
                },
                {
                    name: 'periodEnd',
                    label: 'Período hasta',
                    type: 'date',
                    required: true,
                },
            ],
        },
        {
            id: 'financials',
            columns: 1,
            fields: [
                {
                    name: 'budgetedAmount',
                    label: 'Monto presupuestado',
                    type: 'currency',
                    required: true,
                },
            ],
        },
    ], [costCenterOptions]);

    const validate = (values: typeof formData): string[] => {
        const validationErrors: string[] = [];
        if (!values.costCenterId) {
            validationErrors.push('Selecciona un centro de costo.');
        }
        if (!values.periodStart) {
            validationErrors.push('La fecha de inicio es obligatoria.');
        }
        if (!values.periodEnd) {
            validationErrors.push('La fecha de término es obligatoria.');
        }
        if (values.periodStart && values.periodEnd && values.periodStart > values.periodEnd) {
            validationErrors.push('La fecha de inicio no puede ser posterior a la fecha de término.');
        }
        if (!values.budgetedAmount || sanitizeAmount(values.budgetedAmount) <= 0) {
            validationErrors.push('El monto presupuestado debe ser mayor a cero.');
        }
        if (!values.currency) {
            validationErrors.push('Selecciona una moneda.');
        }
        return validationErrors;
    };

    const handleChange = (field: string, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        const validationErrors = validate(formData);
        if (validationErrors.length > 0) {
            setErrors(validationErrors);
            return;
        }

        setIsSubmitting(true);
        setErrors([]);

        try {
            const result = await createBudget({
                costCenterId: formData.costCenterId,
                periodStart: formData.periodStart,
                periodEnd: formData.periodEnd,
                budgetedAmount: sanitizeAmount(formData.budgetedAmount),
                currency: formData.currency,
            });

            if (!result.success) {
                error(result.error ?? 'No fue posible crear el presupuesto.');
                setIsSubmitting(false);
                return;
            }

            success('Presupuesto creado correctamente.');
            setFormData(defaultFormState);
            onSuccess();
        } catch (err) {
            console.error('[CreateBudgetDialog] Submit error', err);
            error('Ocurrió un error inesperado al crear el presupuesto.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setFormData(defaultFormState);
        setErrors([]);
        onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            hideActions
            title=""
            scroll="body"
            data-test-id={dataTestId}
        >
            <CreateBaseForm
                fields={fields}
                values={formData}
                onChange={handleChange}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                submitLabel="Crear presupuesto"
                title="Nuevo presupuesto"
                subtitle="Define el período y monto aprobado para este centro de costo."
                errors={errors}
                validate={(values) => validate(values as typeof formData)}
                cancelButton
                cancelButtonText="Cancelar"
                onCancel={handleClose}
                data-test-id="create-budget-form"
            />
        </Dialog>
    );
};

export default CreateBudgetDialog;
