'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Layout Admin con SideBar
 * Estructura de navegación para el módulo de administración
 */

interface NavItem {
    href: string;
    label: string;
    icon: string;
}

const navItems: NavItem[] = [
    { href: '/admin', label: 'Dashboard', icon: '📊' },
    { href: '/admin/persons', label: 'Personas', icon: '👥' },
    { href: '/admin/users', label: 'Usuarios', icon: '👤' },
    { href: '/admin/customers', label: 'Clientes', icon: '🛒' },
    { href: '/admin/suppliers', label: 'Proveedores', icon: '🚚' },
    { href: '/admin/products', label: 'Productos', icon: '📦' },
    { href: '/admin/inventory', label: 'Inventario', icon: '📋' },
    { href: '/admin/reports', label: 'Reportes', icon: '📈' },
    { href: '/admin/settings', label: 'Configuración', icon: '⚙️' },
    { href: '/admin/audit', label: 'Auditoría', icon: '📝' },
];

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <aside className="w-64 bg-white shadow-md">
                {/* Logo */}
                <div className="p-4 border-b">
                    <h1 className="text-xl font-bold text-gray-800">FlowStore</h1>
                    <p className="text-sm text-gray-500">Administración</p>
                </div>

                {/* Navigation */}
                <nav className="p-4">
                    <ul className="space-y-2">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href || 
                                (item.href !== '/admin' && pathname.startsWith(item.href));
                            
                            return (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                                            isActive
                                                ? 'bg-blue-50 text-blue-600'
                                                : 'text-gray-600 hover:bg-gray-50'
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

                {/* Logout button at bottom */}
                <div className="absolute bottom-0 w-64 p-4 border-t">
                    <Link
                        href="/"
                        className="flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <span>🚪</span>
                        <span>Cerrar Sesión</span>
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                {/* Top Bar */}
                <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
                    <div>
                        {/* Breadcrumb o título dinámico */}
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">👤 Admin</span>
                    </div>
                </header>

                {/* Page Content */}
                <div className="p-6">
                    {children}
                </div>
            </main>
        </div>
    );
}
