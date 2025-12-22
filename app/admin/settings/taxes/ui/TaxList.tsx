'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import TaxCard, { TaxType } from './TaxCard';
import CreateTaxDialog from './CreateTaxDialog';

interface TaxListProps {
    taxes: TaxType[];
    companyId: string;
}

const TaxList: React.FC<TaxListProps> = ({ taxes, companyId }) => {
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
        
        const pathname = typeof window !== 'undefined' ? window.location.pathname : '/admin/settings/taxes';
        router.replace(`${pathname}?${params.toString()}`);
        router.refresh();
    };

    return (
        <div className="w-full" data-test-id="taxes-list-container">
            {/* Header con búsqueda y botón agregar */}
            <div className="flex items-center justify-between mb-6 gap-4" data-test-id="taxes-list-header">
                <IconButton 
                    icon="add" 
                    variant="outlined"
                    aria-label="Agregar impuesto"
                    onClick={() => setOpenCreateDialog(true)}
                    data-test-id="taxes-add-button"
                />
                <div className="w-full max-w-sm" data-test-id="taxes-search-container">
                    <TextField
                        label="Buscar"
                        value={search}
                        onChange={handleSearchChange}
                        startIcon="search"
                        placeholder="Buscar impuesto..."
                        data-test-id="taxes-search-input"
                    />
                </div>
            </div>

            {/* Grid de tarjetas */}
            <div 
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full" 
                data-test-id="taxes-grid"
            >
                {taxes && taxes.length > 0 ? (
                    taxes.map(tax => (
                        <TaxCard 
                            key={tax.id} 
                            tax={tax}
                            data-test-id={`tax-card-${tax.id}`}
                        />
                    ))
                ) : (
                    <div 
                        className="col-span-full text-center text-neutral-500 py-8" 
                        data-test-id="taxes-empty-message"
                    >
                        No hay impuestos para mostrar.
                    </div>
                )}
            </div>

            {/* Dialog de creación */}
            <CreateTaxDialog
                open={openCreateDialog}
                onClose={() => setOpenCreateDialog(false)}
                companyId={companyId}
                data-test-id="create-tax-dialog"
            />
        </div>
    );
};

export default TaxList;
