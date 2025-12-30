'use client';

import PurchaseOrdersDataGrid from './ui/PurchaseOrdersDataGrid';

/**
 * Listado de órdenes de compra confirmadas/borradores.
 */
export default function PurchaseOrdersPage() {
    return (
        <div className="space-y-6">
            <PurchaseOrdersDataGrid />
        </div>
    );
}
