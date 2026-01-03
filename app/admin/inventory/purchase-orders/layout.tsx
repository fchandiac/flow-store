'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { PropsWithChildren } from 'react';

const tabs = [
    { href: '/admin/inventory/purchase-orders', label: 'Listado' },
    { href: '/admin/inventory/purchase-orders/new', label: 'Nueva orden' },
];

export default function PurchaseOrdersLayout({ children }: PropsWithChildren) {
    const pathname = usePathname();

    return (
        <div className="p-6 space-y-6">
            <header className="space-y-2">
                <h1 className="text-2xl font-bold">Órdenes de compra</h1>
                <p className="text-sm text-muted-foreground">
                    Administra las órdenes emitidas a proveedores y crea nuevas solicitudes de compra.
                </p>
                <nav className="flex items-center gap-2 mt-4 border-b border-border pb-2">
                    {tabs.map((tab) => {
                        const isActive = pathname === tab.href || (tab.href !== '/admin/inventory/purchase-orders' && pathname.startsWith(tab.href));
                        return (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                    isActive
                                        ? 'bg-secondary text-secondary-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                }`}
                                prefetch
                            >
                                {tab.label}
                            </Link>
                        );
                    })}
                </nav>
            </header>
            <section>{children}</section>
        </div>
    );
}
