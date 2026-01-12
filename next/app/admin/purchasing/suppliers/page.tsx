'use client';

import SuppliersDataGrid from "./ui/SuppliersDataGrid";

/**
 * Gestión de Proveedores
 * Ruta: /admin/purchasing/suppliers
 * CRUD de proveedores (extensión de Person)
 */
export default function SuppliersPage() {
    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Proveedores</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Administra proveedores, líneas de crédito y datos de contacto.
                </p>
            </div>
            <SuppliersDataGrid />
        </div>
    );
}
