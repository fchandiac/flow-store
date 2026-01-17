'use client';

import CashSessionsDataGrid from './ui/CashSessionsDataGrid';

export default function CashSessionsPage() {
  return (
    <div className="p-6 space-y-6 bg-neutral-50 min-h-[calc(100vh-4rem)]">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Sesiones de caja</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Monitorea aperturas y cierres por punto de venta. Utiliza los filtros para identificar rápidamente
          qué turnos siguen abiertos o si existen diferencias al momento de cuadrar la caja.
        </p>
      </div>
      <CashSessionsDataGrid />
    </div>
  );
}
