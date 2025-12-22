'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Layout Punto de Venta con Tabs
 * Estructura de navegación para el módulo POS
 */

interface TabItem {
    href: string;
    label: string;
    icon: string;
}

const tabItems: TabItem[] = [
    { href: '/pointOfSale', label: 'Venta', icon: '🛒' },
    { href: '/pointOfSale/cart', label: 'Carrito', icon: '📋' },
    { href: '/pointOfSale/checkout', label: 'Pago', icon: '💳' },
];

export default function PointOfSaleLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    return (
        <div className="flex flex-col h-screen bg-gray-100">
            {/* Top Bar */}
            <header className="bg-white shadow-sm px-6 py-3 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold text-gray-800">FlowStore</h1>
                    <span className="text-sm text-gray-500">Punto de Venta</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">Sucursal: Principal</span>
                    <span className="text-sm text-gray-600">Caja: 01</span>
                    <Link
                        href="/admin"
                        className="text-sm text-blue-600 hover:underline"
                    >
                        Admin
                    </Link>
                    <Link
                        href="/"
                        className="text-sm text-red-600 hover:underline"
                    >
                        Salir
                    </Link>
                </div>
            </header>

            {/* Tab Navigation */}
            <nav className="bg-white border-b px-6">
                <ul className="flex gap-1">
                    {tabItems.map((item) => {
                        const isActive = pathname === item.href;
                        
                        return (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors ${
                                        isActive
                                            ? 'border-blue-500 text-blue-600 bg-blue-50'
                                            : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                                    }`}
                                >
                                    <span>{item.icon}</span>
                                    <span>{item.label}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                {children}
            </main>
        </div>
    );
}
