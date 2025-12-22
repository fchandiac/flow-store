'use client';

import React, { useState } from 'react';
import Badge from '@/app/baseComponents/Badge/Badge';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import DeleteBranchDialog from './DeleteBranchDialog';
import UpdateBranchDialog from './UpdateBranchDialog';

export interface BranchType {
    id: string;
    name: string;
    code?: string;
    address?: string;
    phone?: string;
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
            className="border border-neutral-200 bg-white rounded-lg shadow-sm p-4 flex flex-col justify-between min-w-[260px]" 
            data-test-id={dataTestId}
        >
            <div className="flex flex-col gap-3">
                {/* Header con icono y badges */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-neutral-100 border-2 border-secondary flex items-center justify-center">
                            <span 
                                className="material-symbols-outlined text-secondary" 
                                style={{ fontSize: '1.5rem' }}
                            >
                                store
                            </span>
                        </div>
                        <div>
                            <h3 className="font-semibold text-neutral-800">{branch.name}</h3>
                            {branch.code && (
                                <span className="text-sm text-neutral-500">Código: {branch.code}</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                    {branch.isHeadquarters && (
                        <Badge variant="info-outlined">Casa Matriz</Badge>
                    )}
                    <Badge variant={branch.isActive ? 'success-outlined' : 'error-outlined'}>
                        {branch.isActive ? 'Activa' : 'Inactiva'}
                    </Badge>
                </div>

                {/* Info */}
                <div className="space-y-1 text-sm text-neutral-600">
                    {branch.address && (
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-neutral-400" style={{ fontSize: '1rem' }}>
                                location_on
                            </span>
                            <span>{branch.address}</span>
                        </div>
                    )}
                    {branch.phone && (
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-neutral-400" style={{ fontSize: '1rem' }}>
                                phone
                            </span>
                            <span>{branch.phone}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Acciones */}
            <div className="flex justify-end gap-2 mt-2">
                <IconButton
                    icon="edit"
                    variant="basicSecondary"
                    aria-label="Editar sucursal"
                    onClick={() => setOpenUpdateDialog(true)}
                    data-test-id={`${dataTestId}-edit-button`}
                />
                {!branch.isHeadquarters && (
                    <IconButton
                        icon="delete"
                        variant="basicSecondary"
                        aria-label="Eliminar sucursal"
                        onClick={() => setOpenDeleteDialog(true)}
                        data-test-id={`${dataTestId}-delete-button`}
                    />
                )}
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
