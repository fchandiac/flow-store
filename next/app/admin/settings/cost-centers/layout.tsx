'use client';

import type { PropsWithChildren } from 'react';
import Tabs, { type TabItem } from '@/baseComponents/Tabs/Tabs';

const tabs: TabItem[] = [
    { href: '/admin/settings/cost-centers', label: 'Centros de costo', exact: true },
    { href: '/admin/settings/cost-centers/budgets', label: 'Presupuestos' },
];

export default function CostCentersLayout({ children }: PropsWithChildren) {
    return (
        <div className="flex h-full flex-col gap-6">
            <header className="bg-white">
                <div className="pt-6 pb-4 space-y-2">
                    <h1 className="text-2xl font-bold text-gray-900">Gestión de Centros de Costo</h1>
                    <p className="text-sm text-muted-foreground max-w-3xl">
                        Administra la estructura jerárquica de centros de costo y controla los presupuestos asignados a cada unidad operativa de la compañía.
                    </p>
                </div>
                <Tabs items={tabs} basePath="/admin/settings/cost-centers" />
            </header>
            <section className="flex-1 overflow-auto">{children}</section>
        </div>
    );
}
