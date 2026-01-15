import { getAccountingPeriods } from '@/actions/accounting';

function formatRange(start: string, end: string) {
    const locale = 'es-CL';
    return `${new Date(start).toLocaleDateString(locale)} - ${new Date(end).toLocaleDateString(locale)}`;
}

function StatusBadge({ status, locked }: { status: string; locked: boolean }) {
    const base = 'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide';
    if (locked || status.toUpperCase() === 'LOCKED') {
        return <span className={`${base} border-amber-200 bg-amber-50 text-amber-700`}>Bloqueado</span>;
    }
    if (status.toUpperCase() === 'OPEN') {
        return <span className={`${base} border-emerald-200 bg-emerald-50 text-emerald-700`}>Abierto</span>;
    }
    return <span className={`${base} border-slate-200 bg-slate-100 text-slate-700`}>Cerrado</span>;
}

export default async function PeriodsTable() {
    const periods = await getAccountingPeriods();

    if (periods.length === 0) {
        return (
            <div className="rounded-lg border border-dashed border-border/50 bg-slate-50 p-6 text-sm text-muted-foreground">
                Todavía no hay periodos contables. El seed de contabilidad crea periodos trimestrales base para comenzar.
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-lg border border-border/40">
            <table className="min-w-full divide-y divide-border/40">
                <thead className="bg-slate-100 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                        <th className="px-3 py-2 text-left">Periodo</th>
                        <th className="px-3 py-2 text-left">Fechas</th>
                        <th className="px-3 py-2 text-left">Estado</th>
                        <th className="px-3 py-2 text-left">Notas</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border/20 bg-white text-sm text-slate-800">
                    {periods.map((period) => (
                        <tr key={period.id}>
                            <td className="px-3 py-2 font-semibold text-slate-900">{period.name}</td>
                            <td className="px-3 py-2 text-muted-foreground">{formatRange(period.startDate, period.endDate)}</td>
                            <td className="px-3 py-2">
                                <StatusBadge status={period.status} locked={period.locked} />
                            </td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">
                                {period.locked
                                    ? 'Los asientos se pueden visualizar pero no editar hasta reabrir el periodo.'
                                    : period.status.toUpperCase() === 'CLOSED'
                                        ? 'El periodo está cerrado. Reabrir solo con autorización contable.'
                                        : 'Podrás bloquear un periodo para evitar ajustes no controlados.'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
