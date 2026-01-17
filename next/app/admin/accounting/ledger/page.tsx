import { Suspense } from 'react';
import LedgerTable from '../ui/LedgerTable';
import AccountingShell from '../ui/AccountingShell';

export const dynamic = 'force-dynamic';

export default function AccountingLedgerPage() {
    return (
        <AccountingShell
            title="Libro mayor"
            description="Consulta movimientos contables derivados de las transacciones operativas."
            infoNotice={null}
        >
            <Suspense fallback={<div className="rounded-lg border border-dashed border-border/60 p-6 text-muted-foreground">Cargando mayor…</div>}>
                <LedgerTable />
            </Suspense>
        </AccountingShell>
    );
}
