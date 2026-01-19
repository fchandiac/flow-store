import { getAccountingHierarchy } from '@/actions/accounting';
import AccountsTreeClient from './AccountsTreeClient';

type TreeProps = {
    depth?: number;
};

export default async function AccountsTree({ depth = 0 }: TreeProps) {
    const hierarchy = await getAccountingHierarchy();

    if (hierarchy.length === 0) {
        return (
            <div className="rounded-lg border border-dashed border-border/50 bg-slate-50 p-6 text-sm text-muted-foreground">
                No se encontraron cuentas contables. Verifica que el seed de contabilidad esté ejecutado.
            </div>
        );
    }

    return <AccountsTreeClient hierarchy={hierarchy} baseDepth={depth} />;
}
