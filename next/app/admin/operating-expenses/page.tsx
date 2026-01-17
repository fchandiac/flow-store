import OperatingExpensesTabs from './ui/OperatingExpensesTabs';
import { listOperatingExpenses } from '@/actions/operatingExpenses';
import { listOperatingExpenseCategories } from '@/actions/expenseCategories';
import { listCostCenters } from '@/actions/costCenters';
import { listEmployees } from '@/actions/employees';
import { getCompany } from '@/actions/companies';
import type { PersonBankAccount } from '@/data/entities/Person';

export const metadata = {
    title: 'Gastos operativos | FlowStore',
};

export default async function OperatingExpensesPage() {
    const [expenses, categories, costCenters, employees, company] = await Promise.all([
        listOperatingExpenses(50),
        listOperatingExpenseCategories(),
        listCostCenters({ includeInactive: false }),
        listEmployees({ includeTerminated: false, limit: 200 }),
        getCompany(),
    ]);

    const companyBankAccounts = ((company?.bankAccounts ?? []).filter((account) => Boolean(account?.accountKey)) ?? []) as PersonBankAccount[];

    return (
        <OperatingExpensesTabs
            expenses={expenses}
            categories={categories}
            costCenters={costCenters}
            employees={employees}
            companyBankAccounts={companyBankAccounts}
        />
    );
}
