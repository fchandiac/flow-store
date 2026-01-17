import { getLedgerPreview } from '@/actions/accounting';
import LedgerDataGridClient from './LedgerDataGridClient';

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

    return <LedgerDataGridClient rows={movements} />;
}
