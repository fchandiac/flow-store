'use client';

import React, { useState } from 'react';
import Badge from '@/app/baseComponents/Badge/Badge';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import LocationPickerWrapper from '@/app/baseComponents/LocationPicker/LocationPickerWrapper';
import DeleteBranchDialog from './DeleteBranchDialog';
import UpdateBranchDialog from './UpdateBranchDialog';

export interface BranchType {
    id: string;
    name: string;
    address?: string;
    phone?: string;
    location?: { lat: number; lng: number };
    isActive: boolean;
    isHeadquarters: boolean;
    companyId: string;
}

interface BranchCardProps {
    branch: BranchType;
    'data-test-id'?: string;
}

const BranchCard: React.FC<BranchCardProps> = ({ branch, 'data-test-id': dataTestId }) => {
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [openUpdateDialog, setOpenUpdateDialog] = useState(false);

    return (
        <article 
            className="border border-neutral-200 bg-white rounded-lg shadow-sm overflow-hidden flex flex-col min-w-[260px]" 
            data-test-id={dataTestId}
        >
            {/* Header: Nombre y dirección */}
            <div className="p-4 pb-3">
                <h3 className="font-semibold text-neutral-800 text-lg">{branch.name}</h3>
                {branch.address && (
                    <p className="text-sm text-neutral-500 mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
                            location_on
                        </span>
                        {branch.address}
                    </p>
                )}
            </div>

            {/* Mapa - full width, sin bordes redondeados */}
            {branch.location && (
                <div className="w-full">
                    <LocationPickerWrapper
                        initialLat={branch.location.lat}
                        initialLng={branch.location.lng}
                        viewOnly={true}
                        variant="flat"
                        rounded="none"
                        zoom={15}
                        height={20} // 20vh fixed height to avoid layout overflow
                    />
                </div>
            )}

            {/* Footer: Badges y acciones */}
            <div className="p-4 pt-3 flex items-center justify-between">
                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                    {branch.isHeadquarters && (
                        <Badge variant="info-outlined">Casa Matriz</Badge>
                    )}
                    <Badge variant={branch.isActive ? 'success-outlined' : 'error-outlined'}>
                        {branch.isActive ? 'Activa' : 'Inactiva'}
                    </Badge>
                </div>

                {/* Acciones */}
                <div className="flex gap-1">
                    <IconButton
                        icon="edit"
                        variant="ghost"
                        aria-label="Editar sucursal"
                        onClick={() => setOpenUpdateDialog(true)}
                        data-test-id={`${dataTestId}-edit-button`}
                    />
                    {!branch.isHeadquarters && (
                        <IconButton
                            icon="delete"
                            variant="ghost"
                            aria-label="Eliminar sucursal"
                            onClick={() => setOpenDeleteDialog(true)}
                            data-test-id={`${dataTestId}-delete-button`}
                        />
                    )}
                </div>
            </div>

            {/* Dialogs */}
            <UpdateBranchDialog
                open={openUpdateDialog}
                onClose={() => setOpenUpdateDialog(false)}
                branch={branch}
                data-test-id={`${dataTestId}-update-dialog`}
            />
            
            {!branch.isHeadquarters && (
                <DeleteBranchDialog
                    open={openDeleteDialog}
                    onClose={() => setOpenDeleteDialog(false)}
                    branch={branch}
                    data-test-id={`${dataTestId}-delete-dialog`}
                />
            )}
        </article>
    );
};

export default BranchCard;
