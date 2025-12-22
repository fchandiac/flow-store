# Entidad: Product

## 1. Descripción

La entidad `Product` representa un producto base que puede tener múltiples variantes (SKUs). Cada producto pertenece a una categoría.

---

## 2. Estructura

```typescript
@Entity("products")
export class Product {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "varchar", length: 100, unique: true })
    code: string;  // Código único del producto

    @Column({ type: "varchar", length: 200 })
    name: string;

    @Column({ type: "varchar", length: 500, nullable: true })
    description?: string;

    @Column({ type: "uuid", nullable: true })
    categoryId?: string;

    @Column({ type: "uuid", nullable: true })
    defaultSupplierId?: string;

    @Column({ type: "varchar", length: 20, nullable: true })
    unitOfMeasure?: string;  // kg, unidad, caja, etc.

    @Column({ type: "boolean", default: true })
    isActive: boolean;

    @Column({ type: "boolean", default: true })
    trackInventory: boolean;  // Si maneja inventario

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @DeleteDateColumn()
    deletedAt?: Date;

    // Relaciones
    @ManyToOne(() => Category, cat => cat.products, { nullable: true })
    @JoinColumn({ name: 'categoryId' })
    category?: Category;

    @ManyToOne(() => Supplier, { nullable: true })
    @JoinColumn({ name: 'defaultSupplierId' })
    defaultSupplier?: Supplier;

    @OneToMany(() => ProductVariant, variant => variant.product)
    variants: ProductVariant[];
}
```

---

## 3. Diagrama

```
Product
├── id: UUID (PK)
├── code: varchar(100) UNIQUE
├── name: varchar(200)
├── description: varchar(500) nullable
├── categoryId: UUID (FK → Category) nullable
├── defaultSupplierId: UUID (FK → Supplier) nullable
├── unitOfMeasure: varchar(20) nullable
├── isActive: boolean
├── trackInventory: boolean
├── createdAt: timestamp
├── updatedAt: timestamp
└── deletedAt: timestamp (soft delete)
```

---

## 4. Relación con Transaction

Los productos se relacionan con Transaction a través de `TransactionLine`:

```typescript
// Estructura de Transaction con líneas
const transaction: Transaction = {
    type: TransactionType.SALE,
    // ...
    lines: [
        {
            productVariantId: variant.id,
            quantity: 5,
            unitPrice: 100.00,
            total: 500.00
        }
    ]
}
```

---

## 5. Variantes vs Producto

```
Product "Manzana"
├── ProductVariant "Manzana Roja" (SKU: MZ-001-R)
├── ProductVariant "Manzana Verde" (SKU: MZ-001-V)
└── ProductVariant "Manzana Fuji" (SKU: MZ-001-F)
```

> El inventario se rastrea a nivel de `ProductVariant`, no de `Product`
