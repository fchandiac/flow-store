'use client';

import ReceivedPaymentsDataGrid from './ui/ReceivedPaymentsDataGrid';

export default function ReceivedPaymentsPage() {
  return (
    <div className="p-6 space-y-6 bg-neutral-50 min-h-[calc(100vh-4rem)]">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Pagos recibidos</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Controla los ingresos confirmados en caja y banca. Filtra por fecha, método de pago y punto de venta para revisar el impacto contable de cada movimiento.
        </p>
      </div>
      <ReceivedPaymentsDataGrid />
    </div>
  );
}
