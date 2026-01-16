import PeriodsTable from '../ui/PeriodsTable';
import AccountingShell from '../ui/AccountingShell';
import { getAccountingPeriods } from '@/actions/accounting';

export const dynamic = 'force-dynamic';

export default async function AccountingPeriodsPage() {
    const periods = await getAccountingPeriods();

    return (
        <AccountingShell
            title="Cierres mensuales"
            description="Administra los estados de los períodos contables para blindar modificaciones retroactivas."
        >
            <PeriodsTable periods={periods} />
        </AccountingShell>
    );
}
