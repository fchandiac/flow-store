import { Suspense } from 'react';
import FinancialReports from '../ui/FinancialReports';
import AccountingShell from '../ui/AccountingShell';

export const dynamic = 'force-dynamic';

export default function AccountingReportsPage() {
    return (
        <AccountingShell
            title="Estados financieros"
            description="Balances y estados de resultados calculados en línea con filtros por centro de costos."
        >
            <Suspense fallback={<div className="rounded-lg border border-dashed border-border/60 p-6 text-muted-foreground">Cargando reportes…</div>}>
                <FinancialReports />
            </Suspense>
        </AccountingShell>
    );
}
