import type { BankMovementsOverview, BankMovementRecord } from '@/actions/bankMovements';
import { formatDateTime } from '@/lib/dateTimeUtils';

const upcomingWork = [
    {
        title: 'Conciliacion bancaria asistida',
        detail: 'Comparar extractos bancarios con movimientos ingresados para marcar diferencias.'
    },
    {
        title: 'Reglas automaticas',
        detail: 'Aprende patrones de depositos y los clasifica automaticamente dentro del plan de cuentas.'
    },
    {
        title: 'Integracion con sesiones de caja',
        detail: 'Refleja retiros y depositos diarios de las cajas asociadas a los puntos de venta.'
    }
];

const currencyFormatter = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP'
});

const movementKindLabels: Record<string, string> = {
    CAPITAL_CONTRIBUTION: 'Aporte de capital',
    BANK_TO_CASH_TRANSFER: 'Transferencia a caja',
    CUSTOMER_PAYMENT: 'Cobro registrado',
    SUPPLIER_PAYMENT: 'Pago a proveedor',
    OPERATING_EXPENSE: 'Gasto operativo',
    CASH_DEPOSIT: 'Deposito en banco',
    GENERAL: 'Movimiento general'
};

function formatCurrency(value: number): string {
    return currencyFormatter.format(Number(value || 0));
}

function formatDate(value: string): string {
    return formatDateTime(value);
}

interface ActionCardProps {
    title: string;
    description: string;
    cta: string;
    stat?: string;
}

function ActionCard({ title, description, cta, stat }: ActionCardProps) {
    return (
        <article className="flex h-full flex-col justify-between rounded-xl border border-border/70 bg-white p-5 shadow-sm">
            <header className="space-y-2">
                <h3 className="text-base font-semibold text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
                {stat ? <p className="text-xs font-medium text-muted-foreground">{stat}</p> : null}
            </header>
            <button
                type="button"
                className="mt-6 inline-flex w-fit items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-background transition hover:bg-accent"
            >
                {cta}
            </button>
        </article>
    );
}

function MovementRow({ movement }: { movement: BankMovementRecord }) {
    const directionLabel = movement.direction === 'IN' ? 'Ingreso' : 'Salida';
    const directionTone = movement.direction === 'IN'
        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
        : 'bg-rose-50 text-rose-700 border border-rose-200';

    return (
        <li className="flex flex-col gap-3 rounded-lg border border-border/60 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${directionTone}`}>
                        {directionLabel}
                    </span>
                    <span className="text-sm font-semibold text-foreground">{movement.documentNumber ?? 'Sin folio'}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(movement.createdAt)}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                    {movementKindLabels[movement.movementKind] ?? movement.movementKind}
                </p>
                {movement.counterpartyName ? (
                    <p className="text-xs text-muted-foreground">Contraparte: {movement.counterpartyName}</p>
                ) : null}
                {movement.notes ? (
                    <p className="text-xs text-muted-foreground">Nota: {movement.notes}</p>
                ) : null}
                {movement.recordedBy ? (
                    <p className="text-xs text-muted-foreground">Registrado por {movement.recordedBy}</p>
                ) : null}
            </div>
            <div className="text-right">
                <p className="text-lg font-semibold text-foreground">{formatCurrency(movement.total)}</p>
                <p className="text-xs text-muted-foreground">{movement.bankAccountLabel ?? 'Cuenta sin registrar'}</p>
            </div>
        </li>
    );
}

export default function BankMovementsDashboard({ overview }: { overview: BankMovementsOverview }) {
    const highlightCards = [
        {
            title: 'Saldo proyectado en bancos',
            value: formatCurrency(overview.summary.projectedBalance),
            hint: `Entradas acumuladas ${formatCurrency(overview.summary.incomingTotal)} vs salidas ${formatCurrency(overview.summary.outgoingTotal)}`
        },
        {
            title: 'Ingresos bancarios este mes',
            value: `${overview.summary.monthIncomingCount} movimientos`,
            hint: overview.summary.monthIncomingCount > 0
                ? `Total acreditado ${formatCurrency(overview.summary.monthIncomingTotal)}`
                : 'Aun no has registrado ingresos por transferencia en el mes.'
        },
        {
            title: 'Transferencias a caja',
            value: overview.summary.monthTransfersCount > 0
                ? `${overview.summary.monthTransfersCount} retiros`
                : 'Sin transferencias',
            hint: overview.summary.monthTransfersCount > 0
                ? `Total fondeado ${formatCurrency(overview.summary.monthTransfersTotal)}`
                : 'Planifica retiros desde bancos para fondear sesiones de caja.'
        }
    ];

    const capitalActions = [
        {
            title: 'Registrar aporte de capital',
            description: 'Deposita recursos de socios o inversionistas en una cuenta bancaria de la empresa.',
            cta: 'Registrar aporte',
            stat: overview.summary.monthCapitalCount > 0
                ? `${overview.summary.monthCapitalCount} en el mes · ${formatCurrency(overview.summary.monthCapitalTotal)}`
                : 'Aun no hay aportes registrados este mes'
        },
        {
            title: 'Documentar prestamo entre socios',
            description: 'Identifica entradas de efectivo que deben devolverse posteriormente.',
            cta: 'Documentar prestamo',
            stat: 'Guarda prestamos internos con seguimiento de devolucion.'
        }
    ];

    const treasuryActions = [
        {
            title: 'Transferir a caja operativa',
            description: 'Planifica giros bancarios para fondear cajas chicas o sesiones de POS.',
            cta: 'Planificar transferencia',
            stat: overview.summary.monthTransfersCount > 0
                ? `${overview.summary.monthTransfersCount} planificadas · ${formatCurrency(overview.summary.monthTransfersTotal)}`
                : 'Sin retiros bancarios este mes'
        },
        {
            title: 'Liquidar pendientes con proveedores',
            description: 'Despacha pagos desde la cuenta bancaria y vincula la factura pagada.',
            cta: 'Conciliar pago',
            stat: `${overview.summary.outgoingCount} pagos bancarios acumulados`
        }
    ];

    const recentMovements = overview.recentMovements.slice(0, 12);

    return (
        <div className="flex flex-col gap-8">
            <section>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Resumen inicial</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                    {highlightCards.map((card) => (
                        <div key={card.title} className="rounded-xl border border-border/70 bg-white p-5 shadow-sm">
                            <h3 className="text-sm font-medium text-muted-foreground">{card.title}</h3>
                            <p className="mt-2 text-2xl font-semibold text-foreground">{card.value}</p>
                            <p className="mt-3 text-xs text-muted-foreground">{card.hint}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                    <header className="space-y-1">
                        <h2 className="text-lg font-semibold text-foreground">Movimientos de capital</h2>
                        <p className="text-sm text-muted-foreground">Registra aportes y prestamos entre socios con trazabilidad bancaria.</p>
                    </header>
                    <div className="grid gap-4 sm:grid-cols-2">
                        {capitalActions.map((action) => (
                            <ActionCard key={action.title} {...action} />
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    <header className="space-y-1">
                        <h2 className="text-lg font-semibold text-foreground">Tesoreria operativa</h2>
                        <p className="text-sm text-muted-foreground">Organiza retiros desde bancos y pagos a terceros manteniendo la trazabilidad.</p>
                    </header>
                    <div className="grid gap-4 sm:grid-cols-2">
                        {treasuryActions.map((action) => (
                            <ActionCard key={action.title} {...action} />
                        ))}
                    </div>
                </div>
            </section>

            <section className="space-y-4">
                <header className="space-y-1">
                    <h2 className="text-lg font-semibold text-foreground">Movimientos recientes</h2>
                    <p className="text-sm text-muted-foreground">Repasa los ultimos movimientos bancarios registrados en el sistema.</p>
                </header>
                {recentMovements.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 p-6 text-sm text-muted-foreground">
                        Aun no hay movimientos bancarios registrados. Crea un aporte de capital o documenta un pago bancario para comenzar.
                    </div>
                ) : (
                    <ul className="grid gap-3">
                        {recentMovements.map((movement) => (
                            <MovementRow key={movement.id} movement={movement} />
                        ))}
                    </ul>
                )}
            </section>

            <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
                <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 p-5">
                    <h2 className="text-lg font-semibold text-foreground">Plan maestro de movimientos</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Define la frecuencia de aportes, giros y pagos para estimar flujos mensuales. Esta seccion admitira lineas personalizadas con montos objetivo, responsables y cuentas destino.
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-lg border border-border/60 bg-white/60 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ejemplo</p>
                            <h3 className="mt-1 text-sm font-medium text-foreground">Deposito semanal de ventas</h3>
                            <p className="mt-2 text-xs text-muted-foreground">Transferir excedentes desde caja POS a banco cada lunes para sostener liquidez.</p>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-white/60 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ejemplo</p>
                            <h3 className="mt-1 text-sm font-medium text-foreground">Provision de impuestos</h3>
                            <p className="mt-2 text-xs text-muted-foreground">Reservar porcentaje fijo de ventas en cuenta bancaria especifica.</p>
                        </div>
                    </div>
                </div>

                <aside className="rounded-xl border border-border/70 bg-white p-5 shadow-sm">
                    <h2 className="text-lg font-semibold text-foreground">En pipeline</h2>
                    <ul className="mt-3 space-y-3">
                        {upcomingWork.map((item) => (
                            <li key={item.title} className="rounded-lg border border-border/60 bg-muted/40 p-3">
                                <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                                <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
                            </li>
                        ))}
                    </ul>
                </aside>
            </section>
        </div>
    );
}
