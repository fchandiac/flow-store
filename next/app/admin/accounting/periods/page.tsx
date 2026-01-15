import { Suspense } from 'react';
import PeriodsTable from '../ui/PeriodsTable';
import AccountingShell from '../ui/AccountingShell';

export const dynamic = 'force-dynamic';

export default function AccountingPeriodsPage() {
    return (
        <AccountingShell
            title="Cierres mensuales"
            description="Administra los estados de los períodos contables para blindar modificaciones retroactivas."
        >
            <Suspense fallback={<div className="rounded-lg border border-dashed border-border/60 p-6 text-muted-foreground">Cargando períodos…</div>}>
                <PeriodsTable />
            </Suspense>
        </AccountingShell>
    );
}
