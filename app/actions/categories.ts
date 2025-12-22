'use server'

import { getDb } from '@/data/db';
import { Category } from '@/data/entities/Category';
import { Product } from '@/data/entities/Product';
import { revalidatePath } from 'next/cache';
import { IsNull } from 'typeorm';

// Types
interface GetCategoriesParams {
    search?: string;
    isActive?: boolean;
    parentId?: string | null;
    includeChildren?: boolean;
}

interface CreateCategoryDTO {
    name: string;
    code?: string;
    description?: string;
    parentId?: string | null;
    sortOrder?: number;
    imagePath?: string;
}

interface UpdateCategoryDTO {
    name?: string;
    code?: string;
    description?: string;
    parentId?: string | null;
    sortOrder?: number;
    imagePath?: string;
    isActive?: boolean;
}

interface CategoryResult {
    success: boolean;
    category?: Category;
    error?: string;
}

interface CategoryTreeNode extends Category {
    children: CategoryTreeNode[];
}

/**
 * Obtiene todas las categorías como lista plana
 */
export async function getCategories(params?: GetCategoriesParams): Promise<Category[]> {
    const ds = await getDb();
    const repo = ds.getRepository(Category);
    
    const queryBuilder = repo.createQueryBuilder('category')
        .where('category.deletedAt IS NULL');
    
    if (params?.search) {
        queryBuilder.andWhere(
            '(category.name LIKE :search OR category.description LIKE :search)',
            { search: `%${params.search}%` }
        );
    }
    
    if (params?.isActive !== undefined) {
        queryBuilder.andWhere('category.isActive = :isActive', { isActive: params.isActive });
    }
    
    if (params?.parentId !== undefined) {
        if (params.parentId === null) {
            queryBuilder.andWhere('category.parentId IS NULL');
        } else {
            queryBuilder.andWhere('category.parentId = :parentId', { parentId: params.parentId });
        }
    }
    
    if (params?.includeChildren) {
        queryBuilder.leftJoinAndSelect('category.children', 'children', 'children.deletedAt IS NULL');
    }
    
    queryBuilder.orderBy('category.sortOrder', 'ASC').addOrderBy('category.name', 'ASC');
    
    return queryBuilder.getMany();
}

/**
 * Obtiene categorías raíz (sin padre)
 */
export async function getRootCategories(): Promise<Category[]> {
    return getCategories({ parentId: null, isActive: true });
}

/**
 * Obtiene el árbol completo de categorías
 */
export async function getCategoryTree(): Promise<CategoryTreeNode[]> {
    const ds = await getDb();
    const repo = ds.getRepository(Category);
    
    const allCategories = await repo.find({
        where: { deletedAt: IsNull(), isActive: true },
        order: { sortOrder: 'ASC', name: 'ASC' }
    });
    
    // Construir árbol
    const categoryMap = new Map<string, CategoryTreeNode>();
    const roots: CategoryTreeNode[] = [];
    
    // Primer paso: crear nodos con array de hijos vacío
    for (const cat of allCategories) {
        categoryMap.set(cat.id, { ...cat, children: [] });
    }
    
    // Segundo paso: asignar hijos a padres
    for (const cat of allCategories) {
        const node = categoryMap.get(cat.id)!;
        if (cat.parentId && categoryMap.has(cat.parentId)) {
            categoryMap.get(cat.parentId)!.children.push(node);
        } else if (!cat.parentId) {
            roots.push(node);
        }
    }
    
    return roots;
}

/**
 * Obtiene una categoría por ID
 */
export async function getCategoryById(id: string): Promise<Category | null> {
    const ds = await getDb();
    const repo = ds.getRepository(Category);
    
    return repo.findOne({
        where: { id, deletedAt: IsNull() },
        relations: ['parent', 'children']
    });
}

/**
 * Obtiene una categoría con sus productos
 */
export async function getCategoryWithProducts(id: string): Promise<{
    category: Category;
    products: Product[];
} | null> {
    const ds = await getDb();
    const categoryRepo = ds.getRepository(Category);
    const productRepo = ds.getRepository(Product);
    
    const category = await categoryRepo.findOne({
        where: { id, deletedAt: IsNull() }
    });
    
    if (!category) return null;
    
    const products = await productRepo.find({
        where: { categoryId: id, deletedAt: IsNull(), isActive: true },
        order: { name: 'ASC' }
    });
    
    return { category, products };
}

/**
 * Obtiene la ruta completa de una categoría (breadcrumb)
 */
export async function getCategoryPath(id: string): Promise<Category[]> {
    const ds = await getDb();
    const repo = ds.getRepository(Category);
    
    const path: Category[] = [];
    let currentId: string | null = id;
    
    while (currentId) {
        const category = await repo.findOne({
            where: { id: currentId, deletedAt: IsNull() }
        });
        
        if (!category) break;
        
        path.unshift(category);
        currentId = category.parentId ?? null;
    }
    
    return path;
}

/**
 * Crea una nueva categoría
 */
export async function createCategory(data: CreateCategoryDTO): Promise<CategoryResult> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(Category);
        
        // Verificar nombre único en el mismo nivel
        const existingQuery = repo.createQueryBuilder('category')
            .where('category.name = :name', { name: data.name })
            .andWhere('category.deletedAt IS NULL');
        
        if (data.parentId) {
            existingQuery.andWhere('category.parentId = :parentId', { parentId: data.parentId });
        } else {
            existingQuery.andWhere('category.parentId IS NULL');
        }
        
        const existing = await existingQuery.getOne();
        if (existing) {
            return { success: false, error: 'Ya existe una categoría con ese nombre en este nivel' };
        }
        
        // Verificar que el padre existe si se especifica
        if (data.parentId) {
            const parent = await repo.findOne({
                where: { id: data.parentId, deletedAt: IsNull() }
            });
            if (!parent) {
                return { success: false, error: 'Categoría padre no encontrada' };
            }
        }
        
        // Calcular sortOrder si no se proporciona
        let sortOrder = data.sortOrder;
        if (sortOrder === undefined) {
            const lastQuery = repo.createQueryBuilder('category')
                .where('category.deletedAt IS NULL');
            
            if (data.parentId) {
                lastQuery.andWhere('category.parentId = :parentId', { parentId: data.parentId });
            } else {
                lastQuery.andWhere('category.parentId IS NULL');
            }
            
            const lastCategory = await lastQuery
                .orderBy('category.sortOrder', 'DESC')
                .getOne();
            
            sortOrder = (lastCategory?.sortOrder ?? 0) + 1;
        }
        
        const category = repo.create({
            name: data.name,
            code: data.code,
            description: data.description,
            parentId: data.parentId || undefined,
            sortOrder,
            imagePath: data.imagePath,
            isActive: true
        });
        
        await repo.save(category);
        revalidatePath('/admin/categories');
        
        return { success: true, category };
    } catch (error) {
        console.error('Error creating category:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al crear la categoría' 
        };
    }
}

/**
 * Actualiza una categoría
 */
export async function updateCategory(id: string, data: UpdateCategoryDTO): Promise<CategoryResult> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(Category);
        
        const category = await repo.findOne({ 
            where: { id, deletedAt: IsNull() } 
        });
        
        if (!category) {
            return { success: false, error: 'Categoría no encontrada' };
        }
        
        // Verificar nombre único si se cambia
        if (data.name && data.name !== category.name) {
            const existingQuery = repo.createQueryBuilder('category')
                .where('category.name = :name', { name: data.name })
                .andWhere('category.id != :id', { id })
                .andWhere('category.deletedAt IS NULL');
            
            const parentId = data.parentId !== undefined ? data.parentId : category.parentId;
            if (parentId) {
                existingQuery.andWhere('category.parentId = :parentId', { parentId });
            } else {
                existingQuery.andWhere('category.parentId IS NULL');
            }
            
            const existing = await existingQuery.getOne();
            if (existing) {
                return { success: false, error: 'Ya existe una categoría con ese nombre en este nivel' };
            }
        }
        
        // Verificar ciclo al cambiar padre
        if (data.parentId !== undefined && data.parentId !== category.parentId) {
            if (data.parentId) {
                // No puede ser padre de sí mismo
                if (data.parentId === id) {
                    return { success: false, error: 'Una categoría no puede ser padre de sí misma' };
                }
                
                // Verificar que el nuevo padre no sea un descendiente
                const descendants = await getCategoryDescendants(id);
                if (descendants.some(d => d.id === data.parentId)) {
                    return { success: false, error: 'No se puede mover a una subcategoría propia' };
                }
                
                // Verificar que el padre existe
                const parent = await repo.findOne({
                    where: { id: data.parentId, deletedAt: IsNull() }
                });
                if (!parent) {
                    return { success: false, error: 'Categoría padre no encontrada' };
                }
            }
        }
        
        if (data.name !== undefined) category.name = data.name;
        if (data.code !== undefined) category.code = data.code;
        if (data.description !== undefined) category.description = data.description;
        if (data.parentId !== undefined) category.parentId = data.parentId || undefined;
        if (data.sortOrder !== undefined) category.sortOrder = data.sortOrder;
        if (data.imagePath !== undefined) category.imagePath = data.imagePath;
        if (data.isActive !== undefined) category.isActive = data.isActive;
        
        await repo.save(category);
        revalidatePath('/admin/categories');
        
        return { success: true, category };
    } catch (error) {
        console.error('Error updating category:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al actualizar la categoría' 
        };
    }
}

/**
 * Elimina (soft delete) una categoría
 */
export async function deleteCategory(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(Category);
        const productRepo = ds.getRepository(Product);
        
        const category = await repo.findOne({ 
            where: { id, deletedAt: IsNull() },
            relations: ['children']
        });
        
        if (!category) {
            return { success: false, error: 'Categoría no encontrada' };
        }
        
        // Verificar que no tenga subcategorías
        const childrenCount = await repo.count({
            where: { parentId: id, deletedAt: IsNull() }
        });
        
        if (childrenCount > 0) {
            return { success: false, error: 'No se puede eliminar: tiene subcategorías. Elimínelas primero.' };
        }
        
        // Verificar que no tenga productos
        const productCount = await productRepo.count({
            where: { categoryId: id, deletedAt: IsNull() }
        });
        
        if (productCount > 0) {
            return { success: false, error: 'No se puede eliminar: tiene productos asociados' };
        }
        
        await repo.softDelete(id);
        revalidatePath('/admin/categories');
        
        return { success: true };
    } catch (error) {
        console.error('Error deleting category:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al eliminar la categoría' 
        };
    }
}

/**
 * Reordena categorías en un nivel
 */
export async function reorderCategories(
    orderedIds: string[]
): Promise<{ success: boolean; error?: string }> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(Category);
        
        for (let i = 0; i < orderedIds.length; i++) {
            await repo.update(orderedIds[i], { sortOrder: i });
        }
        
        revalidatePath('/admin/categories');
        return { success: true };
    } catch (error) {
        console.error('Error reordering categories:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al reordenar categorías' 
        };
    }
}

/**
 * Helper: obtiene todos los descendientes de una categoría
 */
async function getCategoryDescendants(id: string): Promise<Category[]> {
    const ds = await getDb();
    const repo = ds.getRepository(Category);
    
    const descendants: Category[] = [];
    const queue: string[] = [id];
    
    while (queue.length > 0) {
        const currentId = queue.shift()!;
        const children = await repo.find({
            where: { parentId: currentId, deletedAt: IsNull() }
        });
        
        for (const child of children) {
            descendants.push(child);
            queue.push(child.id);
        }
    }
    
    return descendants;
}
