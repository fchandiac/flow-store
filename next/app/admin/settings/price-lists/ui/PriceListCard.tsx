'use client';

import React, { useState } from 'react';
import Badge from '@/app/baseComponents/Badge/Badge';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import DeletePriceListDialog from './DeletePriceListDialog';
import UpdatePriceListDialog from './UpdatePriceListDialog';

export interface PriceListType {
    id: string;
    name: string;
    priceListType: 'RETAIL' | 'WHOLESALE' | 'VIP' | 'PROMOTIONAL';
    currency: string;
    validFrom?: string;
    validUntil?: string;
    priority: number;
    isDefault: boolean;
    isActive: boolean;
    description?: string;
}

interface PriceListCardProps {
    priceList: PriceListType;
    'data-test-id'?: string;
}

const getPriceListTypeLabel = (type: string) => {
    switch (type) {
        case 'RETAIL': return 'Minorista';
        case 'WHOLESALE': return 'Mayorista';
        case 'VIP': return 'VIP';
        case 'PROMOTIONAL': return 'Promocional';
        default: return type;
    }
};

const getPriceListTypeVariant = (type: string): 'primary-outlined' | 'secondary-outlined' | 'success-outlined' | 'warning-outlined' => {
    switch (type) {
        case 'RETAIL': return 'primary-outlined';
        case 'WHOLESALE': return 'secondary-outlined';
        case 'VIP': return 'success-outlined';
        case 'PROMOTIONAL': return 'warning-outlined';
        default: return 'primary-outlined';
    }
};

const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('es-CL');
};

const PriceListCard: React.FC<PriceListCardProps> = ({ priceList, 'data-test-id': dataTestId }) => {
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
                                sell
                            </span>
                        </div>
                        <div>
                            <h3 className="font-semibold text-neutral-800">{priceList.name}</h3>
                        </div>
                    </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                    <Badge variant={getPriceListTypeVariant(priceList.priceListType)}>
                        {getPriceListTypeLabel(priceList.priceListType)}
                    </Badge>
                    {priceList.isDefault && (
                        <Badge variant="info-outlined">Por Defecto</Badge>
                    )}
                    <Badge variant={priceList.isActive ? 'success-outlined' : 'error-outlined'}>
                        {priceList.isActive ? 'Activa' : 'Inactiva'}
                    </Badge>
                </div>

                {/* Info */}
                <div className="space-y-2 text-sm text-neutral-600">
                    <div className="flex items-center justify-between">
                        <span>Prioridad:</span>
                        <span className="font-medium">{priceList.priority}</span>
                    </div>
                    {(priceList.validFrom || priceList.validUntil) && (
                        <div className="flex items-center gap-2 text-xs text-neutral-500">
                            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
                                calendar_today
                            </span>
                            <span>
                                {formatDate(priceList.validFrom) || '∞'} - {formatDate(priceList.validUntil) || '∞'}
                            </span>
                        </div>
                    )}
                    {priceList.description && (
                        <p className="text-neutral-500 mt-2">{priceList.description}</p>
                    )}
                </div>
            </div>

            {/* Acciones */}
            <div className="flex justify-end gap-2 mt-2">
                <IconButton
                    icon="edit"
                    variant="basicSecondary"
                    aria-label="Editar lista de precios"
                    onClick={() => setOpenUpdateDialog(true)}
                    data-test-id={`${dataTestId}-edit-button`}
                />
                {!priceList.isDefault && (
                    <IconButton
                        icon="delete"
                        variant="basicSecondary"
                        aria-label="Eliminar lista de precios"
                        onClick={() => setOpenDeleteDialog(true)}
                        data-test-id={`${dataTestId}-delete-button`}
                    />
                )}
            </div>

            {/* Dialogs */}
            <UpdatePriceListDialog
                open={openUpdateDialog}
                onClose={() => setOpenUpdateDialog(false)}
                priceList={priceList}
                data-test-id={`${dataTestId}-update-dialog`}
            />
            
            {!priceList.isDefault && (
                <DeletePriceListDialog
                    open={openDeleteDialog}
                    onClose={() => setOpenDeleteDialog(false)}
                    priceList={priceList}
                    data-test-id={`${dataTestId}-delete-dialog`}
                />
            )}
        </article>
    );
};

export default PriceListCard;
