'use client';

import dynamic from 'next/dynamic';

const InventoryDataGrid = dynamic(() => import('./ui/InventoryDataGrid'));

/**
 * Inventario y Stock
 * Ruta: /admin/inventory
 * Visualización de stock por almacén, variantes y movimientos recientes
 */
export default function InventoryPage() {
    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Inventario</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Consulta existencias por variante, filtra por sucursal o bodega y revisa los últimos movimientos.
                </p>
            </div>
            <InventoryDataGrid />
        </div>
    );
}
