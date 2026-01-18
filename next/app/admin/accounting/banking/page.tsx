import { getBankMovementsOverview } from '@/actions/bankMovements';
import { getCashBalance } from '@/actions/bankAccounts';
import AccountingShell from '../ui/AccountingShell';
import BankMovementsDashboard from '../ui/BankMovementsDashboard';

export default async function AccountingBankingPage() {
    const [overview, cashBalanceResult] = await Promise.all([
        getBankMovementsOverview(),
        getCashBalance(),
    ]);
    const cashBalance = cashBalanceResult.balance;

    return (
        <AccountingShell
            title="Tesoreria y cuentas bancarias"
            description="Coordina aportes de capital, transferencias y otros movimientos entre bancos y cajas internas. Esta vista se enfoca en la preparacion operativa antes de registrar los asientos contables."
            infoNotice="Punto de partida para planificar integraciones con bancos y vincularlas al plan de cuentas."
        >
            <BankMovementsDashboard overview={overview} cashBalance={cashBalance} />
        </AccountingShell>
    );
}
