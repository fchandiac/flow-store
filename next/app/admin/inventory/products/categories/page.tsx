import React from 'react';
import { getCategories } from '@/app/actions/categories';
import { CategoryList } from './ui';

/**
 * Gestión de Categorías
 * Ruta: /admin/inventory/products/categories
 * CRUD de categorías de productos
 */
export default async function CategoriesPage() {
    const categories = await getCategories();
    
    // Contar subcategorías y productos para cada categoría
    const categoriesWithCounts = categories.map(cat => {
        const childrenCount = categories.filter(c => c.parentId === cat.id).length;
        return {
            ...cat,
            childrenCount,
            productsCount: 0, // TODO: Podría agregarse un count de productos
        };
    });

    return (
        <div className="flex flex-col h-full">
            <CategoryList categories={categoriesWithCounts} />
        </div>
    );
}
