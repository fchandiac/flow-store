'use client';

import React, { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import PriceListCard, { PriceListType } from './PriceListCard';
import CreatePriceListDialog from './CreatePriceListDialog';

interface PriceListListProps {
    priceLists: PriceListType[];
}

const PriceListList: React.FC<PriceListListProps> = ({ priceLists }) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

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
        
        const pathname = typeof window !== 'undefined' ? window.location.pathname : '/admin/settings/price-lists';
        router.replace(`${pathname}?${params.toString()}`);
        router.refresh();
    };

    const displayedPriceLists = useMemo(() => {
        const normalized = search.trim().toLowerCase();
        if (!normalized) {
            return priceLists;
        }

        return priceLists.filter((priceList) => {
            const nameMatch = priceList.name.toLowerCase().includes(normalized);
            const typeMatch = priceList.priceListType.toLowerCase().includes(normalized);
            const descriptionMatch = priceList.description?.toLowerCase().includes(normalized);
            return nameMatch || typeMatch || Boolean(descriptionMatch);
        });
    }, [priceLists, search]);

    return (
        <div className="w-full" data-test-id="price-lists-list-container">
            {/* Header con búsqueda y botón agregar */}
            <div className="flex items-center justify-between mb-6 gap-4" data-test-id="price-lists-list-header">
                <IconButton 
                    icon="add" 
                    variant="outlined"
                    aria-label="Agregar lista de precios"
                    onClick={() => setIsCreateDialogOpen(true)}
                    data-test-id="price-lists-add-button"
                />
                <div className="w-full max-w-sm" data-test-id="price-lists-search-container">
                    <TextField
                        label="Buscar"
                        value={search}
                        onChange={handleSearchChange}
                        startIcon="search"
                        placeholder="Buscar lista de precios..."
                        data-test-id="price-lists-search-input"
                    />
                </div>
            </div>

            {/* Grid de tarjetas */}
            <div 
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full" 
                data-test-id="price-lists-grid"
            >
                {displayedPriceLists.length > 0 ? (
                    displayedPriceLists.map(priceList => (
                        <PriceListCard 
                            key={priceList.id} 
                            priceList={priceList}
                            data-test-id={`price-list-card-${priceList.id}`}
                        />
                    ))
                ) : (
                    <div 
                        className="col-span-full text-center text-neutral-500 py-8" 
                        data-test-id="price-lists-empty-message"
                    >
                        No hay listas de precios para mostrar.
                    </div>
                )}
            </div>

            {/* Dialog de creación */}
            <CreatePriceListDialog
                open={isCreateDialogOpen}
                onClose={() => setIsCreateDialogOpen(false)}
                data-test-id="create-price-list-dialog"
            />
        </div>
    );
};

export default PriceListList;
