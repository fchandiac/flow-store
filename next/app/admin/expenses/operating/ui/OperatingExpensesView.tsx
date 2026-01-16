'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/baseComponents/Button/Button';
import { TextField } from '@/baseComponents/TextField/TextField';
import Select, { Option } from '@/baseComponents/Select/Select';
import { createOperatingExpense, OperatingExpenseListItem, ExpenseCategoryOption } from '@/actions/operatingExpenses';
import type { CostCenterSummary } from '@/actions/costCenters';
import type { PaymentMethod } from '@/data/entities/Transaction';

interface OperatingExpensesViewProps {
    expenses: OperatingExpenseListItem[];
    categories: ExpenseCategoryOption[];
    costCenters: CostCenterSummary[];
}

const PAYMENT_METHOD_OPTIONS: Option[] = [
    { id: 'CASH', label: 'Efectivo' },
    { id: 'TRANSFER', label: 'Transferencia bancaria' },
    { id: 'DEBIT_CARD', label: 'Tarjeta de débito' },
    { id: 'CREDIT_CARD', label: 'Tarjeta de crédito' },
];

const PAYMENT_METHOD_LABEL: Record<string, string> = {
    CASH: 'Efectivo',
    TRANSFER: 'Transferencia bancaria',
    DEBIT_CARD: 'Tarjeta de débito',
    CREDIT_CARD: 'Tarjeta de crédito',
};

const currencyFormatter = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
});

export default function OperatingExpensesView({ expenses, categories, costCenters }: OperatingExpensesViewProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const [selectedCategory, setSelectedCategory] = useState<string | null>(categories[0]?.id ?? null);
    const [selectedCostCenter, setSelectedCostCenter] = useState<string | null>(costCenters[0]?.id ?? null);
    const [paymentMethod, setPaymentMethod] = useState<string | null>(PAYMENT_METHOD_OPTIONS[0]?.id as string ?? 'CASH');
    const [amount, setAmount] = useState<string>('');
    const [taxAmount, setTaxAmount] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [externalReference, setExternalReference] = useState<string>('');
    const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

    const categoryOptions: Option[] = useMemo(
        () => categories.map((category) => ({ id: category.id, label: `${category.name} (${category.code})` })),
        [categories],
    );

    const costCenterOptions: Option[] = useMemo(
        () => costCenters.map((center) => ({ id: center.id, label: `${center.name} (${center.code})` })),
        [costCenters],
    );

    const latestExpenses = useMemo(() => expenses.slice(0, 10), [expenses]);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!selectedCategory) {
            setFeedback({ type: 'error', message: 'Selecciona una categoría de gasto.' });
            return;
        }
        if (!selectedCostCenter) {
            setFeedback({ type: 'error', message: 'Selecciona un centro de costos.' });
            return;
        }
        if (!paymentMethod) {
            setFeedback({ type: 'error', message: 'Selecciona un método de pago.' });
            return;
        }

        const parsedAmount = Number(amount.replace(/,/g, '.'));
        const parsedTax = taxAmount ? Number(taxAmount.replace(/,/g, '.')) : 0;

        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
            setFeedback({ type: 'error', message: 'Ingresa un monto válido mayor a cero.' });
            return;
        }

        if (!Number.isFinite(parsedTax) || parsedTax < 0) {
            setFeedback({ type: 'error', message: 'El impuesto debe ser un número positivo.' });
            return;
        }

        startTransition(async () => {
            const result = await createOperatingExpense({
                expenseCategoryId: selectedCategory,
                costCenterId: selectedCostCenter,
                amount: parsedAmount,
                taxAmount: parsedTax,
                paymentMethod: paymentMethod as PaymentMethod,
                notes: notes.trim() ? notes.trim() : undefined,
                externalReference: externalReference.trim() ? externalReference.trim() : undefined,
            });

            if (result.success) {
                setFeedback({ type: 'success', message: 'Gasto operativo registrado correctamente.' });
                setAmount('');
                setTaxAmount('');
                setNotes('');
                setExternalReference('');
                router.refresh();
            } else {
                setFeedback({ type: 'error', message: result.error ?? 'No se pudo registrar el gasto.' });
            }
        });
    };

    return (
        <div className="space-y-8">
            <section className="rounded-lg border border-border bg-white p-6 shadow-sm">
                <h1 className="text-2xl font-semibold">Registrar gasto operativo</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Asocia cada desembolso a su categoría contable y centro de costos para mantener el control operativo.
                </p>

                <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
                    <div className="md:col-span-1">
                        <Select
                            label="Categoría de gasto"
                            options={categoryOptions}
                            value={selectedCategory}
                            onChange={(id) => setSelectedCategory(typeof id === 'string' ? id : String(id))}
                            required
                        />
                    </div>

                    <div className="md:col-span-1">
                        <Select
                            label="Centro de costos"
                            options={costCenterOptions}
                            value={selectedCostCenter}
                            onChange={(id) => setSelectedCostCenter(typeof id === 'string' ? id : String(id))}
                            required
                        />
                    </div>

                    <div className="md:col-span-1">
                        <Select
                            label="Método de pago"
                            options={PAYMENT_METHOD_OPTIONS}
                            value={paymentMethod}
                            onChange={(id) => setPaymentMethod(typeof id === 'string' ? id : String(id))}
                            required
                        />
                    </div>

                    <div className="md:col-span-1">
                        <TextField
                            label="Monto total (CLP)"
                            type="number"
                            value={amount}
                            onChange={(event) => setAmount(event.target.value)}
                            required
                            min={0}
                            step={0.01}
                        />
                    </div>

                    <div className="md:col-span-1">
                        <TextField
                            label="Impuesto (opcional)"
                            type="number"
                            value={taxAmount}
                            onChange={(event) => setTaxAmount(event.target.value)}
                            min={0}
                            step={0.01}
                        />
                    </div>

                    <div className="md:col-span-1">
                        <TextField
                            label="Referencia externa"
                            value={externalReference}
                            onChange={(event) => setExternalReference(event.target.value)}
                            placeholder="N° de factura, folio, etc."
                        />
                    </div>

                    <div className="md:col-span-2">
                        <TextField
                            label="Notas"
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                            placeholder="Detalles adicionales del gasto"
                        />
                    </div>

                    <div className="md:col-span-2 flex items-center justify-between">
                        {feedback && (
                            <p className={`text-sm ${feedback.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                {feedback.message}
                            </p>
                        )}
                        <Button type="submit" loading={isPending} disabled={isPending}>
                            Registrar gasto
                        </Button>
                    </div>
                </form>
            </section>

            <section className="rounded-lg border border-border bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h2 className="text-xl font-semibold">Últimos movimientos</h2>
                        <p className="text-sm text-muted-foreground">Se muestran los 10 gastos registrados más recientes.</p>
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">
                        Total histórico: {currencyFormatter.format(expenses.reduce((acc, item) => acc + item.total, 0))}
                    </span>
                </div>

                <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-muted/50">
                            <tr className="text-left text-sm font-semibold text-muted-foreground">
                                <th className="px-4 py-3">Documento</th>
                                <th className="px-4 py-3">Categoría</th>
                                <th className="px-4 py-3">Centro de costo</th>
                                <th className="px-4 py-3">Método</th>
                                <th className="px-4 py-3">Monto</th>
                                <th className="px-4 py-3">Fecha</th>
                                <th className="px-4 py-3">Notas</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border text-sm">
                            {latestExpenses.length === 0 && (
                                <tr>
                                    <td className="px-4 py-6 text-center text-muted-foreground" colSpan={7}>
                                        Aún no has registrado gastos operativos.
                                    </td>
                                </tr>
                            )}
                            {latestExpenses.map((expense) => (
                                <tr key={expense.id} className="hover:bg-muted/40">
                                    <td className="px-4 py-3 font-medium">{expense.documentNumber}</td>
                                    <td className="px-4 py-3">
                                        {expense.expenseCategory ? `${expense.expenseCategory.name} (${expense.expenseCategory.code})` : '—'}
                                    </td>
                                    <td className="px-4 py-3">
                                        {expense.costCenter ? `${expense.costCenter.name} (${expense.costCenter.code})` : '—'}
                                    </td>
                                    <td className="px-4 py-3">{expense.paymentMethod ? PAYMENT_METHOD_LABEL[expense.paymentMethod] ?? expense.paymentMethod : '—'}</td>
                                    <td className="px-4 py-3 font-semibold">{currencyFormatter.format(expense.total)}</td>
                                    <td className="px-4 py-3">{new Date(expense.createdAt).toLocaleString('es-CL')}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{expense.notes ?? '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
