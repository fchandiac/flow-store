# Server Action: storages.ts

## Ubicación
`app/actions/storages.ts`

---

## Descripción

Server actions para la entidad **Storage** (Almacén/Bodega).

---

## Funciones

### getStorages

Obtiene todos los almacenes.

```typescript
'use server'

interface GetStoragesParams {
    branchId?: string;
    type?: StorageType;
    includeInactive?: boolean;
}

export async function getStorages(params?: GetStoragesParams): Promise<Storage[]>
```

**Uso:**
```tsx
// Todos los almacenes activos
const storages = await getStorages();

// Almacenes de una sucursal
const branchStorages = await getStorages({ branchId: branch.id });

// Solo almacenes centrales
const centralStorages = await getStorages({ type: StorageType.CENTRAL });
```

---

### getStorageById

Obtiene un almacén por ID.

```typescript
export async function getStorageById(id: string): Promise<Storage | null>
```

---

### createStorage

Crea un nuevo almacén.

```typescript
interface CreateStorageDTO {
    name: string;
    code: string;
    type: StorageType;
    branchId?: string;  // Requerido si type = IN_BRANCH
    address?: string;
}

interface StorageResult {
    success: boolean;
    storage?: Storage;
    error?: string;
}

export async function createStorage(data: CreateStorageDTO): Promise<StorageResult>
```

**Uso:**
```tsx
// Almacén en sucursal
const result = await createStorage({
    name: 'Bodega Principal',
    code: 'BOD-001',
    type: StorageType.IN_BRANCH,
    branchId: branch.id
});

// Almacén central
const result = await createStorage({
    name: 'Centro de Distribución',
    code: 'CD-001',
    type: StorageType.CENTRAL,
    address: 'Zona Industrial 456'
});
```

---

### updateStorage

Actualiza un almacén existente.

```typescript
interface UpdateStorageDTO {
    name?: string;
    code?: string;
    address?: string;
    isActive?: boolean;
}

export async function updateStorage(
    id: string, 
    data: UpdateStorageDTO
): Promise<StorageResult>
```

---

### deleteStorage

Elimina (soft delete) un almacén.

```typescript
export async function deleteStorage(id: string): Promise<{ success: boolean; error?: string }>
```

> ⚠️ No se puede eliminar si tiene stock o transacciones.

---

### getStorageStock

Obtiene el stock de un almacén.

```typescript
interface StockItem {
    productVariant: ProductVariant;
    quantity: number;
    lastMovement: Date;
}

export async function getStorageStock(
    storageId: string,
    options?: {
        categoryId?: string;
        lowStockOnly?: boolean;
        search?: string;
    }
): Promise<StockItem[]>
```

**Uso:**
```tsx
// Todo el stock
const stock = await getStorageStock(storageId);

// Solo productos con bajo stock
const lowStock = await getStorageStock(storageId, { lowStockOnly: true });

// Buscar producto
const results = await getStorageStock(storageId, { search: 'manzana' });
```

---

## Implementación

```typescript
'use server'

import { getDataSource } from '@/data/db';
import { Storage } from '@/data/entities/Storage';
import { Transaction } from '@/data/entities/Transaction';
import { revalidatePath } from 'next/cache';

export async function getStorages(params?: GetStoragesParams): Promise<Storage[]> {
    const ds = await getDataSource();
    const repo = ds.getRepository(Storage);
    
    const qb = repo.createQueryBuilder('s')
        .leftJoinAndSelect('s.branch', 'branch');
    
    if (params?.branchId) {
        qb.andWhere('s.branchId = :branchId', { branchId: params.branchId });
    }
    
    if (params?.type) {
        qb.andWhere('s.type = :type', { type: params.type });
    }
    
    if (!params?.includeInactive) {
        qb.andWhere('s.isActive = :isActive', { isActive: true });
    }
    
    return await qb.orderBy('s.name', 'ASC').getMany();
}

export async function getStorageStock(
    storageId: string,
    options?: { categoryId?: string; lowStockOnly?: boolean; search?: string }
): Promise<StockItem[]> {
    const ds = await getDataSource();
    
    const query = `
        SELECT 
            pv.*,
            p.name as productName,
            p.categoryId,
            COALESCE(SUM(
                CASE 
                    WHEN t.type IN ('PURCHASE', 'STOCK_IN', 'SALE_RETURN') THEN tl.quantity
                    WHEN t.type IN ('SALE', 'STOCK_OUT', 'PURCHASE_RETURN') THEN -tl.quantity
                    ELSE 0
                END
            ), 0) as quantity,
            MAX(t.createdAt) as lastMovement
        FROM product_variants pv
        JOIN products p ON p.id = pv.productId
        LEFT JOIN transaction_lines tl ON tl.productVariantId = pv.id
        LEFT JOIN transactions t ON t.id = tl.transactionId AND t.storageId = ?
        WHERE pv.isActive = true
        ${options?.categoryId ? 'AND p.categoryId = ?' : ''}
        ${options?.search ? 'AND (pv.name LIKE ? OR pv.sku LIKE ?)' : ''}
        GROUP BY pv.id
        ${options?.lowStockOnly ? 'HAVING quantity < pv.minStock' : ''}
        ORDER BY p.name, pv.name
    `;
    
    const params = [storageId];
    if (options?.categoryId) params.push(options.categoryId);
    if (options?.search) {
        params.push(`%${options.search}%`, `%${options.search}%`);
    }
    
    return await ds.query(query, params);
}
```
