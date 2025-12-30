'use client';

import React, { useState } from 'react';
import Badge from '@/app/baseComponents/Badge/Badge';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import DeleteCustomerDialog from './DeleteCustomerDialog';
import UpdateCustomerDialog from './UpdateCustomerDialog';
import type { CustomerWithPerson } from './types';

interface CustomerCardProps {
    customer: CustomerWithPerson;
    'data-test-id'?: string;
}

const getCustomerTypeLabel = (type: string) => {
    switch (type) {
        case 'RETAIL': return 'Minorista';
        case 'WHOLESALE': return 'Mayorista';
        case 'VIP': return 'VIP';
        default: return type;
    }
};

const getCustomerTypeVariant = (type: string): 'primary-outlined' | 'secondary-outlined' | 'success-outlined' => {
    switch (type) {
        case 'RETAIL': return 'primary-outlined';
        case 'WHOLESALE': return 'secondary-outlined';
        case 'VIP': return 'success-outlined';
        default: return 'primary-outlined';
    }
};

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
};

const CustomerCard: React.FC<CustomerCardProps> = ({ customer, 'data-test-id': dataTestId }) => {
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [openUpdateDialog, setOpenUpdateDialog] = useState(false);

    const displayName = customer.person.type === 'NATURAL'
        ? `${customer.person.firstName} ${customer.person.lastName || ''}`.trim()
        : customer.person.businessName || customer.person.firstName;

    return (
        <article 
            className="border border-neutral-200 bg-white rounded-lg shadow-sm p-4 flex flex-col justify-between min-w-[280px]" 
            data-test-id={dataTestId}
        >
            <div className="flex flex-col gap-3">
                {/* Header con icono */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-neutral-100 border-2 border-secondary flex items-center justify-center">
                            <span 
                                className="material-symbols-outlined text-secondary" 
                                style={{ fontSize: '1.5rem' }}
                            >
                                {customer.person.type === 'NATURAL' ? 'person' : 'business'}
                            </span>
                        </div>
                        <div>
                            <h3 className="font-semibold text-neutral-800">{displayName}</h3>
                            {customer.code && (
                                <span className="text-sm text-neutral-500">Código: {customer.code}</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                    <Badge variant={getCustomerTypeVariant(customer.customerType)}>
                        {getCustomerTypeLabel(customer.customerType)}
                    </Badge>
                    <Badge variant={customer.isActive ? 'success-outlined' : 'error-outlined'}>
                        {customer.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                </div>

                {/* Info */}
                <div className="space-y-2 text-sm text-neutral-600">
                    {customer.person.documentNumber && (
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
                                badge
                            </span>
                            <span>{customer.person.documentType || 'RUT'}: {customer.person.documentNumber}</span>
                        </div>
                    )}
                    {customer.person.email && (
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
                                email
                            </span>
                            <span className="truncate">{customer.person.email}</span>
                        </div>
                    )}
                    {customer.person.phone && (
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
                                phone
                            </span>
                            <span>{customer.person.phone}</span>
                        </div>
                    )}
                    {customer.creditLimit > 0 && (
                        <div className="flex items-center justify-between bg-neutral-50 rounded-lg p-2 mt-2">
                            <span>Crédito:</span>
                            <span className="font-medium">{formatCurrency(customer.creditLimit)}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Acciones */}
            <div className="flex justify-end gap-2 mt-2">
                <IconButton
                    icon="edit"
                    variant="basicSecondary"
                    aria-label="Editar cliente"
                    onClick={() => setOpenUpdateDialog(true)}
                    data-test-id={`${dataTestId}-edit-button`}
                />
                <IconButton
                    icon="delete"
                    variant="basicSecondary"
                    aria-label="Eliminar cliente"
                    onClick={() => setOpenDeleteDialog(true)}
                    data-test-id={`${dataTestId}-delete-button`}
                />
            </div>

            {/* Dialogs */}
            <UpdateCustomerDialog
                open={openUpdateDialog}
                onClose={() => setOpenUpdateDialog(false)}
                customer={customer}
                data-test-id={`${dataTestId}-update-dialog`}
            />
            
            <DeleteCustomerDialog
                open={openDeleteDialog}
                onClose={() => setOpenDeleteDialog(false)}
                customer={customer}
                data-test-id={`${dataTestId}-delete-dialog`}
            />
        </article>
    );
};

export default CustomerCard;
