'use client';

import CustomersDataGrid from "./ui/CustomersDataGrid";

/**
 * Gestión de Clientes
 * Ruta: /admin/sales/customers
 * CRUD de clientes (extensión de Person)
 */
export default function CustomersPage() {
    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Clientes</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Administra información de clientes, líneas de crédito y contactos comerciales.
                </p>
            </div>
            <CustomersDataGrid />
        </div>
    );
}
