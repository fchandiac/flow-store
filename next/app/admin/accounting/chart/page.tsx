import { Suspense } from 'react';
import AccountsTree from '../ui/AccountsTree';
import AccountingShell from '../ui/AccountingShell';

export const dynamic = 'force-dynamic';

export default function AccountingChartPage() {
    return (
        <AccountingShell
            title="Explorador de cuentas"
            description="Visualiza la jerarquía contable y sus saldos de manera dinámica, en formato solo lectura."
        >
            <Suspense fallback={<div className="rounded-lg border border-dashed border-border/60 p-6 text-muted-foreground">Cargando plan de cuentas…</div>}>
                <AccountsTree />
            </Suspense>
        </AccountingShell>
    );
}
