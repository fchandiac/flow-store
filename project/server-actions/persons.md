# Server Action: persons.ts

## Ubicación
`app/actions/persons.ts`

---

## Descripción

Server actions para la entidad **Person** (Persona base).

> 📝 Person es la entidad base para User, Customer y Supplier.

---

## Funciones

### getPersons

Obtiene personas con filtros.

```typescript
'use server'

interface GetPersonsParams {
    type?: PersonType;
    search?: string;
    page?: number;
    limit?: number;
}

interface PersonsResponse {
    data: Person[];
    total: number;
}

export async function getPersons(params?: GetPersonsParams): Promise<PersonsResponse>
```

**Uso:**
```tsx
// Buscar personas
const { data } = await getPersons({ search: 'Juan' });

// Solo personas jurídicas
const companies = await getPersons({ type: PersonType.COMPANY });
```

---

### getPersonById

Obtiene una persona con sus extensiones.

```typescript
interface PersonWithExtensions extends Person {
    user?: User;
    customer?: Customer;
    supplier?: Supplier;
}

export async function getPersonById(id: string): Promise<PersonWithExtensions | null>
```

---

### createPerson

Crea una nueva persona.

```typescript
interface CreatePersonDTO {
    type: PersonType;
    firstName: string;
    lastName?: string;  // Requerido si type = NATURAL
    businessName?: string;  // Requerido si type = COMPANY
    documentType?: string;
    documentNumber?: string;
    email?: string;
    phone?: string;
    address?: string;
}

interface PersonResult {
    success: boolean;
    person?: Person;
    error?: string;
}

export async function createPerson(data: CreatePersonDTO): Promise<PersonResult>
```

**Uso:**
```tsx
// Persona natural
const result = await createPerson({
    type: PersonType.NATURAL,
    firstName: 'Juan',
    lastName: 'Pérez',
    documentType: 'RUT',
    documentNumber: '12.345.678-9',
    email: 'juan@email.com'
});

// Persona jurídica
const result = await createPerson({
    type: PersonType.COMPANY,
    firstName: 'Empresa ABC',  // Nombre corto
    businessName: 'Empresa ABC Ltda.',
    documentType: 'RUT',
    documentNumber: '76.543.210-K'
});
```

---

### updatePerson

Actualiza una persona.

```typescript
interface UpdatePersonDTO {
    firstName?: string;
    lastName?: string;
    businessName?: string;
    documentType?: string;
    documentNumber?: string;
    email?: string;
    phone?: string;
    address?: string;
}

export async function updatePerson(
    id: string, 
    data: UpdatePersonDTO
): Promise<PersonResult>
```

---

### deletePerson

Elimina (soft delete) una persona.

```typescript
export async function deletePerson(id: string): Promise<{ success: boolean; error?: string }>
```

> ⚠️ No se puede eliminar si tiene User, Customer o Supplier asociados.

---

### searchPersons

Búsqueda rápida para autocompletar.

```typescript
export async function searchPersons(
    query: string,
    limit?: number
): Promise<Person[]>
```

**Uso:**
```tsx
// En componente de autocompletado
const suggestions = await searchPersons(inputValue, 10);
```

---

## Implementación

```typescript
'use server'

import { getDataSource } from '@/data/db';
import { Person, PersonType } from '@/data/entities/Person';
import { revalidatePath } from 'next/cache';

export async function getPersons(params?: GetPersonsParams): Promise<PersonsResponse> {
    const ds = await getDataSource();
    const repo = ds.getRepository(Person);
    
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    
    const qb = repo.createQueryBuilder('p')
        .where('p.deletedAt IS NULL');
    
    if (params?.type) {
        qb.andWhere('p.type = :type', { type: params.type });
    }
    
    if (params?.search) {
        qb.andWhere(
            '(p.firstName LIKE :search OR p.lastName LIKE :search OR p.documentNumber LIKE :search)',
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

export async function createPerson(data: CreatePersonDTO): Promise<PersonResult> {
    try {
        const ds = await getDataSource();
        const repo = ds.getRepository(Person);
        
        // Validaciones
        if (data.type === PersonType.NATURAL && !data.lastName) {
            return { success: false, error: 'Apellido requerido para persona natural' };
        }
        
        if (data.type === PersonType.COMPANY && !data.businessName) {
            return { success: false, error: 'Razón social requerida para empresa' };
        }
        
        // Verificar documento único
        if (data.documentNumber) {
            const existing = await repo.findOne({
                where: { documentNumber: data.documentNumber }
            });
            if (existing) {
                return { success: false, error: 'Documento ya registrado' };
            }
        }
        
        const person = repo.create(data);
        await repo.save(person);
        
        revalidatePath('/admin/persons');
        
        return { success: true, person };
        
    } catch (error) {
        console.error('Error creating person:', error);
        return { success: false, error: 'Error al crear persona' };
    }
}

export async function searchPersons(query: string, limit = 10): Promise<Person[]> {
    const ds = await getDataSource();
    
    return await ds.getRepository(Person)
        .createQueryBuilder('p')
        .where('p.deletedAt IS NULL')
        .andWhere(
            '(p.firstName LIKE :q OR p.lastName LIKE :q OR p.documentNumber LIKE :q OR p.businessName LIKE :q)',
            { q: `%${query}%` }
        )
        .orderBy('p.firstName', 'ASC')
        .take(limit)
        .getMany();
}
```
