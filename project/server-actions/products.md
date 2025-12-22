# Server Action: products.ts

## Ubicación
`app/actions/products.ts`

---

## Descripción

Server actions para la entidad **Product** (Producto base).

---

## Funciones

### getProducts

Obtiene productos con filtros.

```typescript
'use server'

interface GetProductsParams {
    categoryId?: string;
    supplierId?: string;
    search?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
}

interface ProductsResponse {
    data: Product[];
    total: number;
}

export async function getProducts(params?: GetProductsParams): Promise<ProductsResponse>
```

---

### getProductById

Obtiene un producto con sus variantes.

```typescript
interface ProductWithDetails extends Product {
    category?: Category;
    defaultSupplier?: Supplier;
    variants: ProductVariant[];
}

export async function getProductById(id: string): Promise<ProductWithDetails | null>
```

---

### createProduct

Crea un nuevo producto.

```typescript
interface CreateProductDTO {
    code: string;
    name: string;
    description?: string;
    categoryId?: string;
    defaultSupplierId?: string;
    unitOfMeasure?: string;
    trackInventory?: boolean;
    // Variante inicial (opcional)
    variant?: {
        sku: string;
        name: string;
        barcode?: string;
        costPrice?: number;
        salePrice: number;
        minStock?: number;
    };
}

interface ProductResult {
    success: boolean;
    product?: Product;
    error?: string;
}

export async function createProduct(data: CreateProductDTO): Promise<ProductResult>
```

**Uso:**
```tsx
// Producto simple (una variante)
const result = await createProduct({
    code: 'PRD-001',
    name: 'Manzana',
    categoryId: fruitCategory.id,
    unitOfMeasure: 'kg',
    variant: {
        sku: 'MZ-001',
        name: 'Manzana Roja',
        salePrice: 1500,
        minStock: 10
    }
});

// Producto sin variante inicial
const result = await createProduct({
    code: 'PRD-002',
    name: 'Naranja',
    categoryId: fruitCategory.id
});
// Luego agregar variantes con createProductVariant
```

---

### updateProduct

Actualiza un producto.

```typescript
interface UpdateProductDTO {
    code?: string;
    name?: string;
    description?: string;
    categoryId?: string;
    defaultSupplierId?: string;
    unitOfMeasure?: string;
    trackInventory?: boolean;
    isActive?: boolean;
}

export async function updateProduct(
    id: string, 
    data: UpdateProductDTO
): Promise<ProductResult>
```

---

### deleteProduct

Elimina (soft delete) un producto.

```typescript
export async function deleteProduct(id: string): Promise<{ success: boolean; error?: string }>
```

> ⚠️ No se puede eliminar si tiene transacciones asociadas.

---

### searchProducts

Búsqueda rápida para POS.

```typescript
interface ProductSearchResult {
    product: Product;
    variant: ProductVariant;
    stock: number;
}

export async function searchProducts(
    query: string,
    storageId?: string
): Promise<ProductSearchResult[]>
```

**Uso:**
```tsx
// En POS, buscar por código, SKU o nombre
const results = await searchProducts('manzana', currentStorage.id);
```

---

### getProductStock

Obtiene stock de un producto en todos los almacenes.

```typescript
interface ProductStockInfo {
    storageId: string;
    storageName: string;
    variantId: string;
    variantName: string;
    quantity: number;
}

export async function getProductStock(productId: string): Promise<ProductStockInfo[]>
```

---

## Implementación

```typescript
'use server'

import { getDataSource } from '@/data/db';
import { Product } from '@/data/entities/Product';
import { ProductVariant } from '@/data/entities/ProductVariant';
import { revalidatePath } from 'next/cache';

export async function getProducts(params?: GetProductsParams): Promise<ProductsResponse> {
    const ds = await getDataSource();
    const repo = ds.getRepository(Product);
    
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    
    const qb = repo.createQueryBuilder('p')
        .leftJoinAndSelect('p.category', 'c')
        .leftJoinAndSelect('p.variants', 'v')
        .where('p.deletedAt IS NULL');
    
    if (params?.categoryId) {
        qb.andWhere('p.categoryId = :categoryId', { categoryId: params.categoryId });
    }
    
    if (params?.supplierId) {
        qb.andWhere('p.defaultSupplierId = :supplierId', { supplierId: params.supplierId });
    }
    
    if (params?.isActive !== undefined) {
        qb.andWhere('p.isActive = :isActive', { isActive: params.isActive });
    }
    
    if (params?.search) {
        qb.andWhere(
            '(p.code LIKE :search OR p.name LIKE :search OR v.sku LIKE :search OR v.barcode LIKE :search)',
            { search: `%${params.search}%` }
        );
    }
    
    const [data, total] = await qb
        .orderBy('p.name', 'ASC')
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();
    
    return { data, total };
}

export async function createProduct(data: CreateProductDTO): Promise<ProductResult> {
    const ds = await getDataSource();
    const queryRunner = ds.createQueryRunner();
    
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    try {
        // Verificar código único
        const existing = await queryRunner.manager.findOne(Product, {
            where: { code: data.code }
        });
        if (existing) {
            return { success: false, error: 'Código de producto ya existe' };
        }
        
        // Crear producto
        const product = queryRunner.manager.create(Product, {
            code: data.code,
            name: data.name,
            description: data.description,
            categoryId: data.categoryId,
            defaultSupplierId: data.defaultSupplierId,
            unitOfMeasure: data.unitOfMeasure ?? 'unidad',
            trackInventory: data.trackInventory ?? true
        });
        
        await queryRunner.manager.save(product);
        
        // Crear variante inicial si se proporciona
        if (data.variant) {
            const variant = queryRunner.manager.create(ProductVariant, {
                productId: product.id,
                sku: data.variant.sku,
                name: data.variant.name,
                barcode: data.variant.barcode,
                costPrice: data.variant.costPrice ?? 0,
                salePrice: data.variant.salePrice,
                minStock: data.variant.minStock ?? 0
            });
            await queryRunner.manager.save(variant);
        }
        
        await queryRunner.commitTransaction();
        
        revalidatePath('/admin/products');
        
        return { success: true, product };
        
    } catch (error) {
        await queryRunner.rollbackTransaction();
        console.error('Error creating product:', error);
        return { success: false, error: 'Error al crear producto' };
    } finally {
        await queryRunner.release();
    }
}

export async function searchProducts(
    query: string,
    storageId?: string
): Promise<ProductSearchResult[]> {
    const ds = await getDataSource();
    
    const stockSubquery = storageId ? `
        (SELECT COALESCE(SUM(
            CASE 
                WHEN t.type IN ('PURCHASE', 'STOCK_IN', 'SALE_RETURN') THEN tl.quantity
                WHEN t.type IN ('SALE', 'STOCK_OUT', 'PURCHASE_RETURN') THEN -tl.quantity
                ELSE 0
            END
        ), 0)
        FROM transactions t
        JOIN transaction_lines tl ON t.id = tl.transactionId
        WHERE tl.productVariantId = v.id AND t.storageId = '${storageId}')
    ` : '0';
    
    const results = await ds.query(`
        SELECT 
            p.*,
            v.id as variantId,
            v.sku,
            v.name as variantName,
            v.barcode,
            v.salePrice,
            ${stockSubquery} as stock
        FROM products p
        JOIN product_variants v ON v.productId = p.id
        WHERE p.isActive = true
          AND v.isActive = true
          AND p.deletedAt IS NULL
          AND (p.code LIKE ? OR p.name LIKE ? OR v.sku LIKE ? OR v.barcode LIKE ?)
        ORDER BY p.name
        LIMIT 20
    `, [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`]);
    
    return results;
}
```
