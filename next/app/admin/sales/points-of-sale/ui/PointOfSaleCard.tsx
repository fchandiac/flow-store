'use client';

import React, { useState } from 'react';
import Badge from '@/app/baseComponents/Badge/Badge';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import DeletePointOfSaleDialog from './DeletePointOfSaleDialog';
import UpdatePointOfSaleDialog from './UpdatePointOfSaleDialog';

export interface PointOfSaleType {
    id: string;
    name: string;
    deviceId?: string;
    isActive: boolean;
    branchId?: string;
    defaultPriceListId: string;
    branch?: {
        id: string;
        name: string;
    };
    defaultPriceList?: {
        id: string;
        name: string;
    };
}

interface PriceListOption {
    id: string;
    name: string;
}

interface PointOfSaleCardProps {
    pointOfSale: PointOfSaleType;
    priceLists: PriceListOption[];
    'data-test-id'?: string;
}

const PointOfSaleCard: React.FC<PointOfSaleCardProps> = ({ pointOfSale, priceLists, 'data-test-id': dataTestId }) => {
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [openUpdateDialog, setOpenUpdateDialog] = useState(false);
    const fallbackPriceList = priceLists.find((list) => list.id === pointOfSale.defaultPriceListId);
    const defaultPriceList = pointOfSale.defaultPriceList ?? fallbackPriceList;

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
                                point_of_sale
                            </span>
                        </div>
                        <div>
                            <h3 className="font-semibold text-neutral-800">{pointOfSale.name}</h3>
                        </div>
                    </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                    <Badge variant={pointOfSale.isActive ? 'success-outlined' : 'error-outlined'}>
                        {pointOfSale.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                </div>

                {/* Info */}
                <div className="space-y-2 text-sm text-neutral-600">
                    {pointOfSale.branch && (
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
                                store
                            </span>
                            <span>{pointOfSale.branch.name}</span>
                        </div>
                    )}
                    {defaultPriceList && (
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
                                sell
                            </span>
                            <span>{defaultPriceList.name}</span>
                        </div>
                    )}
                    {pointOfSale.deviceId && (
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
                                devices
                            </span>
                            <span className="text-xs font-mono">{pointOfSale.deviceId}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Acciones */}
            <div className="flex justify-end gap-2 mt-2">
                <IconButton
                    icon="edit"
                    variant="basicSecondary"
                    aria-label="Editar punto de venta"
                    onClick={() => setOpenUpdateDialog(true)}
                    data-test-id={`${dataTestId}-edit-button`}
                />
                <IconButton
                    icon="delete"
                    variant="basicSecondary"
                    aria-label="Eliminar punto de venta"
                    onClick={() => setOpenDeleteDialog(true)}
                    data-test-id={`${dataTestId}-delete-button`}
                />
            </div>

            {/* Dialogs */}
            <UpdatePointOfSaleDialog
                open={openUpdateDialog}
                onClose={() => setOpenUpdateDialog(false)}
                pointOfSale={pointOfSale}
                priceLists={priceLists}
                data-test-id={`${dataTestId}-update-dialog`}
            />
            
            <DeletePointOfSaleDialog
                open={openDeleteDialog}
                onClose={() => setOpenDeleteDialog(false)}
                pointOfSale={pointOfSale}
                data-test-id={`${dataTestId}-delete-dialog`}
            />
        </article>
    );
};

export default PointOfSaleCard;
