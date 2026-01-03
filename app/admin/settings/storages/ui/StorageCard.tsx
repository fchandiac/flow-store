'use client';

import React, { useState } from 'react';
import Badge from '@/app/baseComponents/Badge/Badge';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import { BranchOption, StorageListItem } from './StorageList';
import UpdateStorageDialog from './UpdateStorageDialog';
import DeleteStorageDialog from './DeleteStorageDialog';

interface StorageCardProps {
    storage: StorageListItem;
    branches: BranchOption[];
    'data-test-id'?: string;
}

const categoryLabels: Record<StorageListItem['category'], string> = {
    IN_BRANCH: 'En Sucursal',
    CENTRAL: 'Central',
    EXTERNAL: 'Externo',
};

const typeLabels: Record<StorageListItem['type'], string> = {
    WAREHOUSE: 'Depósito',
    STORE: 'Tienda',
    COLD_ROOM: 'Cámara fría',
    TRANSIT: 'Tránsito',
};

const StorageCard: React.FC<StorageCardProps> = ({ storage, branches, 'data-test-id': dataTestId }) => {
    const [openUpdateDialog, setOpenUpdateDialog] = useState(false);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const baseTestId = dataTestId ?? `storage-card-${storage.id}`;

    return (
        <article
            className="border border-neutral-200 bg-white rounded-lg shadow-sm overflow-hidden flex flex-col"
            data-test-id={baseTestId}
        >
            <div className="p-4 flex flex-col gap-2">
                <div>
                    <h3 className="font-semibold text-neutral-800 text-lg break-words">
                        {storage.name}
                    </h3>
                    {storage.code && (
                        <p className="text-sm text-neutral-500 break-all" data-test-id="storage-code">
                            Código: {storage.code}
                        </p>
                    )}
                </div>

                {storage.branchName && (
                    <div className="text-sm text-neutral-600 flex items-center gap-1" data-test-id="storage-branch">
                        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
                            storefront
                        </span>
                        {storage.branchName}
                    </div>
                )}

                {storage.location && (
                    <p className="text-sm text-neutral-500" data-test-id="storage-location">
                        Ubicación: {storage.location}
                    </p>
                )}

                {storage.capacity != null && (
                    <p className="text-sm text-neutral-500" data-test-id="storage-capacity">
                        Capacidad: {storage.capacity}
                    </p>
                )}
            </div>

            <div className="p-4 pt-0 flex items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                    <Badge variant="info-outlined">
                        {categoryLabels[storage.category]}
                    </Badge>
                    <Badge variant="secondary-outlined">
                        {typeLabels[storage.type]}
                    </Badge>
                    {storage.isDefault && (
                        <Badge variant="warning-outlined">Predeterminado</Badge>
                    )}
                    <Badge variant={storage.isActive ? 'success-outlined' : 'error-outlined'}>
                        {storage.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                </div>

                <div className="flex gap-1">
                    <IconButton
                        icon="edit"
                        variant="ghost"
                        ariaLabel="Editar almacén"
                        onClick={() => setOpenUpdateDialog(true)}
                        data-test-id={`${baseTestId}-edit-button`}
                    />
                    <IconButton
                        icon="delete"
                        variant="ghost"
                        ariaLabel="Eliminar almacén"
                        onClick={() => setOpenDeleteDialog(true)}
                        data-test-id={`${baseTestId}-delete-button`}
                    />
                </div>
            </div>

            <UpdateStorageDialog
                open={openUpdateDialog}
                onClose={() => setOpenUpdateDialog(false)}
                storage={storage}
                branches={branches}
                data-test-id={`${baseTestId}-update-dialog`}
            />
            <DeleteStorageDialog
                open={openDeleteDialog}
                onClose={() => setOpenDeleteDialog(false)}
                storage={storage}
                data-test-id={`${baseTestId}-delete-dialog`}
            />
        </article>
    );
};

export default StorageCard;
