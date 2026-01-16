import OperatingExpensesView from './ui/OperatingExpensesView';
import { listOperatingExpenses, listOperatingExpenseCategories } from '@/actions/operatingExpenses';
import { listCostCenters } from '@/actions/costCenters';

export const metadata = {
    title: 'Gastos operativos | FlowStore',
};

export default async function OperatingExpensesPage() {
    const [expenses, categories, costCenters] = await Promise.all([
        listOperatingExpenses(50),
        listOperatingExpenseCategories(),
        listCostCenters({ includeInactive: false }),
    ]);

    return (
        <div className="space-y-6">
            <OperatingExpensesView
                expenses={expenses}
                categories={categories}
                costCenters={costCenters}
            />
        </div>
    );
}
