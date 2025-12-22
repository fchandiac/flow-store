# Server Action: suppliers.ts

## Ubicación
`app/actions/suppliers.ts`

---

## Descripción

Server actions para la entidad **Supplier** (Proveedor).

> 📝 Supplier extiende Person. Los datos personales vienen de Person.

---

## Funciones

### getSuppliers

Obtiene proveedores con filtros.

```typescript
'use server'

interface GetSuppliersParams {
    search?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
}

interface SuppliersResponse {
    data: (Supplier & { person: Person })[];
    total: number;
}

export async function getSuppliers(params?: GetSuppliersParams): Promise<SuppliersResponse>
```

---

### getSupplierById

Obtiene un proveedor con detalles.

```typescript
interface SupplierWithDetails extends Supplier {
    person: Person;
    products: Product[];  // Productos que provee
    recentPurchases: Transaction[];
}

export async function getSupplierById(id: string): Promise<SupplierWithDetails | null>
```

---

### createSupplier

Crea un nuevo proveedor.

```typescript
interface CreateSupplierDTO {
    personId?: string;
    person?: {
        type: PersonType;
        firstName: string;
        lastName?: string;
        businessName?: string;
        documentType?: string;
        documentNumber?: string;
        email?: string;
        phone?: string;
        address?: string;
    };
    supplierCode?: string;
    contactName?: string;
    contactPhone?: string;
    paymentDays?: number;
    notes?: string;
}

interface SupplierResult {
    success: boolean;
    supplier?: Supplier;
    error?: string;
}

export async function createSupplier(data: CreateSupplierDTO): Promise<SupplierResult>
```

**Uso:**
```tsx
const result = await createSupplier({
    person: {
        type: PersonType.COMPANY,
        firstName: 'Distribuidora ABC',
        businessName: 'Distribuidora ABC S.A.',
        documentNumber: '76.999.888-7',
        address: 'Zona Industrial 789'
    },
    supplierCode: 'PROV-001',
    contactName: 'Juan Contacto',
    contactPhone: '+56998765432',
    paymentDays: 30
});
```

---

### updateSupplier

Actualiza un proveedor.

```typescript
interface UpdateSupplierDTO {
    supplierCode?: string;
    contactName?: string;
    contactPhone?: string;
    paymentDays?: number;
    notes?: string;
    isActive?: boolean;
}

export async function updateSupplier(
    id: string, 
    data: UpdateSupplierDTO
): Promise<SupplierResult>
```

---

### deleteSupplier

Elimina (soft delete) un proveedor.

```typescript
export async function deleteSupplier(id: string): Promise<{ success: boolean; error?: string }>
```

---

### searchSuppliers

Búsqueda rápida.

```typescript
export async function searchSuppliers(query: string): Promise<Supplier[]>
```

---

### getSupplierProducts

Obtiene productos de un proveedor.

```typescript
export async function getSupplierProducts(supplierId: string): Promise<Product[]>
```

---

### getSupplierPurchases

Obtiene historial de compras a un proveedor.

```typescript
export async function getSupplierPurchases(
    supplierId: string,
    params?: { dateFrom?: Date; dateTo?: Date }
): Promise<Transaction[]>
```

---

## Implementación

```typescript
'use server'

import { getDataSource } from '@/data/db';
import { Supplier } from '@/data/entities/Supplier';
import { Person } from '@/data/entities/Person';
import { Product } from '@/data/entities/Product';
import { revalidatePath } from 'next/cache';

export async function getSuppliers(params?: GetSuppliersParams): Promise<SuppliersResponse> {
    const ds = await getDataSource();
    const repo = ds.getRepository(Supplier);
    
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    
    const qb = repo.createQueryBuilder('s')
        .leftJoinAndSelect('s.person', 'p')
        .where('s.deletedAt IS NULL');
    
    if (params?.isActive !== undefined) {
        qb.andWhere('s.isActive = :isActive', { isActive: params.isActive });
    }
    
    if (params?.search) {
        qb.andWhere(
            '(p.firstName LIKE :search OR p.businessName LIKE :search OR p.documentNumber LIKE :search OR s.supplierCode LIKE :search)',
            { search: `%${params.search}%` }
        );
    }
    
    const [data, total] = await qb
        .orderBy('p.firstName', 'ASC')
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();
    
    return { data, total };
}

export async function createSupplier(data: CreateSupplierDTO): Promise<SupplierResult> {
    const ds = await getDataSource();
    const queryRunner = ds.createQueryRunner();
    
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    try {
        let personId = data.personId;
        
        if (data.person && !personId) {
            const person = queryRunner.manager.create(Person, data.person);
            await queryRunner.manager.save(person);
            personId = person.id;
        }
        
        if (!personId) {
            return { success: false, error: 'Se requiere persona' };
        }
        
        const existing = await queryRunner.manager.findOne(Supplier, {
            where: { personId }
        });
        if (existing) {
            return { success: false, error: 'Ya existe un proveedor para esta persona' };
        }
        
        const supplier = queryRunner.manager.create(Supplier, {
            personId,
            supplierCode: data.supplierCode,
            contactName: data.contactName,
            contactPhone: data.contactPhone,
            paymentDays: data.paymentDays ?? 0,
            notes: data.notes
        });
        
        await queryRunner.manager.save(supplier);
        await queryRunner.commitTransaction();
        
        revalidatePath('/admin/suppliers');
        
        return { success: true, supplier };
        
    } catch (error) {
        await queryRunner.rollbackTransaction();
        console.error('Error creating supplier:', error);
        return { success: false, error: 'Error al crear proveedor' };
    } finally {
        await queryRunner.release();
    }
}

export async function getSupplierProducts(supplierId: string): Promise<Product[]> {
    const ds = await getDataSource();
    
    return await ds.getRepository(Product).find({
        where: { defaultSupplierId: supplierId },
        relations: ['variants', 'category']
    });
}
```
