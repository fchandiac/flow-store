'use client';

import { ChangeEvent, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import StorageCard from './StorageCard';
import CreateStorageDialog from './CreateStorageDialog';

export type StorageCategoryId = 'IN_BRANCH' | 'CENTRAL' | 'EXTERNAL';
export type StorageTypeId = 'WAREHOUSE' | 'STORE' | 'COLD_ROOM' | 'TRANSIT';

export interface StorageListItem {
    id: string;
    name: string;
    code?: string | null;
    category: StorageCategoryId;
    type: StorageTypeId;
    branchId?: string | null;
    branchName?: string | null;
    location?: string | null;
    capacity?: number | null;
    isDefault: boolean;
    isActive: boolean;
}

export interface BranchOption {
    id: string;
    name: string;
}

interface StorageListProps {
    storages: StorageListItem[];
    branches: BranchOption[];
}

const StorageList: React.FC<StorageListProps> = ({ storages, branches }) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [openCreateDialog, setOpenCreateDialog] = useState(false);

    const handleSearchChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const value = event.target.value;
        setSearch(value);

        const params = typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search)
            : new URLSearchParams();

        if (value) {
            params.set('search', value);
        } else {
            params.delete('search');
        }

        const pathname = typeof window !== 'undefined' ? window.location.pathname : '/admin/settings/storages';
        const queryString = params.toString();
        router.replace(queryString ? `${pathname}?${queryString}` : pathname);
        router.refresh();
    };

    return (
        <div className="w-full" data-test-id="storages-list-container">
            <div className="flex items-center justify-between mb-6 gap-4" data-test-id="storages-list-header">
                <IconButton
                    icon="add"
                    variant="outlined"
                    ariaLabel="Agregar almacén"
                    onClick={() => setOpenCreateDialog(true)}
                    data-test-id="storages-add-button"
                />
                <div className="w-full max-w-sm" data-test-id="storages-search-container">
                    <TextField
                        label="Buscar"
                        value={search}
                        onChange={handleSearchChange}
                        startIcon="search"
                        placeholder="Buscar almacén o código..."
                        data-test-id="storages-search-input"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full" data-test-id="storages-grid">
                {storages.length > 0 ? (
                    storages.map((storage) => (
                        <StorageCard
                            key={storage.id}
                            storage={storage}
                            branches={branches}
                            data-test-id={`storage-card-${storage.id}`}
                        />
                    ))
                ) : (
                    <div className="col-span-full text-center text-neutral-500 py-8" data-test-id="storages-empty-message">
                        No hay almacenes para mostrar.
                    </div>
                )}
            </div>

            <CreateStorageDialog
                open={openCreateDialog}
                onClose={() => setOpenCreateDialog(false)}
                branches={branches}
                data-test-id="create-storage-dialog"
            />
        </div>
    );
};

export default StorageList;
