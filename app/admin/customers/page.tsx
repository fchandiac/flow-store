import React from 'react';
import { getCustomers } from '@/app/actions/customers';
import { CustomerList } from './ui';

/**
 * Gestión de Clientes
 * Ruta: /admin/customers
 * CRUD de clientes (extensión de Person)
 */
export default async function CustomersPage() {
    const result = await getCustomers();
    const customers = result.data || [];

    return (
        <div className="flex flex-col h-full">
            <CustomerList customers={customers} />
        </div>
    );
}
