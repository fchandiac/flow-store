# Server Action: productVariants.ts

## Ubicación
`app/actions/productVariants.ts`

---

## Descripción

Server actions para la entidad **ProductVariant** (SKU/Variante).

---

## Funciones

### getVariantsByProduct

Obtiene variantes de un producto.

```typescript
'use server'

export async function getVariantsByProduct(productId: string): Promise<ProductVariant[]>
```

---

### getVariantById

Obtiene una variante por ID.

```typescript
interface VariantWithDetails extends ProductVariant {
    product: Product;
    stock: { storageId: string; storageName: string; quantity: number }[];
}

export async function getVariantById(id: string): Promise<VariantWithDetails | null>
```

---

### getVariantBySku

Obtiene variante por SKU o barcode.

```typescript
export async function getVariantBySku(sku: string): Promise<ProductVariant | null>
export async function getVariantByBarcode(barcode: string): Promise<ProductVariant | null>
```

---

### createProductVariant

Crea una nueva variante.

```typescript
interface CreateVariantDTO {
    productId: string;
    sku: string;
    name: string;
    barcode?: string;
    costPrice?: number;
    salePrice: number;
    weight?: number;
    minStock?: number;
}

interface VariantResult {
    success: boolean;
    variant?: ProductVariant;
    error?: string;
}

export async function createProductVariant(data: CreateVariantDTO): Promise<VariantResult>
```

**Uso:**
```tsx
// Agregar variante a producto existente
const result = await createProductVariant({
    productId: product.id,
    sku: 'MZ-001-V',
    name: 'Manzana Verde',
    salePrice: 1600,
    minStock: 5
});
```

---

### updateProductVariant

Actualiza una variante.

```typescript
interface UpdateVariantDTO {
    sku?: string;
    name?: string;
    barcode?: string;
    costPrice?: number;
    salePrice?: number;
    weight?: number;
    minStock?: number;
    isActive?: boolean;
}

export async function updateProductVariant(
    id: string, 
    data: UpdateVariantDTO
): Promise<VariantResult>
```

---

### deleteProductVariant

Elimina (soft delete) una variante.

```typescript
export async function deleteProductVariant(id: string): Promise<{ success: boolean; error?: string }>
```

---

### updateVariantPrices

Actualiza precios de múltiples variantes.

```typescript
interface PriceUpdate {
    variantId: string;
    costPrice?: number;
    salePrice?: number;
}

export async function updateVariantPrices(updates: PriceUpdate[]): Promise<{ success: boolean }>
```

**Uso:**
```tsx
// Actualización masiva de precios
await updateVariantPrices([
    { variantId: 'uuid-1', salePrice: 1500 },
    { variantId: 'uuid-2', salePrice: 1600, costPrice: 1000 },
]);
```

---

### getVariantStock

Obtiene stock de una variante.

```typescript
interface VariantStock {
    storageId: string;
    storageName: string;
    quantity: number;
    lastMovement?: Date;
}

export async function getVariantStock(variantId: string): Promise<VariantStock[]>
```

---

### getLowStockVariants

Obtiene variantes con bajo stock.

```typescript
interface LowStockItem {
    variant: ProductVariant;
    product: Product;
    storageId: string;
    storageName: string;
    currentStock: number;
    minStock: number;
}

export async function getLowStockVariants(
    storageId?: string
): Promise<LowStockItem[]>
```

---

## Implementación

```typescript
'use server'

import { getDataSource } from '@/data/db';
import { ProductVariant } from '@/data/entities/ProductVariant';
import { Product } from '@/data/entities/Product';
import { revalidatePath } from 'next/cache';

export async function getVariantsByProduct(productId: string): Promise<ProductVariant[]> {
    const ds = await getDataSource();
    
    return await ds.getRepository(ProductVariant).find({
        where: { productId, deletedAt: null },
        order: { name: 'ASC' }
    });
}

export async function getVariantBySku(sku: string): Promise<ProductVariant | null> {
    const ds = await getDataSource();
    
    return await ds.getRepository(ProductVariant).findOne({
        where: { sku },
        relations: ['product']
    });
}

export async function getVariantByBarcode(barcode: string): Promise<ProductVariant | null> {
    const ds = await getDataSource();
    
    return await ds.getRepository(ProductVariant).findOne({
        where: { barcode },
        relations: ['product']
    });
}

export async function createProductVariant(data: CreateVariantDTO): Promise<VariantResult> {
    try {
        const ds = await getDataSource();
        const repo = ds.getRepository(ProductVariant);
        
        // Verificar SKU único
        const existingSku = await repo.findOne({ where: { sku: data.sku } });
        if (existingSku) {
            return { success: false, error: 'SKU ya existe' };
        }
        
        // Verificar barcode único si se proporciona
        if (data.barcode) {
            const existingBarcode = await repo.findOne({ where: { barcode: data.barcode } });
            if (existingBarcode) {
                return { success: false, error: 'Código de barras ya existe' };
            }
        }
        
        const variant = repo.create({
            productId: data.productId,
            sku: data.sku,
            name: data.name,
            barcode: data.barcode,
            costPrice: data.costPrice ?? 0,
            salePrice: data.salePrice,
            weight: data.weight,
            minStock: data.minStock ?? 0
        });
        
        await repo.save(variant);
        
        revalidatePath('/admin/products');
        
        return { success: true, variant };
        
    } catch (error) {
        console.error('Error creating variant:', error);
        return { success: false, error: 'Error al crear variante' };
    }
}

export async function getVariantStock(variantId: string): Promise<VariantStock[]> {
    const ds = await getDataSource();
    
    const results = await ds.query(`
        SELECT 
            s.id as storageId,
            s.name as storageName,
            COALESCE(SUM(
                CASE 
                    WHEN t.type IN ('PURCHASE', 'STOCK_IN', 'SALE_RETURN') THEN tl.quantity
                    WHEN t.type IN ('SALE', 'STOCK_OUT', 'PURCHASE_RETURN') THEN -tl.quantity
                    ELSE 0
                END
            ), 0) as quantity,
            MAX(t.createdAt) as lastMovement
        FROM storages s
        LEFT JOIN transactions t ON t.storageId = s.id
        LEFT JOIN transaction_lines tl ON t.id = tl.transactionId AND tl.productVariantId = ?
        WHERE s.isActive = true
        GROUP BY s.id
        ORDER BY s.name
    `, [variantId]);
    
    return results;
}

export async function getLowStockVariants(storageId?: string): Promise<LowStockItem[]> {
    const ds = await getDataSource();
    
    const storageFilter = storageId ? `AND t.storageId = '${storageId}'` : '';
    
    const results = await ds.query(`
        SELECT 
            v.*,
            p.name as productName,
            p.code as productCode,
            s.id as storageId,
            s.name as storageName,
            COALESCE(SUM(
                CASE 
                    WHEN t.type IN ('PURCHASE', 'STOCK_IN', 'SALE_RETURN') THEN tl.quantity
                    WHEN t.type IN ('SALE', 'STOCK_OUT', 'PURCHASE_RETURN') THEN -tl.quantity
                    ELSE 0
                END
            ), 0) as currentStock
        FROM product_variants v
        JOIN products p ON p.id = v.productId
        CROSS JOIN storages s
        LEFT JOIN transaction_lines tl ON tl.productVariantId = v.id
        LEFT JOIN transactions t ON t.id = tl.transactionId AND t.storageId = s.id ${storageFilter}
        WHERE v.isActive = true
          AND p.trackInventory = true
          AND s.isActive = true
        GROUP BY v.id, s.id
        HAVING currentStock < v.minStock
        ORDER BY (v.minStock - currentStock) DESC
    `);
    
    return results;
}
```
