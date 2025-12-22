# Entidad: Tax

## 1. Descripción

La entidad `Tax` representa los impuestos configurados en el sistema. Permite manejar múltiples tipos de impuestos (IVA, retenciones, etc.) con diferentes tasas.

---

## 2. Estructura

```typescript
enum TaxType {
    VAT = 'VAT',           // IVA
    RETENTION = 'RETENTION', // Retención
    EXCISE = 'EXCISE',     // Impuesto especial
    OTHER = 'OTHER'
}

@Entity("taxes")
export class Tax {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "uuid" })
    companyId: string;

    @Column({ type: "varchar", length: 100 })
    name: string;  // "IVA 19%", "IVA Exento", etc.

    @Column({ type: "varchar", length: 20, unique: true })
    code: string;  // "IVA19", "IVA0", "RET10"

    @Column({ type: "enum", enum: TaxType, default: TaxType.VAT })
    type: TaxType;

    @Column({ type: "decimal", precision: 5, scale: 2 })
    rate: number;  // 19.00, 0.00, 10.00

    @Column({ type: "boolean", default: true })
    isIncludedInPrice: boolean;  // Precio incluye impuesto

    @Column({ type: "boolean", default: false })
    isDefault: boolean;  // Impuesto por defecto

    @Column({ type: "boolean", default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @DeleteDateColumn()
    deletedAt?: Date;

    // Relaciones
    @ManyToOne(() => Company, company => company.taxes, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'companyId' })
    company: Company;
}
```

---

## 3. Diagrama

```
Tax
├── id: UUID (PK)
├── companyId: UUID (FK → Company)
├── name: varchar(100)
├── code: varchar(20) UNIQUE
├── type: enum(VAT, RETENTION, EXCISE, OTHER)
├── rate: decimal(5,2)
├── isIncludedInPrice: boolean
├── isDefault: boolean
├── isActive: boolean
├── createdAt: timestamp
├── updatedAt: timestamp
└── deletedAt: timestamp (soft delete)
```

---

## 4. Ejemplos de Configuración

```json
// IVA estándar Chile
{
    "name": "IVA 19%",
    "code": "IVA19",
    "type": "VAT",
    "rate": 19.00,
    "isIncludedInPrice": true,
    "isDefault": true
}

// Exento de IVA
{
    "name": "Exento",
    "code": "IVA0",
    "type": "VAT",
    "rate": 0.00,
    "isIncludedInPrice": true,
    "isDefault": false
}

// Retención
{
    "name": "Retención 10%",
    "code": "RET10",
    "type": "RETENTION",
    "rate": 10.00,
    "isIncludedInPrice": false,
    "isDefault": false
}
```

---

## 5. Relación con Transaction

Los impuestos se aplican en las líneas de transacción:

```typescript
interface TransactionLine {
    productVariantId: string;
    quantity: number;
    unitPrice: number;
    taxId?: string;        // Impuesto aplicado
    taxAmount: number;     // Monto del impuesto
    subtotal: number;      // Sin impuesto
    total: number;         // Con impuesto
}

// Ejemplo: venta con IVA incluido
const line: TransactionLine = {
    productVariantId: "uuid-variant",
    quantity: 1,
    unitPrice: 1190.00,    // Precio con IVA
    taxId: "uuid-iva19",
    taxAmount: 190.00,     // IVA
    subtotal: 1000.00,     // Neto
    total: 1190.00
}
```

---

## 6. Cálculo de Impuestos

```typescript
class TaxService {
    // Calcular impuesto incluido en precio
    calculateIncludedTax(priceWithTax: number, rate: number): {
        net: number;
        tax: number;
    } {
        const net = priceWithTax / (1 + rate / 100);
        const tax = priceWithTax - net;
        return { net, tax };
    }

    // Calcular impuesto sobre precio neto
    calculateExcludedTax(netPrice: number, rate: number): {
        tax: number;
        total: number;
    } {
        const tax = netPrice * (rate / 100);
        const total = netPrice + tax;
        return { tax, total };
    }
}
```

---

## 7. Relación con Productos

Los productos pueden tener un impuesto por defecto:

```typescript
// En ProductVariant o Product
@Column({ type: "uuid", nullable: true })
defaultTaxId?: string;

@ManyToOne(() => Tax, { nullable: true })
@JoinColumn({ name: 'defaultTaxId' })
defaultTax?: Tax;
```

---

## 8. Transacciones de Tipo TAX

El sistema registra movimientos fiscales como transacciones:

| TransactionType | Descripción |
|-----------------|-------------|
| `TAX_LEDGER` | Registro de impuesto (débito fiscal) |
| `TAX_CREDIT` | Crédito fiscal (IVA de compras) |
| `TAX_PAYMENT` | Pago de impuestos |

```typescript
// Registro de IVA de una venta
const taxTransaction: Transaction = {
    type: TransactionType.TAX_LEDGER,
    taxId: tax.id,
    amount: taxAmount,
    relatedTransactionId: saleTransaction.id,  // Vinculado a la venta
    // ...
}
```
