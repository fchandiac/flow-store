'use client';

import { useState } from 'react';
import { Button } from '@/app/baseComponents/Button/Button';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import CustomerCard, { CustomerType } from './CustomerCard';
import CreateCustomerDialog from './CreateCustomerDialog';

interface CustomerListProps {
    customers: CustomerType[];
    'data-test-id'?: string;
}

const CustomerList: React.FC<CustomerListProps> = ({ 
    customers, 
    'data-test-id': dataTestId 
}) => {
    const [openCreateDialog, setOpenCreateDialog] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredCustomers = searchTerm
        ? customers.filter(c => {
            const name = c.person.type === 'NATURAL'
                ? `${c.person.firstName} ${c.person.lastName || ''}`
                : c.person.businessName || c.person.firstName;
            return (
                name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.person.documentNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.person.email?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        })
        : customers;

    return (
        <div className="space-y-6" data-test-id={dataTestId}>
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <TextField
                    label=""
                    placeholder="Buscar cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-80"
                    data-test-id="customer-search"
                />
                <Button
                    onClick={() => setOpenCreateDialog(true)}
                    data-test-id="create-customer-button"
                >
                    <span className="material-symbols-outlined mr-2" style={{ fontSize: '1.25rem' }}>
                        person_add
                    </span>
                    Nuevo Cliente
                </Button>
            </div>

            {filteredCustomers.length === 0 ? (
                <div className="text-center py-12 bg-neutral-50 rounded-lg border border-neutral-200">
                    <span className="material-symbols-outlined text-neutral-400 mb-3" style={{ fontSize: '3rem' }}>
                        people
                    </span>
                    <h3 className="text-lg font-medium text-neutral-600">
                        {searchTerm ? 'No se encontraron clientes' : 'No hay clientes'}
                    </h3>
                    <p className="text-neutral-500 mt-1">
                        {searchTerm ? 'Intenta con otro término de búsqueda' : 'Crea el primer cliente para comenzar'}
                    </p>
                </div>
            ) : (
                <>
                    <div className="text-sm text-neutral-500">
                        Mostrando {filteredCustomers.length} de {customers.length} clientes
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredCustomers.map((customer) => (
                            <CustomerCard
                                key={customer.id}
                                customer={customer}
                                data-test-id={`customer-card-${customer.id}`}
                            />
                        ))}
                    </div>
                </>
            )}

            <CreateCustomerDialog
                open={openCreateDialog}
                onClose={() => setOpenCreateDialog(false)}
                data-test-id="create-customer-dialog"
            />
        </div>
    );
};

export default CustomerList;
