import { getFinancialReportSummary } from '@/actions/accounting';
import { ACCOUNTING_CURRENCY_FORMAT } from '@/lib/accounting/format';

export default async function FinancialReports() {
    const summary = await getFinancialReportSummary();

    const hasBalanceData = summary.balanceSheet.some((item) => item.amount !== 0);
    const hasIncomeData =
        summary.incomeStatement.ingresos !== 0 ||
        summary.incomeStatement.egresos !== 0 ||
        summary.incomeStatement.resultado !== 0;

    if (!hasBalanceData && !hasIncomeData) {
        return (
            <div className="rounded-lg border border-dashed border-border/50 bg-slate-50 p-6 text-sm text-muted-foreground">
                Los reportes financieros aparecerán aquí cuando se active el motor contable dinámico y existan periodos cerrados.
            </div>
        );
    }

    const incomeRows = [
        { label: 'Ingresos', value: summary.incomeStatement.ingresos, highlight: false },
        { label: 'Egresos', value: summary.incomeStatement.egresos, highlight: false },
        { label: 'Resultado Neto', value: summary.incomeStatement.resultado, highlight: true },
    ];

    return (
        <div className="grid gap-6 md:grid-cols-2">
            <section className="flex flex-col gap-3 rounded-lg border border-border/40 bg-white p-4 shadow-sm">
                <header className="flex items-center justify-between text-sm font-semibold text-slate-700">
                    <span>Balance General</span>
                    <span className="text-xs uppercase text-muted-foreground">Último cierre calculado</span>
                </header>
                <div className="grid gap-2">
                    {summary.balanceSheet.map((item) => (
                        <div key={item.group} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{item.group}</span>
                            <span className="font-semibold text-slate-900">
                                {ACCOUNTING_CURRENCY_FORMAT.format(item.amount)}
                            </span>
                        </div>
                    ))}
                </div>
                <footer className="text-xs text-muted-foreground">
                    Las variaciones se recalculan en tiempo real con el motor contable dinámico.
                </footer>
            </section>

            <section className="flex flex-col gap-3 rounded-lg border border-border/40 bg-white p-4 shadow-sm">
                <header className="flex items-center justify-between text-sm font-semibold text-slate-700">
                    <span>Estado de Resultados</span>
                    <span className="text-xs uppercase text-muted-foreground">Período en curso</span>
                </header>
                <div className="grid gap-2">
                    {incomeRows.map((row) => (
                        <div key={row.label} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{row.label}</span>
                            <span className={row.highlight ? 'font-semibold text-slate-900' : 'text-slate-800'}>
                                {ACCOUNTING_CURRENCY_FORMAT.format(row.value)}
                            </span>
                        </div>
                    ))}
                </div>
                <footer className="text-xs text-muted-foreground">
                    Incorporaremos comparativas vs presupuesto y periodos anteriores en la siguiente fase.
                </footer>
            </section>
        </div>
    );
}
