'use client';

import { Suspense } from 'react';
import DotProgress from '@/app/baseComponents/DotProgress/DotProgress';
import TransactionsTable from './ui/TransactionsTable';

/**
 * Gestión de Transacciones
 * Ruta: /admin/sales/transactions
 * Listado de ventas, devoluciones y movimientos con filtros básicos
 */
export default function TransactionsPage() {
    return (
        <div className="p-6 space-y-6">
            <header>
                <h1 className="text-2xl font-bold">Transacciones</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Consulta operaciones de venta, devoluciones y movimientos de inventario asociados.
                </p>
            </header>
            <Suspense fallback={<div className="flex justify-center py-10"><DotProgress /></div>}>
                <TransactionsTable />
            </Suspense>
        </div>
    );
}
