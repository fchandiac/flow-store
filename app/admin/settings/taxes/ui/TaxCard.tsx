'use client';

import React, { useState } from 'react';
import Badge from '@/app/baseComponents/Badge/Badge';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import DeleteTaxDialog from './DeleteTaxDialog';
import UpdateTaxDialog from './UpdateTaxDialog';

export interface TaxType {
    id: string;
    name: string;
    code: string;
    taxType: 'IVA' | 'EXEMPT' | 'RETENTION' | 'SPECIFIC';
    rate: number;
    description?: string;
    isDefault: boolean;
    isActive: boolean;
    companyId: string;
}

interface TaxCardProps {
    tax: TaxType;
    'data-test-id'?: string;
}

const getTaxTypeLabel = (type: string) => {
    switch (type) {
        case 'IVA': return 'IVA';
        case 'EXEMPT': return 'Exento';
        case 'RETENTION': return 'Retención';
        case 'SPECIFIC': return 'Específico';
        default: return type;
    }
};

const TaxCard: React.FC<TaxCardProps> = ({ tax, 'data-test-id': dataTestId }) => {
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [openUpdateDialog, setOpenUpdateDialog] = useState(false);

    return (
        <article 
            className="border border-neutral-200 bg-white rounded-lg shadow-sm p-4 flex flex-col justify-between min-w-[260px]" 
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
                                percent
                            </span>
                        </div>
                        <div>
                            <h3 className="font-semibold text-neutral-800">{tax.name}</h3>
                            <span className="text-sm text-neutral-500">Código: {tax.code}</span>
                        </div>
                    </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                    <Badge variant="primary-outlined">
                        {getTaxTypeLabel(tax.taxType)}
                    </Badge>
                    {tax.isDefault && (
                        <Badge variant="info-outlined">Por Defecto</Badge>
                    )}
                    <Badge variant={tax.isActive ? 'success-outlined' : 'error-outlined'}>
                        {tax.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                </div>

                {/* Info */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between bg-neutral-50 rounded-lg p-3">
                        <span className="text-sm text-neutral-600">Tasa</span>
                        <span className="text-lg font-bold text-secondary">{tax.rate}%</span>
                    </div>
                    {tax.description && (
                        <p className="text-sm text-neutral-500">{tax.description}</p>
                    )}
                </div>
            </div>

            {/* Acciones */}
            <div className="flex justify-end gap-2 mt-2">
                <IconButton
                    icon="edit"
                    variant="basicSecondary"
                    aria-label="Editar impuesto"
                    onClick={() => setOpenUpdateDialog(true)}
                    data-test-id={`${dataTestId}-edit-button`}
                />
                <IconButton
                    icon="delete"
                    variant="basicSecondary"
                    aria-label="Eliminar impuesto"
                    onClick={() => setOpenDeleteDialog(true)}
                    data-test-id={`${dataTestId}-delete-button`}
                />
            </div>

            {/* Dialogs */}
            <UpdateTaxDialog
                open={openUpdateDialog}
                onClose={() => setOpenUpdateDialog(false)}
                tax={tax}
                data-test-id={`${dataTestId}-update-dialog`}
            />
            
            <DeleteTaxDialog
                open={openDeleteDialog}
                onClose={() => setOpenDeleteDialog(false)}
                tax={tax}
                data-test-id={`${dataTestId}-delete-dialog`}
            />
        </article>
    );
};

export default TaxCard;
