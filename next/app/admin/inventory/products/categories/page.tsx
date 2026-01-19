import React from 'react';
import { getCategories } from '@/app/actions/categories';
import { getDb } from '@/data/db';
import { Product } from '@/data/entities/Product';
import { CategoryList } from './ui';

/**
 * Gestión de Categorías
 * Ruta: /admin/inventory/products/categories
 * CRUD de categorías de productos
 */
export default async function CategoriesPage() {
    const categories = await getCategories();

    // Construir mapa de subcategorías por id
    const childCountMap: Record<string, number> = {};
    for (const category of categories) {
        if (category.parentId) {
            childCountMap[category.parentId] = (childCountMap[category.parentId] ?? 0) + 1;
        }
    }

    // Consultar cantidad de productos asociados a cada categoría
    const productCountMap: Record<string, number> = {};
    if (categories.length > 0) {
        const ds = await getDb();
        const productRepo = ds.getRepository(Product);

        type ProductCountRow = { categoryId: string | null; count: string };
        const categoryIds = categories.map((cat) => cat.id);
        const rawCounts = await productRepo
            .createQueryBuilder('product')
            .select('product.categoryId', 'categoryId')
            .addSelect('COUNT(*)', 'count')
            .where('product.deletedAt IS NULL')
            .andWhere('product.isActive = :isActive', { isActive: true })
            .andWhere('product.categoryId IN (:...categoryIds)', { categoryIds })
            .groupBy('product.categoryId')
            .getRawMany<ProductCountRow>();

        for (const row of rawCounts) {
            if (row.categoryId) {
                productCountMap[row.categoryId] = Number(row.count) || 0;
            }
        }
    }

    const categoriesWithCounts = categories.map((cat) => ({
        ...cat,
        childrenCount: childCountMap[cat.id] ?? 0,
        productsCount: productCountMap[cat.id] ?? 0,
    }));

    return (
        <div className="flex flex-col h-full">
            <CategoryList categories={categoriesWithCounts} />
        </div>
    );
}
