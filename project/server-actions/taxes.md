# Server Action: taxes.ts

## Ubicación
`app/actions/taxes.ts`

---

## Descripción

Server actions para la entidad **Tax** (Impuestos).

---

## Funciones

### getTaxes

Obtiene todos los impuestos.

```typescript
'use server'

interface GetTaxesParams {
    type?: TaxType;
    includeInactive?: boolean;
}

export async function getTaxes(params?: GetTaxesParams): Promise<Tax[]>
```

---

### getTaxById

Obtiene un impuesto por ID.

```typescript
export async function getTaxById(id: string): Promise<Tax | null>
```

---

### getDefaultTax

Obtiene el impuesto por defecto (IVA).

```typescript
export async function getDefaultTax(): Promise<Tax | null>
```

---

### createTax

Crea un nuevo impuesto.

```typescript
interface CreateTaxDTO {
    name: string;
    code: string;
    type: TaxType;
    rate: number;
    isIncludedInPrice?: boolean;
    isDefault?: boolean;
}

interface TaxResult {
    success: boolean;
    tax?: Tax;
    error?: string;
}

export async function createTax(data: CreateTaxDTO): Promise<TaxResult>
```

**Uso:**
```tsx
// IVA estándar
const result = await createTax({
    name: 'IVA 19%',
    code: 'IVA19',
    type: TaxType.VAT,
    rate: 19,
    isIncludedInPrice: true,
    isDefault: true
});

// Exento
const result = await createTax({
    name: 'Exento',
    code: 'IVA0',
    type: TaxType.VAT,
    rate: 0,
    isIncludedInPrice: true
});
```

---

### updateTax

Actualiza un impuesto.

```typescript
interface UpdateTaxDTO {
    name?: string;
    rate?: number;
    isIncludedInPrice?: boolean;
    isDefault?: boolean;
    isActive?: boolean;
}

export async function updateTax(id: string, data: UpdateTaxDTO): Promise<TaxResult>
```

---

### deleteTax

Elimina un impuesto.

```typescript
export async function deleteTax(id: string): Promise<{ success: boolean; error?: string }>
```

> ⚠️ No se puede eliminar si tiene transacciones asociadas o es el default.

---

### calculateTax

Calcula el impuesto para un monto.

```typescript
interface TaxCalculation {
    grossAmount: number;   // Monto bruto (con impuesto si incluido)
    netAmount: number;     // Monto neto (sin impuesto)
    taxAmount: number;     // Monto del impuesto
    rate: number;          // Tasa aplicada
}

export async function calculateTax(
    amount: number,
    taxId: string,
    amountIncludesTax?: boolean
): Promise<TaxCalculation>
```

**Uso:**
```tsx
// Precio incluye IVA
const calc = await calculateTax(1190, ivaId, true);
// { grossAmount: 1190, netAmount: 1000, taxAmount: 190, rate: 19 }

// Precio no incluye IVA
const calc = await calculateTax(1000, ivaId, false);
// { grossAmount: 1190, netAmount: 1000, taxAmount: 190, rate: 19 }
```

---

### calculateLineTax

Calcula impuesto para una línea de transacción.

```typescript
interface LineWithTax {
    quantity: number;
    unitPrice: number;
    discount?: number;
    taxId?: string;
}

interface LineTaxResult {
    subtotal: number;
    discountAmount: number;
    taxableAmount: number;
    taxAmount: number;
    total: number;
}

export async function calculateLineTax(line: LineWithTax): Promise<LineTaxResult>
```

---

## Implementación

```typescript
'use server'

import { getDataSource } from '@/data/db';
import { Tax, TaxType } from '@/data/entities/Tax';
import { revalidatePath } from 'next/cache';

export async function getTaxes(params?: GetTaxesParams): Promise<Tax[]> {
    const ds = await getDataSource();
    const repo = ds.getRepository(Tax);
    
    const where: any = {};
    
    if (params?.type) {
        where.type = params.type;
    }
    
    if (!params?.includeInactive) {
        where.isActive = true;
    }
    
    return await repo.find({
        where,
        order: { isDefault: 'DESC', name: 'ASC' }
    });
}

export async function getDefaultTax(): Promise<Tax | null> {
    const ds = await getDataSource();
    
    return await ds.getRepository(Tax).findOne({
        where: { isDefault: true, isActive: true }
    });
}

export async function createTax(data: CreateTaxDTO): Promise<TaxResult> {
    const ds = await getDataSource();
    const queryRunner = ds.createQueryRunner();
    
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    try {
        // Verificar código único
        const existing = await queryRunner.manager.findOne(Tax, {
            where: { code: data.code }
        });
        if (existing) {
            return { success: false, error: 'Código de impuesto ya existe' };
        }
        
        // Si es default, quitar default de otros
        if (data.isDefault) {
            await queryRunner.manager.update(Tax, {}, { isDefault: false });
        }
        
        // Obtener compañía
        const company = await queryRunner.manager.query(
            'SELECT id FROM companies WHERE isActive = true LIMIT 1'
        );
        
        const tax = queryRunner.manager.create(Tax, {
            ...data,
            companyId: company[0].id
        });
        
        await queryRunner.manager.save(tax);
        await queryRunner.commitTransaction();
        
        revalidatePath('/admin/taxes');
        
        return { success: true, tax };
        
    } catch (error) {
        await queryRunner.rollbackTransaction();
        console.error('Error creating tax:', error);
        return { success: false, error: 'Error al crear impuesto' };
    } finally {
        await queryRunner.release();
    }
}

export async function calculateTax(
    amount: number,
    taxId: string,
    amountIncludesTax: boolean = true
): Promise<TaxCalculation> {
    const ds = await getDataSource();
    
    const tax = await ds.getRepository(Tax).findOneOrFail({
        where: { id: taxId }
    });
    
    let netAmount: number;
    let taxAmount: number;
    let grossAmount: number;
    
    if (amountIncludesTax || tax.isIncludedInPrice) {
        // El monto ya incluye impuesto
        netAmount = amount / (1 + tax.rate / 100);
        taxAmount = amount - netAmount;
        grossAmount = amount;
    } else {
        // El monto no incluye impuesto
        netAmount = amount;
        taxAmount = amount * (tax.rate / 100);
        grossAmount = amount + taxAmount;
    }
    
    return {
        grossAmount: Math.round(grossAmount * 100) / 100,
        netAmount: Math.round(netAmount * 100) / 100,
        taxAmount: Math.round(taxAmount * 100) / 100,
        rate: tax.rate
    };
}

export async function calculateLineTax(line: LineWithTax): Promise<LineTaxResult> {
    const subtotal = line.quantity * line.unitPrice;
    const discountAmount = line.discount ? subtotal * (line.discount / 100) : 0;
    const taxableAmount = subtotal - discountAmount;
    
    let taxAmount = 0;
    if (line.taxId) {
        const calc = await calculateTax(taxableAmount, line.taxId, true);
        taxAmount = calc.taxAmount;
    }
    
    return {
        subtotal,
        discountAmount,
        taxableAmount,
        taxAmount,
        total: taxableAmount
    };
}
```
