'use client';

import React, { useEffect, useState } from 'react';
import Badge from '@/app/baseComponents/Badge/Badge';
import { Button } from '@/app/baseComponents/Button/Button';
import VariantCard, { VariantType } from './VariantCard';
import CreateVariantDialog from './CreateVariantDialog';
import { getAttributes } from '@/app/actions/attributes';

export interface ProductWithVariantsType {
    id: string;
    name: string;
    brand?: string;
    categoryId?: string;
    categoryName?: string;
    isActive: boolean;
    variantCount: number;
    isMultiVariant: boolean;
    variants: VariantType[];
}

interface ProductVariantsCardProps {
    product: ProductWithVariantsType;
    'data-test-id'?: string;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
};

const ProductVariantsCard: React.FC<ProductVariantsCardProps> = ({ 
    product,
    'data-test-id': dataTestId 
}) => {
    const [expanded, setExpanded] = useState(false);
    const [openCreateDialog, setOpenCreateDialog] = useState(false);
    const [attributeNames, setAttributeNames] = useState<Record<string, string>>({});

    useEffect(() => {
        let cancelled = false;

        const loadAttributes = async () => {
            try {
                const attrs = await getAttributes();
                if (cancelled) {
                    return;
                }
                const lookup = attrs.reduce<Record<string, string>>((acc, attr) => {
                    acc[attr.id] = attr.name;
                    return acc;
                }, {});
                setAttributeNames(lookup);
            } catch (err) {
                if (!cancelled) {
                    console.error('Error loading attributes for product variants card:', err);
                }
            }
        };

        loadAttributes();

        return () => {
            cancelled = true;
        };
    }, []);

    // Obtener precio de la primera variante para mostrar
    const defaultVariant = product.variants.find(v => v.isDefault) || product.variants[0];
    const displayPrice = defaultVariant?.basePrice || 0;

    return (
        <>
            <div 
                className="bg-white rounded-lg border border-neutral-200 overflow-hidden"
                data-test-id={dataTestId}
            >
                {/* Header del producto - Clickeable para expandir */}
                <div 
                    className="p-4 cursor-pointer hover:bg-neutral-50 transition-colors"
                    onClick={() => setExpanded(!expanded)}
                >
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            {/* Icono de expandir */}
                            <span 
                                className={`material-symbols-outlined text-neutral-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
                                style={{ fontSize: '1.25rem' }}
                            >
                                chevron_right
                            </span>
                            
                            {/* Info del producto */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-neutral-800 truncate">{product.name}</h3>
                                    <Badge variant={product.isActive ? 'success-outlined' : 'secondary-outlined'}>
                                        {product.isActive ? 'Activo' : 'Inactivo'}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-neutral-500 mt-1">
                                    {defaultVariant && <span>SKU: {defaultVariant.sku}</span>}
                                    {product.categoryName && (
                                        <span className="flex items-center gap-1">
                                            <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>
                                                folder
                                            </span>
                                            {product.categoryName}
                                        </span>
                                    )}
                                    {product.brand && (
                                        <span className="flex items-center gap-1">
                                            <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>
                                                storefront
                                            </span>
                                            {product.brand}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Info derecha */}
                        <div className="flex items-center gap-6">
                            <div className="text-right">
                                <span className="text-xs text-neutral-500">Precio</span>
                                <p className="font-semibold text-neutral-800">{formatCurrency(displayPrice)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="primary-outlined">
                                    <span className="material-symbols-outlined mr-1" style={{ fontSize: '0.875rem' }}>
                                        style
                                    </span>
                                    {product.variantCount} variante{product.variantCount !== 1 ? 's' : ''}
                                </Badge>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Variantes expandibles */}
                {expanded && (
                    <div className="border-t border-neutral-200 bg-neutral-50">
                        <div className="p-4">
                            {/* Botón agregar variante */}
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-sm font-medium text-neutral-600">
                                    Variantes del producto
                                </h4>
                                <Button
                                    variant="outlined"
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenCreateDialog(true);
                                    }}
                                    data-test-id={`add-variant-${product.id}`}
                                >
                                    <span className="material-symbols-outlined mr-1" style={{ fontSize: '1rem' }}>
                                        add
                                    </span>
                                    Agregar Variante
                                </Button>
                            </div>

                            {/* Lista de variantes */}
                            {product.variants.length === 0 ? (
                                <div className="text-center py-8 text-neutral-500">
                                    <span className="material-symbols-outlined mb-2" style={{ fontSize: '2rem' }}>
                                        style
                                    </span>
                                    <p>Este producto no tiene variantes</p>
                                    <p className="text-sm mt-1">Agrega variantes como tallas, colores o materiales</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {product.variants.map((variant) => (
                                        <VariantCard
                                            key={variant.id}
                                            variant={variant}
                                            attributeNames={attributeNames}
                                            data-test-id={`variant-card-${variant.id}`}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <CreateVariantDialog
                open={openCreateDialog}
                onClose={() => setOpenCreateDialog(false)}
                productId={product.id}
                productName={product.name}
                data-test-id={`create-variant-dialog-${product.id}`}
            />
        </>
    );
};

export default ProductVariantsCard;
