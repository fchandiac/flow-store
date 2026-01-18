import { getBankMovementsOverview } from '@/actions/bankMovements';
import AccountingShell from '../ui/AccountingShell';
import BankMovementsDashboard from '../ui/BankMovementsDashboard';

export default async function AccountingBankingPage() {
    const overview = await getBankMovementsOverview();

    return (
        <AccountingShell
            title="Tesoreria y cuentas bancarias"
            description="Coordina aportes de capital, transferencias y otros movimientos entre bancos y cajas internas. Esta vista se enfoca en la preparacion operativa antes de registrar los asientos contables."
            infoNotice="Punto de partida para planificar integraciones con bancos y vincularlas al plan de cuentas."
            actions={(
                <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted"
                >
                    Configurar cuentas bancarias
                </button>
            )}
        >
            <BankMovementsDashboard overview={overview} />
        </AccountingShell>
    );
}
