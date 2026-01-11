# Server Action: customers.ts

## Ubicación
`app/actions/customers.ts`

---

## Descripción

Server actions para la entidad **Customer** (Cliente).

> 📝 Customer extiende Person. Los datos personales vienen de Person.

---

## Funciones

### getCustomers

Obtiene clientes con filtros.

```typescript
'use server'

interface GetCustomersParams {
    search?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
}

interface CustomersResponse {
    data: (Customer & { person: Person })[];
    total: number;
}

export async function getCustomers(params?: GetCustomersParams): Promise<CustomersResponse>
```

---

### getCustomerById

Obtiene un cliente con su persona y transacciones recientes.

```typescript
interface CustomerWithDetails extends Customer {
    person: Person;
    recentTransactions: Transaction[];
    balance: number;  // Saldo pendiente si tiene crédito
}

export async function getCustomerById(id: string): Promise<CustomerWithDetails | null>
```

---

### createCustomer

Crea un nuevo cliente.

```typescript
interface CreateCustomerDTO {
    personId?: string;  // Vincular a persona existente
    // O crear persona nueva
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
    // Datos de cliente
    customerCode?: string;
    creditLimit?: number;
    creditDays?: number;
    notes?: string;
}

interface CustomerResult {
    success: boolean;
    customer?: Customer;
    error?: string;
}

export async function createCustomer(data: CreateCustomerDTO): Promise<CustomerResult>
```

**Uso:**
```tsx
// Cliente persona natural
const result = await createCustomer({
    person: {
        type: PersonType.NATURAL,
        firstName: 'Carlos',
        lastName: 'López',
        documentNumber: '11.222.333-4',
        phone: '+56912345678'
    },
    creditLimit: 100000,
    creditDays: 30
});

// Cliente empresa
const result = await createCustomer({
    person: {
        type: PersonType.COMPANY,
        firstName: 'Comercial XYZ',
        businessName: 'Comercial XYZ Ltda.',
        documentNumber: '76.111.222-3'
    },
    customerCode: 'CLI-001',
    creditLimit: 500000,
    creditDays: 45
});
```

---

### updateCustomer

Actualiza un cliente.

```typescript
interface UpdateCustomerDTO {
    customerCode?: string;
    creditLimit?: number;
    creditDays?: number;
    notes?: string;
    isActive?: boolean;
}

export async function updateCustomer(
    id: string, 
    data: UpdateCustomerDTO
): Promise<CustomerResult>
```

---

### deleteCustomer

Elimina (soft delete) un cliente.

```typescript
export async function deleteCustomer(id: string): Promise<{ success: boolean; error?: string }>
```

---

### searchCustomers

Búsqueda rápida para punto de venta.

```typescript
export async function searchCustomers(query: string): Promise<Customer[]>
```

**Uso:**
```tsx
// En POS, buscar cliente por nombre o documento
const customers = await searchCustomers('12.345');
```

---

### getCustomerTransactions

Obtiene historial de transacciones de un cliente.

```typescript
export async function getCustomerTransactions(
    customerId: string,
    params?: {
        dateFrom?: Date;
        dateTo?: Date;
        type?: TransactionType;
    }
): Promise<Transaction[]>
```

---

## Implementación

```typescript
'use server'

import { getDataSource } from '@/data/db';
import { Customer } from '@/data/entities/Customer';
import { Person } from '@/data/entities/Person';
import { revalidatePath } from 'next/cache';

export async function getCustomers(params?: GetCustomersParams): Promise<CustomersResponse> {
    const ds = await getDataSource();
    const repo = ds.getRepository(Customer);
    
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    
    const qb = repo.createQueryBuilder('c')
        .leftJoinAndSelect('c.person', 'p')
        .where('c.deletedAt IS NULL');
    
    if (params?.isActive !== undefined) {
        qb.andWhere('c.isActive = :isActive', { isActive: params.isActive });
    }
    
    if (params?.search) {
        qb.andWhere(
            '(p.firstName LIKE :search OR p.lastName LIKE :search OR p.documentNumber LIKE :search OR c.customerCode LIKE :search)',
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

export async function createCustomer(data: CreateCustomerDTO): Promise<CustomerResult> {
    const ds = await getDataSource();
    const queryRunner = ds.createQueryRunner();
    
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    try {
        let personId = data.personId;
        
        // Crear persona si se proporciona
        if (data.person && !personId) {
            const person = queryRunner.manager.create(Person, data.person);
            await queryRunner.manager.save(person);
            personId = person.id;
        }
        
        if (!personId) {
            return { success: false, error: 'Se requiere persona' };
        }
        
        // Verificar que no exista customer para esta persona
        const existing = await queryRunner.manager.findOne(Customer, {
            where: { personId }
        });
        if (existing) {
            return { success: false, error: 'Ya existe un cliente para esta persona' };
        }
        
        const customer = queryRunner.manager.create(Customer, {
            personId,
            customerCode: data.customerCode,
            creditLimit: data.creditLimit ?? 0,
            creditDays: data.creditDays ?? 0,
            notes: data.notes
        });
        
        await queryRunner.manager.save(customer);
        await queryRunner.commitTransaction();
        
        revalidatePath('/admin/customers');
        
        return { success: true, customer };
        
    } catch (error) {
        await queryRunner.rollbackTransaction();
        console.error('Error creating customer:', error);
        return { success: false, error: 'Error al crear cliente' };
    } finally {
        await queryRunner.release();
    }
}

export async function searchCustomers(query: string): Promise<Customer[]> {
    const ds = await getDataSource();
    
    return await ds.getRepository(Customer)
        .createQueryBuilder('c')
        .leftJoinAndSelect('c.person', 'p')
        .where('c.isActive = true')
        .andWhere('c.deletedAt IS NULL')
        .andWhere(
            '(p.firstName LIKE :q OR p.lastName LIKE :q OR p.documentNumber LIKE :q)',
            { q: `%${query}%` }
        )
        .orderBy('p.firstName', 'ASC')
        .take(10)
        .getMany();
}
```
