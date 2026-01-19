import { getBankMovementsOverview } from '@/actions/bankMovements';
import { getCashBalance } from '@/actions/bankAccounts';
import { listShareholders } from '@/actions/shareholders';
import { getCompany } from '@/actions/companies';
import type { PersonBankAccount } from '@/data/entities/Person';
import AccountingShell from '../ui/AccountingShell';
import BankMovementsDashboard from '../ui/BankMovementsDashboard';

export default async function AccountingBankingPage() {
    const [overview, cashBalanceResult, shareholders, company] = await Promise.all([
        getBankMovementsOverview(),
        getCashBalance(),
        listShareholders(),
        getCompany(),
    ]);
    const cashBalance = cashBalanceResult.balance;

    const activeShareholders = shareholders.filter((shareholder) => shareholder.isActive);

    const shareholderOptions = activeShareholders
        .map((shareholder) => ({
            id: shareholder.id,
            label: shareholder.person?.displayName ?? 'Socio sin nombre',
        }))
        .sort((a, b) => a.label.localeCompare(b.label, 'es'));

    const currencyFormatter = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' });

    const bankAccountOptions = Array.isArray(company?.bankAccounts)
        ? company.bankAccounts
              .filter(
                  (account): account is PersonBankAccount & { accountKey: string } =>
                      Boolean(account && account.accountKey),
              )
              .map((account) => {
                  const rawBalance = account.currentBalance;
                  const numericBalance = Number(rawBalance);
                  const hasBalance = Number.isFinite(numericBalance);
                  const parts: string[] = [];
                  if (account.bankName) parts.push(account.bankName);
                  if (account.accountType) parts.push(account.accountType);
                  if (account.accountNumber) parts.push(account.accountNumber);
                  if (hasBalance) {
                      parts.push(`Saldo ${currencyFormatter.format(numericBalance)}`);
                  }
                  return {
                      id: String(account.accountKey),
                      label: parts.length > 0 ? parts.join(' · ') : 'Cuenta bancaria sin descripción',
                      balance: hasBalance ? numericBalance : null,
                  };
              })
              .sort((a, b) => a.label.localeCompare(b.label, 'es'))
        : [];

    return (
        <AccountingShell
            title="Tesoreria y cuentas bancarias"
        >
            <BankMovementsDashboard
                overview={overview}
                cashBalance={cashBalance}
                shareholderOptions={shareholderOptions}
                bankAccountOptions={bankAccountOptions}
            />
        </AccountingShell>
    );
}
