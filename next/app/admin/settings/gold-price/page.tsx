'use client';

import GoldPriceManagement from './ui/GoldPriceManagement';

export default function GoldPricePage() {
    return (
        <div className="p-6 space-y-6 max-w-6xl mx-auto">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Precio del Oro</h1>
                <p className="text-muted-foreground">
                    Gestiona el valor de referencia del oro para el cálculo automático de precios en productos y tasaciones.
                </p>
            </div>

            <div className="bg-card rounded-lg border shadow-sm p-6">
                <GoldPriceManagement />
            </div>
        </div>
    );
}
