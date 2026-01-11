'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import BranchCard, { BranchType } from './BranchCard';
import CreateBranchDialog from './CreateBranchDialog';

interface BranchListProps {
    branches: BranchType[];
}

const BranchList: React.FC<BranchListProps> = ({ branches }) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [openCreateDialog, setOpenCreateDialog] = useState(false);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const value = e.target.value;
        setSearch(value);
        
        const params = typeof window !== 'undefined' 
            ? new URLSearchParams(window.location.search) 
            : new URLSearchParams();
        
        if (value) {
            params.set('search', value);
        } else {
            params.delete('search');
        }
        
        const pathname = typeof window !== 'undefined' ? window.location.pathname : '/admin/settings/branches';
        router.replace(`${pathname}?${params.toString()}`);
        router.refresh();
    };

    return (
        <div className="w-full" data-test-id="branches-list-container">
            {/* Header con búsqueda y botón agregar */}
            <div className="flex items-center justify-between mb-6 gap-4" data-test-id="branches-list-header">
                <IconButton 
                    icon="add" 
                    variant="outlined"
                    aria-label="Agregar sucursal"
                    onClick={() => setOpenCreateDialog(true)}
                    data-test-id="branches-add-button"
                />
                <div className="w-full max-w-sm" data-test-id="branches-search-container">
                    <TextField
                        label="Buscar"
                        value={search}
                        onChange={handleSearchChange}
                        startIcon="search"
                        placeholder="Buscar sucursal..."
                        data-test-id="branches-search-input"
                    />
                </div>
            </div>

            {/* Grid de tarjetas */}
            <div 
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full" 
                data-test-id="branches-grid"
            >
                {branches && branches.length > 0 ? (
                    branches.map(branch => (
                        <BranchCard 
                            key={branch.id} 
                            branch={branch}
                            data-test-id={`branch-card-${branch.id}`}
                        />
                    ))
                ) : (
                    <div 
                        className="col-span-full text-center text-neutral-500 py-8" 
                        data-test-id="branches-empty-message"
                    >
                        No hay sucursales para mostrar.
                    </div>
                )}
            </div>

            {/* Dialog de creación */}
            <CreateBranchDialog
                open={openCreateDialog}
                onClose={() => setOpenCreateDialog(false)}
                data-test-id="create-branch-dialog"
            />
        </div>
    );
};

export default BranchList;
