# Server Action: priceLists.ts

## Ubicación
`app/actions/priceLists.ts`

---

## Descripción

Server actions para las entidades **PriceList** y **PriceListItem**.

---

## Funciones

### getPriceLists

Obtiene todas las listas de precios.

```typescript
'use server'

export async function getPriceLists(): Promise<PriceList[]>
```

---

### getPriceListById

Obtiene una lista de precios con sus items.

```typescript
interface PriceListWithItems extends PriceList {
    items: (PriceListItem & { productVariant: ProductVariant })[];
}

export async function getPriceListById(id: string): Promise<PriceListWithItems | null>
```

---

### getDefaultPriceList

Obtiene la lista de precios por defecto.

```typescript
export async function getDefaultPriceList(): Promise<PriceList | null>
```

---

### createPriceList

Crea una nueva lista de precios.

```typescript
interface CreatePriceListDTO {
    name: string;
    description?: string;
    isDefault?: boolean;
    discountPercent?: number;
}

interface PriceListResult {
    success: boolean;
    priceList?: PriceList;
    error?: string;
}

export async function createPriceList(data: CreatePriceListDTO): Promise<PriceListResult>
```

**Uso:**
```tsx
const result = await createPriceList({
    name: 'Mayoreo',
    description: 'Precios para compras mayoristas',
    discountPercent: 15
});
```

---

### updatePriceList

Actualiza una lista de precios.

```typescript
interface UpdatePriceListDTO {
    name?: string;
    description?: string;
    isDefault?: boolean;
    discountPercent?: number;
    isActive?: boolean;
}

export async function updatePriceList(
    id: string, 
    data: UpdatePriceListDTO
): Promise<PriceListResult>
```

---

### deletePriceList

Elimina una lista de precios.

```typescript
export async function deletePriceList(id: string): Promise<{ success: boolean; error?: string }>
```

> ⚠️ No se puede eliminar la lista por defecto.

---

### setPriceListItem

Establece el precio de una variante en una lista.

```typescript
interface SetPriceDTO {
    priceListId: string;
    productVariantId: string;
    price: number;
    minQuantity?: number;
}

export async function setPriceListItem(data: SetPriceDTO): Promise<{ success: boolean }>
```

**Uso:**
```tsx
// Precio normal
await setPriceListItem({
    priceListId: mayoreo.id,
    productVariantId: variant.id,
    price: 1200
});

// Precio por volumen
await setPriceListItem({
    priceListId: mayoreo.id,
    productVariantId: variant.id,
    price: 1000,
    minQuantity: 50
});
```

---

### removePriceListItem

Elimina un precio de una lista.

```typescript
export async function removePriceListItem(
    priceListId: string, 
    productVariantId: string,
    minQuantity?: number
): Promise<{ success: boolean }>
```

---

### getPriceForVariant

Obtiene el precio de una variante según lista y cantidad.

```typescript
export async function getPriceForVariant(
    productVariantId: string,
    priceListId?: string,
    quantity?: number
): Promise<number>
```

**Uso:**
```tsx
// Obtener precio según cantidad
const price = await getPriceForVariant(variant.id, priceList.id, 100);
```

---

### bulkSetPrices

Actualiza precios masivamente.

```typescript
interface BulkPriceItem {
    productVariantId: string;
    price: number;
    minQuantity?: number;
}

export async function bulkSetPrices(
    priceListId: string,
    items: BulkPriceItem[]
): Promise<{ success: boolean; updated: number }>
```

---

## Implementación

```typescript
'use server'

import { getDataSource } from '@/data/db';
import { PriceList, PriceListItem } from '@/data/entities/PriceList';
import { ProductVariant } from '@/data/entities/ProductVariant';
import { revalidatePath } from 'next/cache';

export async function getPriceLists(): Promise<PriceList[]> {
    const ds = await getDataSource();
    
    return await ds.getRepository(PriceList).find({
        where: { isActive: true },
        order: { isDefault: 'DESC', name: 'ASC' }
    });
}

export async function createPriceList(data: CreatePriceListDTO): Promise<PriceListResult> {
    const ds = await getDataSource();
    const queryRunner = ds.createQueryRunner();
    
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    try {
        // Si es default, quitar default de otras
        if (data.isDefault) {
            await queryRunner.manager.update(PriceList, {}, { isDefault: false });
        }
        
        const priceList = queryRunner.manager.create(PriceList, data);
        await queryRunner.manager.save(priceList);
        
        await queryRunner.commitTransaction();
        
        revalidatePath('/admin/price-lists');
        
        return { success: true, priceList };
        
    } catch (error) {
        await queryRunner.rollbackTransaction();
        console.error('Error creating price list:', error);
        return { success: false, error: 'Error al crear lista de precios' };
    } finally {
        await queryRunner.release();
    }
}

export async function setPriceListItem(data: SetPriceDTO): Promise<{ success: boolean }> {
    const ds = await getDataSource();
    const repo = ds.getRepository(PriceListItem);
    
    // Buscar item existente
    const existing = await repo.findOne({
        where: {
            priceListId: data.priceListId,
            productVariantId: data.productVariantId,
            minQuantity: data.minQuantity ?? 1
        }
    });
    
    if (existing) {
        existing.price = data.price;
        await repo.save(existing);
    } else {
        const item = repo.create({
            priceListId: data.priceListId,
            productVariantId: data.productVariantId,
            price: data.price,
            minQuantity: data.minQuantity ?? 1
        });
        await repo.save(item);
    }
    
    revalidatePath('/admin/price-lists');
    
    return { success: true };
}

export async function getPriceForVariant(
    productVariantId: string,
    priceListId?: string,
    quantity: number = 1
): Promise<number> {
    const ds = await getDataSource();
    
    // Si no hay lista, usar precio base de variante
    if (!priceListId) {
        const variant = await ds.getRepository(ProductVariant).findOneOrFail({
            where: { id: productVariantId }
        });
        return variant.salePrice;
    }
    
    // Buscar precio en lista
    const item = await ds.getRepository(PriceListItem)
        .createQueryBuilder('pli')
        .where('pli.priceListId = :priceListId', { priceListId })
        .andWhere('pli.productVariantId = :productVariantId', { productVariantId })
        .andWhere('pli.minQuantity <= :quantity', { quantity })
        .orderBy('pli.minQuantity', 'DESC')
        .getOne();
    
    if (item) {
        return item.price;
    }
    
    // Fallback: precio base con descuento de lista
    const priceList = await ds.getRepository(PriceList).findOneOrFail({
        where: { id: priceListId }
    });
    const variant = await ds.getRepository(ProductVariant).findOneOrFail({
        where: { id: productVariantId }
    });
    
    if (priceList.discountPercent) {
        return variant.salePrice * (1 - priceList.discountPercent / 100);
    }
    
    return variant.salePrice;
}
```
