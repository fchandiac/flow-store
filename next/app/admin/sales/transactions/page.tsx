import SalesTransactionsDataGrid from './ui/SalesTransactionsDataGrid';

/**
 * Gestión de Transacciones
 * Ruta: /admin/sales/transactions
 * Listado de ventas, devoluciones y movimientos con filtros básicos
 */
export default function TransactionsPage() {
    return (
        <div className="p-6 space-y-6">
            <header>
                <h1 className="text-2xl font-bold">Transacciones de venta</h1>
            </header>
            <SalesTransactionsDataGrid />
        </div>
    );
}
