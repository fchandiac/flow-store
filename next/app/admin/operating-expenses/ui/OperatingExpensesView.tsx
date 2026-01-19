'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import DataGrid, { type DataGridColumn } from '@/baseComponents/DataGrid/DataGrid';
import OperatingExpensesDialog, { type SupplierOption } from './OperatingExpensesDialog';

export type { SupplierOption } from './OperatingExpensesDialog';
import type { OperatingExpenseListItem } from '@/actions/operatingExpenses';
import type { ExpenseCategoryOption } from '@/actions/expenseCategories';
import type { CostCenterSummary } from '@/actions/costCenters';
import type { EmployeeListItem } from '@/actions/employees';
import type { PersonBankAccount } from '@/data/entities/Person';

interface OperatingExpensesViewProps {
    expenses: OperatingExpenseListItem[];
    categories: ExpenseCategoryOption[];
    costCenters: CostCenterSummary[];
    employees: EmployeeListItem[];
    companyBankAccounts: PersonBankAccount[];
    suppliers: SupplierOption[];
}

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

interface OperatingExpenseRow {
    id: string;
    documentNumber: string;
    categoryName: string;
    employeeName: string;
    supplierName: string;
    costCenterLabel: string;
    paymentMethodLabel: string;
    amountLabel: string;
    createdAtLabel: string;
    notes: string;
    recordedBy: string;
}

export default function OperatingExpensesView({ expenses, categories, costCenters, employees, companyBankAccounts, suppliers }: OperatingExpensesViewProps) {
    const router = useRouter();
    const [dialogOpen, setDialogOpen] = useState(false);

    const rows: OperatingExpenseRow[] = useMemo(
        () =>
            expenses.map((expense) => ({
                id: expense.id,
                documentNumber: expense.documentNumber,
                categoryName: expense.expenseCategory?.name ?? '—',
                employeeName: expense.payroll?.employeeName ?? '—',
                supplierName: expense.supplier?.name ?? '—',
                costCenterLabel: expense.costCenter
                    ? `${expense.costCenter.name} (${expense.costCenter.code})`
                    : '—',
                paymentMethodLabel: expense.paymentMethod
                    ? PAYMENT_METHOD_LABEL[expense.paymentMethod] ?? expense.paymentMethod
                    : '—',
                amountLabel: currencyFormatter.format(expense.total),
                createdAtLabel: new Date(expense.createdAt).toLocaleString('es-CL'),
                notes: expense.notes ?? '—',
                recordedBy: expense.recordedBy?.userName ?? '—',
            })),
        [expenses],
    );

    const columns: DataGridColumn[] = useMemo(
        () => [
            { field: 'documentNumber', headerName: 'Documento', minWidth: 150, flex: 1 },
            { field: 'categoryName', headerName: 'Categoría', minWidth: 180, flex: 1 },
            { field: 'employeeName', headerName: 'Colaborador', minWidth: 200, flex: 1 },
            { field: 'supplierName', headerName: 'Proveedor', minWidth: 220, flex: 1 },
            { field: 'costCenterLabel', headerName: 'Centro de costos', minWidth: 220, flex: 1 },
            { field: 'paymentMethodLabel', headerName: 'Método de pago', minWidth: 160, flex: 1 },
            {
                field: 'amountLabel',
                headerName: 'Monto',
                minWidth: 140,
                flex: 0.8,
                align: 'left',
                headerAlign: 'left',
            },
            { field: 'createdAtLabel', headerName: 'Fecha', minWidth: 200, flex: 1 },
            { field: 'notes', headerName: 'Notas', minWidth: 240, flex: 1.2 },
            { field: 'recordedBy', headerName: 'Registrado por', minWidth: 180, flex: 1 },
        ],
        [],
    );

    const handleOpenDialog = useCallback(() => {
        setDialogOpen(true);
    }, []);

    const handleCloseDialog = useCallback(() => {
        setDialogOpen(false);
    }, []);

    const handleRefresh = useCallback(() => {
        router.refresh();
    }, [router]);

    return (
        <div className="space-y-6">
            <DataGrid
                title="Historial de gastos operativos"
                columns={columns}
                rows={rows}
                totalRows={rows.length}
                onAddClick={handleOpenDialog}
                height="70vh"
            />

            <OperatingExpensesDialog
                open={dialogOpen}
                onClose={handleCloseDialog}
                onSuccess={handleRefresh}
                categories={categories}
                costCenters={costCenters}
                employees={employees}
                companyBankAccounts={companyBankAccounts}
                suppliers={suppliers}
            />
        </div>
    );
}
