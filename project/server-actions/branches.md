# Server Action: branches.ts

## Ubicación
`app/actions/branches.ts`

---

## Descripción

Server actions para la entidad **Branch** (Sucursal).

---

## Funciones

### getBranches

Obtiene todas las sucursales.

```typescript
'use server'

interface GetBranchesParams {
    includeInactive?: boolean;
}

export async function getBranches(
    params?: GetBranchesParams
): Promise<Branch[]>
```

**Uso:**
```tsx
const branches = await getBranches();
const allBranches = await getBranches({ includeInactive: true });
```

---

### getBranchById

Obtiene una sucursal por ID con sus relaciones.

```typescript
export async function getBranchById(
    id: string
): Promise<Branch | null>
```

---

### createBranch

Crea una nueva sucursal.

```typescript
interface CreateBranchDTO {
    name: string;
    code: string;
    address?: string;
    phone?: string;
    email?: string;
}

interface BranchResult {
    success: boolean;
    branch?: Branch;
    error?: string;
}

export async function createBranch(data: CreateBranchDTO): Promise<BranchResult>
```

**Uso:**
```tsx
const result = await createBranch({
    name: 'Sucursal Centro',
    code: 'SUC-001',
    address: 'Av. Principal 123'
});
```

---

### updateBranch

Actualiza una sucursal existente.

```typescript
interface UpdateBranchDTO {
    name?: string;
    code?: string;
    address?: string;
    phone?: string;
    email?: string;
    isActive?: boolean;
}

export async function updateBranch(
    id: string, 
    data: UpdateBranchDTO
): Promise<BranchResult>
```

---

### deleteBranch

Elimina (soft delete) una sucursal.

```typescript
export async function deleteBranch(id: string): Promise<{ success: boolean; error?: string }>
```

> ⚠️ No se puede eliminar si tiene transacciones asociadas.

---

### getBranchStorages

Obtiene los almacenes de una sucursal.

```typescript
export async function getBranchStorages(branchId: string): Promise<Storage[]>
```

---

### getBranchPointsOfSale

Obtiene los puntos de venta de una sucursal.

```typescript
export async function getBranchPointsOfSale(branchId: string): Promise<PointOfSale[]>
```

---

## Implementación

```typescript
'use server'

import { getDataSource } from '@/data/db';
import { Branch } from '@/data/entities/Branch';
import { Storage } from '@/data/entities/Storage';
import { revalidatePath } from 'next/cache';

export async function getBranches(params?: GetBranchesParams): Promise<Branch[]> {
    const ds = await getDataSource();
    const repo = ds.getRepository(Branch);
    
    const where: any = {};
    if (!params?.includeInactive) {
        where.isActive = true;
    }
    
    return await repo.find({
        where,
        order: { name: 'ASC' }
    });
}

export async function createBranch(data: CreateBranchDTO): Promise<BranchResult> {
    const ds = await getDataSource();
    const queryRunner = ds.createQueryRunner();
    
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    try {
        // Obtener compañía
        const company = await queryRunner.manager.findOne(Company, { 
            where: { isActive: true } 
        });
        
        // Crear sucursal
        const branch = queryRunner.manager.create(Branch, {
            ...data,
            companyId: company.id
        });
        await queryRunner.manager.save(branch);
        
        // Crear storage por defecto para la sucursal
        const storage = queryRunner.manager.create(Storage, {
            name: `Almacén ${data.name}`,
            code: `ALM-${data.code}`,
            type: StorageType.IN_BRANCH,
            branchId: branch.id,
            companyId: company.id
        });
        await queryRunner.manager.save(storage);
        
        await queryRunner.commitTransaction();
        
        revalidatePath('/admin/branches');
        
        return { success: true, branch };
        
    } catch (error) {
        await queryRunner.rollbackTransaction();
        console.error('Error creating branch:', error);
        return { success: false, error: 'Error al crear sucursal' };
    } finally {
        await queryRunner.release();
    }
}
```
