'use client';

import React, { useState } from 'react';
import Badge from '@/app/baseComponents/Badge/Badge';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import DeleteVariantDialog from './DeleteVariantDialog';
import UpdateVariantDialog from './UpdateVariantDialog';

export interface VariantType {
    id: string;
    productId?: string;
    sku: string;
    barcode?: string;
    basePrice: number;
    baseCost: number;
    unitOfMeasure: string;
    /** Valores de atributos: { "attributeId": "opción" } */
    attributeValues?: Record<string, string>;
    /** Nombre generado para mostrar (ej: "Color: Rojo, Talla: M") */
    displayName: string;
    trackInventory: boolean;
    allowNegativeStock: boolean;
    isDefault: boolean;
    isActive: boolean;
}

interface VariantCardProps {
    variant: VariantType;
    'data-test-id'?: string;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
};

const VariantCard: React.FC<VariantCardProps> = ({ 
    variant, 
    'data-test-id': dataTestId 
}) => {
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [openUpdateDialog, setOpenUpdateDialog] = useState(false);

    return (
        <>
            <div 
                className="bg-white rounded-lg border border-neutral-200 p-4 hover:shadow-sm transition-shadow"
                data-test-id={dataTestId}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h4 className="font-medium text-neutral-800">
                                {variant.displayName || 'Default'}
                            </h4>
                            {variant.isDefault && (
                                <Badge variant="info-outlined">
                                    Default
                                </Badge>
                            )}
                            <Badge variant={variant.isActive ? 'success-outlined' : 'secondary-outlined'}>
                                {variant.isActive ? 'Activa' : 'Inactiva'}
                            </Badge>
                        </div>
                        <p className="text-sm text-neutral-500 mt-1">
                            SKU: {variant.sku}
                            {variant.barcode && <span className="ml-3">Código: {variant.barcode}</span>}
                        </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                        <IconButton
                            icon="edit"
                            variant="basicSecondary"
                            size="xs"
                            onClick={() => setOpenUpdateDialog(true)}
                            data-test-id={`edit-variant-${variant.id}`}
                        />
                        {!variant.isDefault && (
                            <IconButton
                                icon="delete"
                                variant="basicSecondary"
                                size="xs"
                                onClick={() => setOpenDeleteDialog(true)}
                                data-test-id={`delete-variant-${variant.id}`}
                            />
                        )}
                    </div>
                </div>

                {/* Precios */}
                <div className="flex items-center gap-6 mt-3 pt-3 border-t border-neutral-100">
                    <div>
                        <span className="text-xs text-neutral-500">Precio</span>
                        <p className="font-semibold text-neutral-800">{formatCurrency(variant.basePrice)}</p>
                    </div>
                    <div>
                        <span className="text-xs text-neutral-500">Costo</span>
                        <p className="font-medium text-neutral-600">{formatCurrency(variant.baseCost)}</p>
                    </div>
                    <div>
                        <span className="text-xs text-neutral-500">Unidad</span>
                        <p className="font-medium text-neutral-600">{variant.unitOfMeasure}</p>
                    </div>
                </div>
            </div>

            <UpdateVariantDialog
                open={openUpdateDialog}
                onClose={() => setOpenUpdateDialog(false)}
                variant={variant}
                data-test-id={`update-variant-dialog-${variant.id}`}
            />

            <DeleteVariantDialog
                open={openDeleteDialog}
                onClose={() => setOpenDeleteDialog(false)}
                variant={variant}
                data-test-id={`delete-variant-dialog-${variant.id}`}
            />
        </>
    );
};

export default VariantCard;
