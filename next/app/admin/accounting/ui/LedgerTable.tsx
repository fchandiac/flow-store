import { getLedgerPreview } from '@/actions/accounting';
import { ACCOUNTING_CURRENCY_FORMAT } from '@/lib/accounting/format';

function LedgerRow({
    id,
    accountCode,
    accountName,
    date,
    reference,
    description,
    debit,
    credit,
    balance,
}: Awaited<ReturnType<typeof getLedgerPreview>>[number]) {
    return (
        <tr key={id} className="border-b border-border/30 text-sm text-slate-800">
            <td className="whitespace-nowrap px-3 py-2 align-top font-mono text-xs text-muted-foreground">{accountCode}</td>
            <td className="px-3 py-2 align-top">{accountName}</td>
            <td className="whitespace-nowrap px-3 py-2 align-top text-xs text-muted-foreground">{new Date(date).toLocaleDateString()}</td>
            <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                <div>{reference}</div>
                {description ? <div className="text-[11px] text-slate-500">{description}</div> : null}
            </td>
            <td className="whitespace-nowrap px-3 py-2 align-top text-right font-semibold text-emerald-700">
                {debit === 0 ? '—' : ACCOUNTING_CURRENCY_FORMAT.format(debit)}
            </td>
            <td className="whitespace-nowrap px-3 py-2 align-top text-right font-semibold text-rose-700">
                {credit === 0 ? '—' : ACCOUNTING_CURRENCY_FORMAT.format(credit)}
            </td>
            <td className="whitespace-nowrap px-3 py-2 align-top text-right font-semibold text-slate-900">
                {ACCOUNTING_CURRENCY_FORMAT.format(balance)}
            </td>
        </tr>
    );
}

export default async function LedgerTable() {
    const movements = await getLedgerPreview();

    if (movements.length === 0) {
        return (
            <div className="flex flex-col gap-4 rounded-lg border border-dashed border-border/50 bg-slate-50 p-6 text-sm text-muted-foreground">
                <p>Aún no existen movimientos contables registrados para el periodo seleccionado.</p>
                <p>
                    Una vez activemos el motor contable dinámico, esta tabla reflejará los asientos generados desde ventas, compras y
                    ajustes manuales.
                </p>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-lg border border-border/40">
            <div className="flex items-center justify-between border-b border-border/40 bg-slate-50 px-4 py-3 text-xs uppercase tracking-wide text-slate-600">
                <span>Previo Diario General</span>
                <span>
                    Saldos expresados en {ACCOUNTING_CURRENCY_FORMAT.resolvedOptions().currency ?? 'CLP'} al último asiento confirmado
                </span>
            </div>
            <div className="max-h-[480px] overflow-auto">
                <table className="min-w-full divide-y divide-border/40">
                    <thead className="bg-slate-100 text-xs uppercase tracking-wide text-muted-foreground">
                        <tr>
                            <th className="px-3 py-2 text-left">Cuenta</th>
                            <th className="px-3 py-2 text-left">Nombre</th>
                            <th className="px-3 py-2 text-left">Fecha</th>
                            <th className="px-3 py-2 text-left">Referencia</th>
                            <th className="px-3 py-2 text-right">Debe</th>
                            <th className="px-3 py-2 text-right">Haber</th>
                            <th className="px-3 py-2 text-right">Saldo</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20 bg-white">
                        {movements.map((movement) => (
                            <LedgerRow key={movement.id} {...movement} />
                        ))}
                    </tbody>
                </table>
            </div>
            <footer className="border-t border-border/40 bg-slate-50 px-4 py-2 text-xs text-muted-foreground">
                Filtraremos por periodo y centro de costo cuando el motor contable esté activo.
            </footer>
        </div>
    );
}
