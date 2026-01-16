import HumanResourcesView from './ui/HumanResourcesView';
import { listEmployees } from '@/actions/employees';
import { getBranches } from '@/actions/branches';
import { listCostCenters } from '@/actions/costCenters';
import { listOrganizationalUnits } from '@/actions/organizationalUnits';

export const metadata = {
    title: 'RRHH | FlowStore',
};

export default async function HumanResourcesPage() {
    const [employees, branches, costCenters, organizationalUnits] = await Promise.all([
        listEmployees({ includeTerminated: true }),
        getBranches({ includeInactive: false }),
        listCostCenters({ includeInactive: false }),
        listOrganizationalUnits({ includeInactive: false }),
    ]);

    const branchOptions = branches.map((branch) => ({
        id: branch.id,
        name: branch.name,
        isHeadquarters: Boolean(branch.isHeadquarters),
    }));

    return (
        <div className="space-y-6">
            <HumanResourcesView
                employees={employees}
                branches={branchOptions}
                costCenters={costCenters}
                organizationalUnits={organizationalUnits}
            />
        </div>
    );
}
