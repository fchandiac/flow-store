# Server Action: pointsOfSale.ts

## Ubicación
`app/actions/pointsOfSale.ts`

---

## Descripción

Server actions para la entidad **PointOfSale** (Punto de Venta/Terminal).

---

## Funciones

### getPointsOfSale

Obtiene todos los puntos de venta.

```typescript
'use server'

interface GetPOSParams {
    branchId?: string;
    includeInactive?: boolean;
}

export async function getPointsOfSale(params?: GetPOSParams): Promise<PointOfSale[]>
```

---

### getPointOfSaleById

Obtiene un punto de venta por ID con su sesión activa.

```typescript
interface POSWithSession extends PointOfSale {
    activeSession?: CashSession;
}

export async function getPointOfSaleById(id: string): Promise<POSWithSession | null>
```

**Uso:**
```tsx
const pos = await getPointOfSaleById(posId);
if (pos.activeSession) {
    // Hay sesión abierta
    console.log('Sesión:', pos.activeSession.id);
}
```

---

### createPointOfSale

Crea un nuevo punto de venta.

```typescript
interface CreatePOSDTO {
    name: string;
    code: string;
    branchId: string;
    storageId: string;
}

interface POSResult {
    success: boolean;
    pointOfSale?: PointOfSale;
    error?: string;
}

export async function createPointOfSale(data: CreatePOSDTO): Promise<POSResult>
```

**Uso:**
```tsx
const result = await createPointOfSale({
    name: 'Caja 1',
    code: 'POS-001',
    branchId: branch.id,
    storageId: storage.id
});
```

---

### updatePointOfSale

Actualiza un punto de venta.

```typescript
interface UpdatePOSDTO {
    name?: string;
    code?: string;
    storageId?: string;
    isActive?: boolean;
}

export async function updatePointOfSale(
    id: string, 
    data: UpdatePOSDTO
): Promise<POSResult>
```

---

### deletePointOfSale

Elimina un punto de venta.

```typescript
export async function deletePointOfSale(id: string): Promise<{ success: boolean; error?: string }>
```

> ⚠️ No se puede eliminar si tiene sesiones o transacciones.

---

### getPOSStatus

Obtiene el estado actual de un punto de venta.

```typescript
interface POSStatus {
    pointOfSale: PointOfSale;
    hasActiveSession: boolean;
    activeSession?: {
        id: string;
        openedAt: Date;
        openingBalance: number;
        currentBalance: number;
        transactionCount: number;
    };
}

export async function getPOSStatus(posId: string): Promise<POSStatus>
```

**Uso:**
```tsx
const status = await getPOSStatus(posId);
if (!status.hasActiveSession) {
    // Mostrar botón "Abrir Caja"
}
```

---

## Implementación

```typescript
'use server'

import { getDataSource } from '@/data/db';
import { PointOfSale } from '@/data/entities/PointOfSale';
import { CashSession, CashSessionStatus } from '@/data/entities/CashSession';
import { revalidatePath } from 'next/cache';

export async function getPointsOfSale(params?: GetPOSParams): Promise<PointOfSale[]> {
    const ds = await getDataSource();
    const repo = ds.getRepository(PointOfSale);
    
    const qb = repo.createQueryBuilder('pos')
        .leftJoinAndSelect('pos.branch', 'branch')
        .leftJoinAndSelect('pos.storage', 'storage');
    
    if (params?.branchId) {
        qb.andWhere('pos.branchId = :branchId', { branchId: params.branchId });
    }
    
    if (!params?.includeInactive) {
        qb.andWhere('pos.isActive = :isActive', { isActive: true });
    }
    
    return await qb.orderBy('pos.name', 'ASC').getMany();
}

export async function getPointOfSaleById(id: string): Promise<POSWithSession | null> {
    const ds = await getDataSource();
    
    const pos = await ds.getRepository(PointOfSale).findOne({
        where: { id },
        relations: ['branch', 'storage']
    });
    
    if (!pos) return null;
    
    // Buscar sesión activa
    const activeSession = await ds.getRepository(CashSession).findOne({
        where: {
            pointOfSaleId: id,
            status: CashSessionStatus.OPEN
        }
    });
    
    return { ...pos, activeSession };
}

export async function getPOSStatus(posId: string): Promise<POSStatus> {
    const ds = await getDataSource();
    
    const pos = await ds.getRepository(PointOfSale).findOneOrFail({
        where: { id: posId }
    });
    
    const activeSession = await ds.getRepository(CashSession).findOne({
        where: {
            pointOfSaleId: posId,
            status: CashSessionStatus.OPEN
        }
    });
    
    if (!activeSession) {
        return { pointOfSale: pos, hasActiveSession: false };
    }
    
    // Calcular balance actual desde transacciones
    const currentBalance = await calculateSessionBalance(ds, activeSession.id);
    const transactionCount = await countSessionTransactions(ds, activeSession.id);
    
    return {
        pointOfSale: pos,
        hasActiveSession: true,
        activeSession: {
            id: activeSession.id,
            openedAt: activeSession.openedAt,
            openingBalance: activeSession.openingBalance,
            currentBalance,
            transactionCount
        }
    };
}
```
