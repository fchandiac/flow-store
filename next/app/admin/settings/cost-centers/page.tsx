import { listCostCenters, type CostCenterSummary } from '@/actions/costCenters';
import { getBranches } from '@/actions/branches';
import CostCenterList from './ui/CostCenterList';

export const dynamic = 'force-dynamic';

export default async function CostCentersPage() {
    const [costCenters, branches] = await Promise.all([
        listCostCenters({ includeInactive: true }),
        getBranches({ includeInactive: true }),
    ]);

    const sanitizedCostCenters: CostCenterSummary[] = JSON.parse(JSON.stringify(costCenters));
    const branchOptions = branches.map((branch) => ({
        id: branch.id,
        name: branch.name,
        isActive: branch.isActive,
    }));

    return (
        <div className="flex flex-col gap-6">
            <CostCenterList costCenters={sanitizedCostCenters} branches={branchOptions} />
        </div>
    );
}
