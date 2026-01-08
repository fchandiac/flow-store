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
        <div className="flex h-full flex-col">
            <header className="bg-white shadow-sm">
                <div className="px-6 pt-6 pb-4 space-y-2">
                    <h1 className="text-2xl font-bold">Órdenes de compra</h1>
                    <p className="text-sm text-muted-foreground">
                        Administra las órdenes emitidas a proveedores y crea nuevas solicitudes de compra.
                    </p>
                </div>
                <nav className="flex border-b border-gray-200 px-6">
                    {tabs.map((tab) => {
                        const isActive =
                            pathname === tab.href ||
                            (tab.href !== '/admin/inventory/purchase-orders' && pathname.startsWith(tab.href));
                        return (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                className={`-mb-px inline-flex items-center border-b-2 px-6 py-3 text-sm font-medium transition-colors ${
                                    isActive
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                }`}
                                aria-current={isActive ? 'page' : undefined}
                                prefetch
                            >
                                {tab.label}
                            </Link>
                        );
                    })}
                </nav>
            </header>
            <section className="flex-1 overflow-auto bg-gray-50 p-6">{children}</section>
        </div>
    );
}
