# Entidad: ProductVariant

## 1. Descripción

La entidad `ProductVariant` representa una variante específica de un producto (SKU). Es la unidad que se vende, compra y rastrea en inventario.

---

## 2. Estructura

```typescript
@Entity("product_variants")
export class ProductVariant {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "uuid" })
    productId: string;

    @Column({ type: "varchar", length: 50, unique: true })
    sku: string;  // Stock Keeping Unit - identificador único

    @Column({ type: "varchar", length: 50, nullable: true })
    barcode?: string;

    @Column({ type: "varchar", length: 200 })
    name: string;  // Nombre específico de la variante

    @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
    costPrice: number;  // Precio de costo

    @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
    salePrice: number;  // Precio de venta base

    @Column({ type: "decimal", precision: 10, scale: 3, nullable: true })
    weight?: number;  // Peso en kg

    @Column({ type: "int", default: 0 })
    minStock: number;  // Stock mínimo para alertas

    @Column({ type: "boolean", default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @DeleteDateColumn()
    deletedAt?: Date;

    // Relaciones
    @ManyToOne(() => Product, product => product.variants, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'productId' })
    product: Product;
}
```

---

## 3. Diagrama

```
ProductVariant
├── id: UUID (PK)
├── productId: UUID (FK → Product)
├── sku: varchar(50) UNIQUE
├── barcode: varchar(50) nullable
├── name: varchar(200)
├── costPrice: decimal(12,2)
├── salePrice: decimal(12,2)
├── weight: decimal(10,3) nullable
├── minStock: int
├── isActive: boolean
├── createdAt: timestamp
├── updatedAt: timestamp
└── deletedAt: timestamp (soft delete)
```

---

## 4. Relación con Transaction

Las variantes aparecen en las líneas de transacción:

```typescript
interface TransactionLine {
    productVariantId: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    total: number;
}

// Ejemplo: venta de 10 unidades
const line: TransactionLine = {
    productVariantId: "uuid-variant",
    quantity: 10,
    unitPrice: 50.00,
    discount: 0,
    total: 500.00
}
```

---

## 5. Stock Calculado

El stock de una variante se calcula sumando todas las transacciones:

```sql
-- Stock actual de una variante en un storage
SELECT 
    SUM(CASE 
        WHEN type IN ('PURCHASE', 'STOCK_IN', 'SALE_RETURN') THEN quantity
        WHEN type IN ('SALE', 'STOCK_OUT', 'PURCHASE_RETURN') THEN -quantity
        ELSE 0
    END) as current_stock
FROM transactions t
JOIN transaction_lines tl ON t.id = tl.transactionId
WHERE tl.productVariantId = :variantId
  AND t.storageId = :storageId
```

> No existe campo `stock` en la variante - se calcula en tiempo real o con caché
