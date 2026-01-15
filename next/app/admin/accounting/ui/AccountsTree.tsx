import { getAccountingHierarchy } from '@/actions/accounting';
import { ACCOUNTING_CURRENCY_FORMAT } from '@/lib/accounting/format';

type TreeProps = {
    depth?: number;
};

const depthClasses = ['pl-0', 'pl-4', 'pl-8', 'pl-12', 'pl-16', 'pl-20'];

function NodeRow({ id, code, name, balance, depth }: { id: string; code: string; name: string; balance: number; depth: number }) {
    const padding = depthClasses[Math.min(depth, depthClasses.length - 1)];
    return (
        <div
            key={id}
            className={`grid grid-cols-[minmax(0,1fr)_minmax(0,160px)] items-center border-b border-border/30 py-2 text-sm text-gray-800 ${padding}`}
        >
            <span className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">{code}</span>
                <span>{name}</span>
            </span>
            <span className="text-right font-semibold text-slate-700">
                {ACCOUNTING_CURRENCY_FORMAT.format(balance)}
            </span>
        </div>
    );
}

function renderTree(
    nodes: Awaited<ReturnType<typeof getAccountingHierarchy>>,
    depth: number,
    rows: React.ReactNode[],
) {
    for (const node of nodes) {
        rows.push(
            <NodeRow
                key={node.id}
                id={node.id}
                code={node.code}
                name={node.name}
                balance={node.balance}
                depth={depth}
            />,
        );
        if (node.children.length > 0) {
            renderTree(node.children, depth + 1, rows);
        }
    }
    return rows;
}

export default async function AccountsTree({ depth = 0 }: TreeProps) {
    const hierarchy = await getAccountingHierarchy();
    const content = renderTree(hierarchy, depth, []);

    if (content.length === 0) {
        return (
            <div className="rounded-lg border border-dashed border-border/50 bg-slate-50 p-6 text-sm text-muted-foreground">
                No se encontraron cuentas contables. Verifica que el seed de contabilidad esté ejecutado.
            </div>
        );
    }

    return (
        <div className="flex flex-col rounded-lg border border-border/40">
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,160px)] border-b border-border/40 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                <span>Cuenta</span>
                <span className="text-right">Saldo CLP</span>
            </div>
            <div className="divide-y divide-border/20">
                {content}
            </div>
            <footer className="bg-slate-50 px-4 py-2 text-xs text-muted-foreground">
                Los saldos se recalcularán automáticamente con el motor contable dinámico.
            </footer>
        </div>
    );
}
