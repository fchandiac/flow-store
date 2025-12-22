# Server Action: categories.ts

## Ubicación
`app/actions/categories.ts`

---

## Descripción

Server actions para la entidad **Category** (Categoría de productos).

---

## Funciones

### getCategories

Obtiene todas las categorías.

```typescript
'use server'

interface GetCategoriesParams {
    parentId?: string | null;  // null = solo raíz
    includeInactive?: boolean;
}

export async function getCategories(params?: GetCategoriesParams): Promise<Category[]>
```

---

### getCategoryTree

Obtiene el árbol completo de categorías.

```typescript
interface CategoryNode extends Category {
    children: CategoryNode[];
    productCount: number;
}

export async function getCategoryTree(): Promise<CategoryNode[]>
```

**Uso:**
```tsx
const tree = await getCategoryTree();
// tree[0].children[0].children...
```

---

### getCategoryById

Obtiene una categoría con sus productos.

```typescript
interface CategoryWithProducts extends Category {
    parent?: Category;
    children: Category[];
    products: Product[];
}

export async function getCategoryById(id: string): Promise<CategoryWithProducts | null>
```

---

### createCategory

Crea una nueva categoría.

```typescript
interface CreateCategoryDTO {
    name: string;
    description?: string;
    parentId?: string;
    sortOrder?: number;
}

interface CategoryResult {
    success: boolean;
    category?: Category;
    error?: string;
}

export async function createCategory(data: CreateCategoryDTO): Promise<CategoryResult>
```

**Uso:**
```tsx
// Categoría raíz
const result = await createCategory({
    name: 'Frutas',
    description: 'Frutas frescas'
});

// Subcategoría
const result = await createCategory({
    name: 'Berries',
    parentId: frutasCategory.id
});
```

---

### updateCategory

Actualiza una categoría.

```typescript
interface UpdateCategoryDTO {
    name?: string;
    description?: string;
    parentId?: string;
    sortOrder?: number;
    isActive?: boolean;
}

export async function updateCategory(
    id: string, 
    data: UpdateCategoryDTO
): Promise<CategoryResult>
```

---

### deleteCategory

Elimina (soft delete) una categoría.

```typescript
export async function deleteCategory(id: string): Promise<{ success: boolean; error?: string }>
```

> ⚠️ No se puede eliminar si tiene subcategorías o productos.

---

### reorderCategories

Reordena categorías.

```typescript
interface ReorderItem {
    id: string;
    sortOrder: number;
}

export async function reorderCategories(items: ReorderItem[]): Promise<{ success: boolean }>
```

---

## Implementación

```typescript
'use server'

import { getDataSource } from '@/data/db';
import { Category } from '@/data/entities/Category';
import { Product } from '@/data/entities/Product';
import { revalidatePath } from 'next/cache';
import { IsNull } from 'typeorm';

export async function getCategories(params?: GetCategoriesParams): Promise<Category[]> {
    const ds = await getDataSource();
    const repo = ds.getRepository(Category);
    
    const where: any = {};
    
    if (params?.parentId === null) {
        where.parentId = IsNull();
    } else if (params?.parentId) {
        where.parentId = params.parentId;
    }
    
    if (!params?.includeInactive) {
        where.isActive = true;
    }
    
    return await repo.find({
        where,
        order: { sortOrder: 'ASC', name: 'ASC' }
    });
}

export async function getCategoryTree(): Promise<CategoryNode[]> {
    const ds = await getDataSource();
    
    // Obtener todas las categorías con conteo de productos
    const categories = await ds.query(`
        SELECT 
            c.*,
            COUNT(DISTINCT p.id) as productCount
        FROM categories c
        LEFT JOIN products p ON p.categoryId = c.id AND p.deletedAt IS NULL
        WHERE c.isActive = true AND c.deletedAt IS NULL
        GROUP BY c.id
        ORDER BY c.sortOrder, c.name
    `);
    
    // Construir árbol
    const buildTree = (parentId: string | null): CategoryNode[] => {
        return categories
            .filter((c: any) => c.parentId === parentId)
            .map((c: any) => ({
                ...c,
                children: buildTree(c.id)
            }));
    };
    
    return buildTree(null);
}

export async function createCategory(data: CreateCategoryDTO): Promise<CategoryResult> {
    try {
        const ds = await getDataSource();
        const repo = ds.getRepository(Category);
        
        // Obtener siguiente sortOrder si no se especifica
        let sortOrder = data.sortOrder;
        if (sortOrder === undefined) {
            const lastCategory = await repo.findOne({
                where: { parentId: data.parentId ?? IsNull() },
                order: { sortOrder: 'DESC' }
            });
            sortOrder = (lastCategory?.sortOrder ?? 0) + 1;
        }
        
        const category = repo.create({
            name: data.name,
            description: data.description,
            parentId: data.parentId,
            sortOrder
        });
        
        await repo.save(category);
        
        revalidatePath('/admin/categories');
        
        return { success: true, category };
        
    } catch (error) {
        console.error('Error creating category:', error);
        return { success: false, error: 'Error al crear categoría' };
    }
}

export async function deleteCategory(id: string): Promise<{ success: boolean; error?: string }> {
    const ds = await getDataSource();
    
    // Verificar subcategorías
    const children = await ds.getRepository(Category).count({
        where: { parentId: id, deletedAt: IsNull() }
    });
    if (children > 0) {
        return { success: false, error: 'No se puede eliminar: tiene subcategorías' };
    }
    
    // Verificar productos
    const products = await ds.getRepository(Product).count({
        where: { categoryId: id, deletedAt: IsNull() }
    });
    if (products > 0) {
        return { success: false, error: 'No se puede eliminar: tiene productos' };
    }
    
    await ds.getRepository(Category).softDelete(id);
    
    revalidatePath('/admin/categories');
    
    return { success: true };
}

export async function reorderCategories(items: ReorderItem[]): Promise<{ success: boolean }> {
    const ds = await getDataSource();
    const repo = ds.getRepository(Category);
    
    for (const item of items) {
        await repo.update(item.id, { sortOrder: item.sortOrder });
    }
    
    revalidatePath('/admin/categories');
    
    return { success: true };
}
```
