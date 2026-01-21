import AccountsReceivableDataGrid from './ui/AccountsReceivableDataGrid';

/**
 * Gestión de Cuentas por Cobrar
 * Ruta: /admin/sales/accounts-receivable
 * Listado de créditos internos pendientes y sus cuotas
 */
export default function AccountsReceivablePage() {
    return (
        <div className="p-6 space-y-6">
            <header>
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold">Cuentas por Cobrar</h1>
                        <p className="text-sm text-neutral-500 mt-1">
                            Seguimiento de créditos otorgados y pagos pendientes por cuotas.
                        </p>
                    </div>
                </div>
            </header>
            <AccountsReceivableDataGrid />
        </div>
    );
}
