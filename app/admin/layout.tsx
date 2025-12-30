'use client';

import TopBar from '@/app/baseComponents/TopBar/TopBar';
import { SideBarMenuItem } from '@/app/baseComponents/TopBar/SideBar';

/**
 * Layout Admin con TopBar y SideBar de baseComponents
 * Estructura de navegación para el módulo de administración
 */

const menuItems: SideBarMenuItem[] = [
    { 
        id: 'dashboard',
        label: 'Inicio', 
        url: '/admin'
    },
    { 
        id: 'ventas',
        label: 'Ventas',
        children: [
            { id: 'transactions', label: 'Transacciones', url: '/admin/transactions' },
            { id: 'customers', label: 'Clientes', url: '/admin/customers' },
        ]
    },
    { 
        id: 'inventario',
        label: 'Inventario',
        children: [
            { id: 'products', label: 'Productos', url: '/admin/products' },
            { id: 'variants', label: 'Variantes', url: '/admin/products/variants' },
            { id: 'categories', label: 'Categorías', url: '/admin/products/categories' },
            { id: 'stock', label: 'Stock', url: '/admin/inventory' },
            { id: 'purchase-orders', label: 'Órdenes de compra', url: '/admin/purchase-orders' },
            { id: 'suppliers', label: 'Proveedores', url: '/admin/suppliers' },
        ]
    },
    { 
        id: 'caja',
        label: 'Caja',
        children: [
            { id: 'cash-sessions', label: 'Sesiones de Caja', url: '/admin/cash-sessions' },
            { id: 'cash-reports', label: 'Cortes de Caja', url: '/admin/cash-reports' },
        ]
    },
    { 
        id: 'reportes',
        label: 'Reportes', 
        url: '/admin/reports'
    },
    { 
        id: 'configuracion',
        label: 'Configuración',
        children: [
            { id: 'company', label: 'Empresa', url: '/admin/settings/company' },
            { id: 'branches', label: 'Sucursales', url: '/admin/settings/branches' },
            { id: 'points-of-sale', label: 'Puntos de Venta', url: '/admin/settings/points-of-sale' },
            { id: 'users', label: 'Usuarios', url: '/admin/users' },
            { id: 'taxes', label: 'Impuestos', url: '/admin/settings/taxes' },
            { id: 'price-lists', label: 'Listas de Precios', url: '/admin/settings/price-lists' },
            { id: 'attributes', label: 'Atributos', url: '/admin/settings/attributes' },
        ]
    },
    { 
        id: 'auditoria',
        label: 'Auditoría', 
        url: '/admin/audit'
    },
    { 
        id: 'showcases',
        label: 'Showcases', 
        url: '/admin/showcases'
    },
];

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-white">
            {/* TopBar con SideBar integrado */}
            <TopBar
                title="FlowStore Admin"
                logoSrc="/logo.png"
                menuItems={menuItems}
                showUserButton={true}
            />

            {/* Main Content - con padding-top para el TopBar fijo */}
            <main className="pt-16 p-6">
                {children}
            </main>
        </div>
    );
}