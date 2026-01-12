'use client';

import type { PropsWithChildren } from 'react';
import Tabs, { type TabItem } from '@/app/baseComponents/Tabs/Tabs';

const tabs: TabItem[] = [
    { href: '/admin/purchasing/purchase-orders', label: 'Listado', exact: true },
    { href: '/admin/purchasing/purchase-orders/new', label: 'Nueva orden' },
];

export default function PurchaseOrdersLayout({ children }: PropsWithChildren) {
    return (
        <div className="flex h-full flex-col">
            <header className="bg-white">
                <div className="pt-6 pb-4 space-y-2">
                    <h1 className="text-2xl font-bold">Órdenes de compra</h1>
                    <p className="text-sm text-muted-foreground">
                        Administra las órdenes emitidas a proveedores y crea nuevas solicitudes de compra.
                    </p>
                </div>
                <Tabs items={tabs} basePath="/admin/purchasing/purchase-orders" />
            </header>
            <section className="flex-1 overflow-auto">{children}</section>
        </div>
    );
}
