'use client';

import React, { useState, useMemo } from 'react';
import ProductVariantsCard, { ProductWithVariantsType } from './ProductVariantsCard';
import { TextField } from '@/app/baseComponents/TextField/TextField';

interface VariantsListProps {
    products: ProductWithVariantsType[];
    'data-test-id'?: string;
}

const VariantsList: React.FC<VariantsListProps> = ({ 
    products,
    'data-test-id': dataTestId 
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    // Filtrar productos por búsqueda
    const filteredProducts = useMemo(() => {
        if (!searchTerm) return products;
        
        const searchLower = searchTerm.toLowerCase();
        return products.filter(p => {
            // Buscar en nombre del producto
            if (p.name.toLowerCase().includes(searchLower)) return true;
            // Buscar en marca
            if (p.brand?.toLowerCase().includes(searchLower)) return true;
            // Buscar en SKU de variantes
            if (p.variants.some(v => v.sku.toLowerCase().includes(searchLower))) return true;
            // Buscar en displayName de variantes
            if (p.variants.some(v => v.displayName?.toLowerCase().includes(searchLower))) return true;
            return false;
        });
    }, [products, searchTerm]);

    return (
        <div className="space-y-4" data-test-id={dataTestId}>
            {/* Barra de búsqueda */}
            <div className="max-w-md">
                <TextField
                    label="Buscar"
                    placeholder="Buscar por nombre, SKU o marca..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    data-test-id="variants-search"
                />
            </div>

            {/* Contador de resultados */}
            <p className="text-sm text-neutral-500">
                {filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''} encontrado{filteredProducts.length !== 1 ? 's' : ''}
            </p>

            {/* Lista de productos con variantes */}
            {filteredProducts.length === 0 ? (
                <div className="text-center py-12 text-neutral-500">
                    <span className="material-symbols-outlined mb-2" style={{ fontSize: '3rem' }}>
                        search_off
                    </span>
                    <p>No se encontraron productos</p>
                    {searchTerm && (
                        <p className="text-sm mt-1">Intenta con otro término de búsqueda</p>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredProducts.map((product) => (
                        <ProductVariantsCard
                            key={product.id}
                            product={product}
                            data-test-id={`product-card-${product.id}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default VariantsList;
