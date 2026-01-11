# Server Action: companies.ts

## Ubicación
`app/actions/companies.ts`

---

## Descripción

Server actions para la entidad **Company**. 

> ⚠️ **Sistema de compañía única**: Solo existe una Company en el sistema.

---

## Funciones

### getCompany

Obtiene la configuración de la compañía.

```typescript
'use server'

export async function getCompany(): Promise<Company | null>
```

**Uso:**
```tsx
const company = await getCompany();
console.log(company.name, company.defaultCurrency);
```

---

### updateCompany

Actualiza la configuración de la compañía.

```typescript
interface UpdateCompanyDTO {
    name?: string;
    defaultCurrency?: string;
    fiscalYearStart?: Date;
    settings?: Record<string, any>;
}

interface UpdateResult {
    success: boolean;
    company?: Company;
    error?: string;
}

export async function updateCompany(data: UpdateCompanyDTO): Promise<UpdateResult>
```

**Uso:**
```tsx
const result = await updateCompany({
    name: 'Mi Empresa S.A.',
    defaultCurrency: 'CLP',
    settings: {
        inventory: { allowNegativeStock: false }
    }
});
```

---

### getCompanySettings

Obtiene configuraciones específicas.

```typescript
export async function getCompanySettings<T>(
    key: string
): Promise<T | null>
```

**Uso:**
```tsx
const inventorySettings = await getCompanySettings<{
    allowNegativeStock: boolean;
    costingMethod: string;
}>('inventory');
```

---

### updateCompanySettings

Actualiza configuraciones específicas.

```typescript
export async function updateCompanySettings(
    key: string,
    value: any
): Promise<{ success: boolean }>
```

**Uso:**
```tsx
await updateCompanySettings('invoicing', {
    prefix: 'F',
    nextNumber: 1001
});
```

---

## Implementación

```typescript
'use server'

import { getDataSource } from '@/data/db';
import { Company } from '@/data/entities/Company';
import { revalidatePath } from 'next/cache';

export async function getCompany(): Promise<Company | null> {
    const ds = await getDataSource();
    const repo = ds.getRepository(Company);
    
    // Solo hay una compañía
    return await repo.findOne({ 
        where: { isActive: true } 
    });
}

export async function updateCompany(data: UpdateCompanyDTO): Promise<UpdateResult> {
    try {
        const ds = await getDataSource();
        const repo = ds.getRepository(Company);
        
        const company = await repo.findOne({ where: { isActive: true } });
        if (!company) {
            return { success: false, error: 'Compañía no encontrada' };
        }
        
        // Merge settings si se proporcionan
        if (data.settings) {
            data.settings = { ...company.settings, ...data.settings };
        }
        
        Object.assign(company, data);
        await repo.save(company);
        
        revalidatePath('/admin/settings');
        
        return { success: true, company };
        
    } catch (error) {
        console.error('Error updating company:', error);
        return { success: false, error: 'Error al actualizar' };
    }
}
```
