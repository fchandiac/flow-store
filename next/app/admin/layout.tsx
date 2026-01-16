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
        url: '/admin',
    },
    {
        id: 'ventas',
        label: 'Ventas',
        children: [
            { id: 'transactions', label: 'Transacciones', url: '/admin/sales/transactions' },
            { id: 'customers', label: 'Clientes', url: '/admin/sales/customers' },
        ],
    },
    {
        id: 'inventario',
        label: 'Inventario',
        children: [
            { id: 'products', label: 'Productos', url: '/admin/inventory/products' },
            { id: 'categories', label: 'Categorías', url: '/admin/inventory/products/categories' },
            { id: 'stock', label: 'Stock', url: '/admin/inventory/stock' },
        ],
    },
    {
        id: 'accounting',
        label: 'Contabilidad',
        children: [
            { id: 'acc-explorer', label: 'Explorador de Cuentas', url: '/admin/accounting/chart' },
            { id: 'acc-ledger', label: 'Libro Mayor', url: '/admin/accounting/ledger' },
            { id: 'acc-reports', label: 'Estados Financieros', url: '/admin/accounting/reports' },
            { id: 'acc-periods', label: 'Cierres Mensuales', url: '/admin/accounting/periods' },
        ],
    },
    {
        id: 'purchasing',
        label: 'Compras',
        children: [
            { id: 'purchase-orders', label: 'Órdenes de compra', url: '/admin/purchasing/purchase-orders' },
            { id: 'receptions', label: 'Recepción de productos', url: '/admin/purchasing/receptions' },
            { id: 'suppliers', label: 'Proveedores', url: '/admin/purchasing/suppliers' },
            { id: 'supplier-payments', label: 'Pagos a proveedores', url: '/admin/purchasing/supplier-payments' },
        ],
    },
    {
        id: 'expenses',
        label: 'Gastos',
        children: [
            { id: 'operating-expenses', label: 'Gastos operativos', url: '/admin/expenses/operating' },
        ],
    },
    {
        id: 'human-resources',
        label: 'RRHH',
        url: '/admin/human-resources',
    },
    {
        id: 'caja',
        label: 'Caja',
        children: [
            { id: 'cash-sessions', label: 'Sesiones de Caja', url: '/admin/cash-sessions' },
            { id: 'cash-reports', label: 'Cortes de Caja', url: '/admin/cash-reports' },
        ],
    },
    {
        id: 'reportes',
        label: 'Reportes',
        url: '/admin/reports',
    },
    {
        id: 'configuracion',
        label: 'Configuración',
        children: [
            { id: 'company', label: 'Empresa', url: '/admin/settings/company' },
            { id: 'branches', label: 'Sucursales', url: '/admin/settings/branches' },
            { id: 'cost-centers', label: 'Centros de Costos', url: '/admin/settings/cost-centers' },
            { id: 'storages', label: 'Almacenes', url: '/admin/settings/storages' },
            { id: 'points-of-sale', label: 'Puntos de Venta', url: '/admin/settings/points-of-sale' },
            { id: 'users', label: 'Usuarios', url: '/admin/settings/users' },
            { id: 'taxes', label: 'Impuestos', url: '/admin/settings/taxes' },
            { id: 'price-lists', label: 'Listas de Precios', url: '/admin/settings/price-lists' },
            { id: 'attributes', label: 'Atributos', url: '/admin/settings/attributes' },
            { id: 'units', label: 'Unidades', url: '/admin/settings/units' },
        ],
    },
    {
        id: 'auditoria',
        label: 'Auditoría',
        url: '/admin/audit',
    },
    {
        id: 'showcases',
        label: 'Showcases',
        url: '/admin/showcases',
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