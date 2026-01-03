import React from 'react';
import { getProductsWithVariants } from '@/app/actions/productVariants';
import { VariantsList } from './ui';

/**
 * Gestión de Variantes de Productos
 * Ruta: /admin/inventory/products/variants
 * 
 * Muestra productos con sus variantes en cards desplegables.
 * Cada producto es expandible para ver/editar sus variantes.
 * Las variantes tienen atributos dinámicos (color, talla, material, etc.)
 */
export default async function VariantsPage() {
    const products = await getProductsWithVariants();

    return (
        <div className="flex flex-col h-full">
            <VariantsList products={products} />
        </div>
    );
}
