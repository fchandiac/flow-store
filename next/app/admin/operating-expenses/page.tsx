import OperatingExpensesTabs from './ui/OperatingExpensesTabs';
import { listOperatingExpenses } from '@/actions/operatingExpenses';
import { listOperatingExpenseCategories } from '@/actions/expenseCategories';
import { listCostCenters } from '@/actions/costCenters';
import { listEmployees } from '@/actions/employees';
import { getCompany } from '@/actions/companies';
import { getSuppliers } from '@/actions/suppliers';
import type { PersonBankAccount } from '@/data/entities/Person';
import type { SupplierOption } from './ui/OperatingExpensesView';

export const metadata = {
    title: 'Gastos operativos | FlowStore',
};

export default async function OperatingExpensesPage() {
    const [expenses, categories, costCenters, employees, company, suppliers] = await Promise.all([
        listOperatingExpenses(50),
        listOperatingExpenseCategories(),
        listCostCenters({ includeInactive: false }),
        listEmployees({ includeTerminated: false, limit: 200 }),
        getCompany(),
        getSuppliers({ isActive: true }),
    ]);

    const companyBankAccounts = ((company?.bankAccounts ?? []).filter((account) => Boolean(account?.accountKey)) ?? []) as PersonBankAccount[];

    const supplierOptions: SupplierOption[] = suppliers
        .map((supplier) => {
            const person = supplier.person;
            let name = person?.businessName?.trim() ?? '';
            if (!name) {
                const parts = [person?.firstName, person?.lastName]
                    .map((value) => value?.trim())
                    .filter((value): value is string => Boolean(value));
                if (parts.length) {
                    name = parts.join(' ');
                }
            }
            if (!name && supplier.alias) {
                name = supplier.alias;
            }
            if (!name) {
                name = 'Proveedor sin nombre';
            }

            return {
                id: supplier.id,
                label: name,
                documentNumber: person?.documentNumber ?? null,
                alias: supplier.alias ?? null,
                paymentTermDays: Number.isFinite(Number(supplier.defaultPaymentTermDays))
                    ? Number(supplier.defaultPaymentTermDays)
                    : null,
            } satisfies SupplierOption;
        })
        .sort((a, b) => a.label.localeCompare(b.label, 'es'));

    return (
        <OperatingExpensesTabs
            expenses={expenses}
            categories={categories}
            costCenters={costCenters}
            employees={employees}
            companyBankAccounts={companyBankAccounts}
            suppliers={supplierOptions}
        />
    );
}
