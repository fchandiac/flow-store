'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Dialog from '@/baseComponents/Dialog/Dialog';
import Select, { type Option } from '@/baseComponents/Select/Select';
import { TextField } from '@/baseComponents/TextField/TextField';
import { Button } from '@/baseComponents/Button/Button';
import Alert from '@/baseComponents/Alert/Alert';
import { createOperatingExpense } from '@/actions/operatingExpenses';
import type { ExpenseCategoryOption, PayrollCategoryType } from '@/actions/expenseCategories';
import type { CostCenterSummary } from '@/actions/costCenters';
import { PaymentMethod } from '@/data/entities/Transaction';
import type { EmployeeListItem } from '@/actions/employees';
import type { PersonBankAccount } from '@/data/entities/Person';

interface OperatingExpensesDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    categories: ExpenseCategoryOption[];
    costCenters: CostCenterSummary[];
    employees: EmployeeListItem[];
    companyBankAccounts: PersonBankAccount[];
}

interface FormState {
    expenseCategoryId: string | null;
    costCenterId: string | null;
    paymentMethod: PaymentMethod | null;
    bankAccountKey: string | null;
    cashSessionId: string;
    amount: string;
    taxAmount: string;
    notes: string;
    externalReference: string;
    employeeId: string | null;
}

const PAYMENT_METHOD_OPTIONS: Option[] = [
    { id: PaymentMethod.CASH, label: 'Efectivo' },
    { id: PaymentMethod.TRANSFER, label: 'Transferencia bancaria' },
    { id: PaymentMethod.DEBIT_CARD, label: 'Tarjeta de débito' },
    { id: PaymentMethod.CREDIT_CARD, label: 'Tarjeta de crédito' },
];

const INITIAL_FORM_STATE: FormState = {
    expenseCategoryId: null,
    costCenterId: null,
    paymentMethod: PaymentMethod.CASH,
    bankAccountKey: null,
    cashSessionId: '',
    amount: '',
    taxAmount: '',
    notes: '',
    externalReference: '',
    employeeId: null,
};

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
    FULL_TIME: 'Jornada completa',
    PART_TIME: 'Media jornada',
    CONTRACTOR: 'Contrato externo',
    TEMPORARY: 'Temporal',
    INTERN: 'Práctica',
};

const EMPLOYEE_STATUS_LABELS: Record<string, string> = {
    ACTIVE: 'Activo',
    SUSPENDED: 'Suspendido',
    TERMINATED: 'Terminado',
};

const CLP_FORMATTER = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

const formatEmployeeName = (employee: EmployeeListItem) => {
    const { person } = employee;
    if (person.businessName) {
        return person.businessName;
    }
    const parts = [person.firstName, person.lastName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : person.firstName;
};

const formatCurrency = (value: number) => CLP_FORMATTER.format(value);

export default function OperatingExpensesDialog({ open, onClose, onSuccess, categories, costCenters, employees, companyBankAccounts }: OperatingExpensesDialogProps) {
    const [formState, setFormState] = useState<FormState>(INITIAL_FORM_STATE);
    const [errors, setErrors] = useState<string[]>([]);
    const [isPending, startTransition] = useTransition();
    const lastAutoAmountRef = useRef<string | null>(null);
    const lastAutoCostCenterRef = useRef<string | null>(null);

    const categoryOptions = useMemo(
        () => categories.map((category) => ({ id: category.id, label: category.name })),
        [categories],
    );

    const selectedCategory = useMemo(() => {
        if (!formState.expenseCategoryId) {
            return null;
        }
        return categories.find((category) => category.id === formState.expenseCategoryId) ?? null;
    }, [categories, formState.expenseCategoryId]);

    const payrollType: PayrollCategoryType | null = selectedCategory?.payrollType ?? null;

    const employeeOptions = useMemo(
        () =>
            employees
                .slice()
                .sort((a, b) => formatEmployeeName(a).localeCompare(formatEmployeeName(b), 'es'))
                .map((employee) => ({ id: employee.id, label: formatEmployeeName(employee) })),
        [employees],
    );

    const hasEmployeeOptions = employeeOptions.length > 0;

    const selectedEmployee = useMemo(() => {
        if (!formState.employeeId) {
            return null;
        }
        return employees.find((employee) => employee.id === formState.employeeId) ?? null;
    }, [employees, formState.employeeId]);

    const bankAccountOptions = useMemo<Option[]>(() => {
        return companyBankAccounts
            .filter((account) => Boolean(account?.accountKey))
            .map((account) => {
                const suffix = account.isPrimary ? ' · Principal' : '';
                return {
                    id: account.accountKey as string,
                    label: `${account.bankName} · ${account.accountNumber} (${account.accountType})${suffix}`,
                } satisfies Option;
            });
    }, [companyBankAccounts]);

    const hasBankAccountOptions = bankAccountOptions.length > 0;

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

    useEffect(() => {
        if (!selectedCategory?.payrollType && formState.employeeId) {
            setFormState((prev) => ({ ...prev, employeeId: null }));
        }
    }, [selectedCategory?.payrollType, formState.employeeId]);

    useEffect(() => {
        if (selectedCategory?.payrollType && selectedEmployee?.costCenter?.id) {
            const costCenterId = selectedEmployee.costCenter.id;

            setFormState((prev) => {
                const shouldUpdate =
                    !prev.costCenterId ||
                    (lastAutoCostCenterRef.current != null && prev.costCenterId === lastAutoCostCenterRef.current);

                if (!shouldUpdate && prev.costCenterId === costCenterId) {
                    return prev;
                }

                if (!shouldUpdate) {
                    return prev;
                }

                lastAutoCostCenterRef.current = costCenterId;

                return {
                    ...prev,
                    costCenterId,
                };
            });
        } else if (!selectedCategory?.payrollType) {
            lastAutoCostCenterRef.current = null;
        }
    }, [selectedCategory?.payrollType, selectedEmployee?.costCenter?.id]);

    useEffect(() => {
        if (selectedCategory?.payrollType === 'salary' && selectedEmployee?.baseSalary != null) {
            const salaryValue = Math.round(Number(selectedEmployee.baseSalary));
            const salaryString = Number.isFinite(salaryValue) ? String(salaryValue) : '';

            setFormState((prev) => {
                if (!salaryString) {
                    return prev;
                }

                const shouldUpdate =
                    prev.amount === '' ||
                    (lastAutoAmountRef.current != null && prev.amount === lastAutoAmountRef.current);

                if (!shouldUpdate && prev.amount === salaryString) {
                    return prev;
                }

                if (!shouldUpdate) {
                    return prev;
                }

                lastAutoAmountRef.current = salaryString;

                return {
                    ...prev,
                    amount: salaryString,
                };
            });
        } else {
            lastAutoAmountRef.current = null;
        }
    }, [selectedCategory?.payrollType, selectedEmployee?.baseSalary, selectedEmployee?.id]);

    useEffect(() => {
        if (formState.paymentMethod !== PaymentMethod.TRANSFER) {
            return;
        }
        if (formState.bankAccountKey) {
            return;
        }
        const candidate = bankAccountOptions[0]?.id;
        if (!candidate) {
            return;
        }
        setFormState((prev) => {
            if (prev.paymentMethod !== PaymentMethod.TRANSFER || prev.bankAccountKey) {
                return prev;
            }
            const nextValue = typeof candidate === 'string' ? candidate : String(candidate);
            return {
                ...prev,
                bankAccountKey: nextValue,
            };
        });
    }, [bankAccountOptions, formState.bankAccountKey, formState.paymentMethod]);

    useEffect(() => {
        if (formState.paymentMethod === PaymentMethod.TRANSFER) {
            return;
        }
        if (formState.bankAccountKey === null) {
            return;
        }
        setFormState((prev) => ({
            ...prev,
            bankAccountKey: null,
        }));
    }, [formState.paymentMethod, formState.bankAccountKey]);

    useEffect(() => {
        if (formState.paymentMethod === PaymentMethod.CASH) {
            return;
        }
        if (formState.cashSessionId === '') {
            return;
        }
        setFormState((prev) => ({
            ...prev,
            cashSessionId: '',
        }));
    }, [formState.paymentMethod, formState.cashSessionId]);

    const resetForm = () => {
        lastAutoAmountRef.current = null;
        lastAutoCostCenterRef.current = null;
        setFormState({
            ...INITIAL_FORM_STATE,
            expenseCategoryId: categories[0]?.id ?? null,
            costCenterId: costCenters[0]?.id ?? null,
            employeeId: null,
            bankAccountKey: hasBankAccountOptions ? String(bankAccountOptions[0]?.id ?? '') || null : null,
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
        
        if (formState.paymentMethod === PaymentMethod.TRANSFER) {
            if (!hasBankAccountOptions) {
                setErrors(['Configura una cuenta bancaria de la compañía antes de registrar transferencias.']);
                return;
            }
            if (!formState.bankAccountKey) {
                setErrors(['Selecciona la cuenta bancaria utilizada para la transferencia.']);
                return;
            }
        }
        
        if (formState.paymentMethod === PaymentMethod.CASH) {
            const cashSessionId = formState.cashSessionId.trim();
            if (!cashSessionId) {
                setErrors(['Indica la sesión de caja asociada al pago en efectivo.']);
                return;
            }
        }

        if (payrollType && !formState.employeeId) {
            setErrors(['Selecciona el colaborador asociado al pago.']);
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
            const trimmedCashSessionId = formState.paymentMethod === PaymentMethod.CASH
                ? formState.cashSessionId.trim()
                : '';

            const result = await createOperatingExpense({
                expenseCategoryId: formState.expenseCategoryId as string,
                costCenterId: formState.costCenterId as string,
                amount: parsedAmount,
                taxAmount: parsedTaxAmount,
                paymentMethod: formState.paymentMethod as PaymentMethod,
                bankAccountKey: formState.paymentMethod === PaymentMethod.TRANSFER
                    ? formState.bankAccountKey ?? undefined
                    : undefined,
                cashSessionId: trimmedCashSessionId.length > 0 ? trimmedCashSessionId : undefined,
                notes: formState.notes.trim() ? formState.notes.trim() : undefined,
                externalReference: formState.externalReference.trim() ? formState.externalReference.trim() : undefined,
                employeeId: payrollType ? formState.employeeId ?? undefined : undefined,
                payrollType: payrollType ?? undefined,
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
        >
            <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid gap-4 md:grid-cols-2">
                    <Select
                        label="Categoría de gasto"
                        options={categoryOptions}
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

                {formState.paymentMethod === PaymentMethod.TRANSFER && (
                    <section className="space-y-3 rounded-lg border border-border bg-background p-4">
                        <Select
                            label="Cuenta bancaria de la compañía"
                            options={bankAccountOptions}
                            value={formState.bankAccountKey}
                            onChange={(id) =>
                                setFormState((prev) => ({
                                    ...prev,
                                    bankAccountKey: typeof id === 'string' ? id : id != null ? String(id) : null,
                                }))
                            }
                            required
                            disabled={!hasBankAccountOptions}
                            placeholder={hasBankAccountOptions ? undefined : 'No hay cuentas configuradas'}
                        />

                        {!hasBankAccountOptions && (
                            <Alert variant="warning">
                                Registra las cuentas bancarias de la compañía en Configuración → Información fiscal antes de registrar transferencias.
                            </Alert>
                        )}
                    </section>
                )}

                {formState.paymentMethod === PaymentMethod.CASH && (
                    <section className="space-y-3 rounded-lg border border-border bg-background p-4">
                        <TextField
                            label="Sesión de caja"
                            value={formState.cashSessionId}
                            onChange={(event) =>
                                setFormState((prev) => ({
                                    ...prev,
                                    cashSessionId: event.target.value,
                                }))
                            }
                            required
                            placeholder="ID de la sesión abierta (UUID)"
                        />
                        <Alert variant="info">
                            Vincula el gasto con la sesión de caja que financió el movimiento para mantener conciliados los saldos.
                        </Alert>
                    </section>
                )}

                {payrollType && (
                    <section className="space-y-4 rounded-lg border border-border bg-background p-4">
                        <header>
                            <h3 className="text-sm font-semibold text-foreground">
                                {payrollType === 'salary'
                                    ? 'Detalle de remuneración del colaborador'
                                    : 'Registro de anticipo al colaborador'}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                Selecciona el colaborador para adjuntar el detalle del pago. Esta información quedará registrada en el gasto.
                            </p>
                        </header>

                        <div className="grid gap-4 md:grid-cols-2">
                            <Select
                                label="Colaborador"
                                options={employeeOptions}
                                value={formState.employeeId}
                                onChange={(id) =>
                                    setFormState((prev) => ({
                                        ...prev,
                                        employeeId: typeof id === 'string' ? id : id != null ? String(id) : null,
                                    }))
                                }
                                placeholder={hasEmployeeOptions ? 'Selecciona al colaborador' : 'No hay colaboradores disponibles'}
                                required
                                disabled={!hasEmployeeOptions}
                            />

                            {selectedEmployee?.baseSalary != null && payrollType === 'salary' && (
                                <TextField
                                    label="Salario base"
                                    value={formatCurrency(Number(selectedEmployee.baseSalary))}
                                    onChange={() => {}}
                                    readOnly
                                />
                            )}
                        </div>

                        {selectedEmployee && (
                            <dl className="grid gap-3 rounded-md border border-dashed border-border/60 bg-white/60 p-3 text-xs text-muted-foreground md:grid-cols-2">
                                <div>
                                    <dt className="font-medium text-foreground">Documento</dt>
                                    <dd>{selectedEmployee.person.documentNumber ?? 'Sin documento'}</dd>
                                </div>
                                <div>
                                    <dt className="font-medium text-foreground">Tipo de contrato</dt>
                                    <dd>
                                        {EMPLOYMENT_TYPE_LABELS[selectedEmployee.employmentType] ?? selectedEmployee.employmentType}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="font-medium text-foreground">Estado</dt>
                                    <dd>{EMPLOYEE_STATUS_LABELS[selectedEmployee.status] ?? selectedEmployee.status}</dd>
                                </div>
                                <div>
                                    <dt className="font-medium text-foreground">Centro de costos</dt>
                                    <dd>
                                        {selectedEmployee.costCenter
                                            ? `${selectedEmployee.costCenter.name} (${selectedEmployee.costCenter.code})`
                                            : 'No asignado'}
                                    </dd>
                                </div>
                            </dl>
                        )}

                        {payrollType === 'salary' && (
                            <Alert variant="info">
                                {selectedEmployee?.baseSalary != null
                                    ? 'El monto del gasto se completa con el salario base del colaborador. Puedes ajustarlo si corresponde a bonos u horas extra.'
                                    : 'El colaborador no tiene un salario base registrado. Ingresa manualmente el monto correspondiente a la liquidación.'}
                            </Alert>
                        )}

                        {payrollType && !hasEmployeeOptions && (
                            <Alert variant="warning">
                                Registra primero a tus colaboradores en Recursos Humanos para poder asociarlos a pagos de sueldos o anticipos.
                            </Alert>
                        )}
                    </section>
                )}

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
