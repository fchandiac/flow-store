import { listBudgets } from '@/actions/budgets';
import { getBranches } from '@/actions/branches';
import BudgetsDataGrid from './ui/BudgetsDataGrid';
import { listCostCenters } from '@/actions/costCenters';

export const dynamic = 'force-dynamic';

export default async function CostCenterBudgetsPage() {
    const [budgets, branches, costCenters] = await Promise.all([
        listBudgets(),
        getBranches({ includeInactive: true }),
        listCostCenters({ includeInactive: false }),
    ]);

    const sanitizedBudgets = JSON.parse(JSON.stringify(budgets));
    const branchOptions = branches.map((branch) => ({
        id: branch.id,
        name: branch.name,
        isActive: branch.isActive,
    }));
    const sanitizedCostCenters = JSON.parse(JSON.stringify(costCenters));

    return (
        <div className="flex flex-col gap-6">
            <BudgetsDataGrid
                budgets={sanitizedBudgets}
                branches={branchOptions}
                costCenters={sanitizedCostCenters}
            />
        </div>
    );
}
