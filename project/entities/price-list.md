# Entidad: PriceList

## 1. Descripción

La entidad `PriceList` permite manejar múltiples listas de precios (mayoreo, menudeo, distribuidores, etc.) para los productos.

---

## 2. Estructura

```typescript
@Entity("price_lists")
export class PriceList {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "varchar", length: 100 })
    name: string;

    @Column({ type: "varchar", length: 300, nullable: true })
    description?: string;

    @Column({ type: "boolean", default: false })
    isDefault: boolean;  // Lista de precios por defecto

    @Column({ type: "decimal", precision: 5, scale: 2, nullable: true })
    discountPercent?: number;  // Descuento global (opcional)

    @Column({ type: "boolean", default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Relaciones
    @OneToMany(() => PriceListItem, item => item.priceList)
    items: PriceListItem[];
}

@Entity("price_list_items")
export class PriceListItem {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "uuid" })
    priceListId: string;

    @Column({ type: "uuid" })
    productVariantId: string;

    @Column({ type: "decimal", precision: 12, scale: 2 })
    price: number;

    @Column({ type: "int", default: 1 })
    minQuantity: number;  // Cantidad mínima para este precio

    // Relaciones
    @ManyToOne(() => PriceList, pl => pl.items, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'priceListId' })
    priceList: PriceList;

    @ManyToOne(() => ProductVariant, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'productVariantId' })
    productVariant: ProductVariant;
}
```

---

## 3. Diagrama

```
PriceList
├── id: UUID (PK)
├── name: varchar(100)
├── description: varchar(300) nullable
├── isDefault: boolean
├── discountPercent: decimal(5,2) nullable
├── isActive: boolean
├── createdAt: timestamp
└── updatedAt: timestamp

PriceListItem
├── id: UUID (PK)
├── priceListId: UUID (FK → PriceList)
├── productVariantId: UUID (FK → ProductVariant)
├── price: decimal(12,2)
└── minQuantity: int
```

---

## 4. Ejemplo de Uso

```
Lista "Menudeo" (default)
├── Manzana Roja: $50.00 (min: 1)
├── Manzana Roja: $45.00 (min: 10)
└── Naranja: $30.00 (min: 1)

Lista "Mayoreo"
├── Manzana Roja: $40.00 (min: 1)
├── Manzana Roja: $35.00 (min: 50)
└── Naranja: $25.00 (min: 1)

Lista "Distribuidores" (discountPercent: 20%)
└── (aplica 20% descuento sobre precio base)
```

---

## 5. Relación con Transaction

El precio de lista se usa al crear la transacción:

```typescript
// Al crear una venta
const priceListItem = await getPriceForVariant(
    variantId, 
    priceListId, 
    quantity
);

const line: TransactionLine = {
    productVariantId: variantId,
    quantity: quantity,
    unitPrice: priceListItem.price,  // Precio de la lista
    // ...
}
```

---

## 6. Selección de Precio

```typescript
// Obtener precio según cantidad
async function getPrice(
    variantId: string, 
    priceListId: string, 
    qty: number
): Promise<number> {
    const item = await priceListItemRepo
        .createQueryBuilder('pli')
        .where('pli.priceListId = :priceListId', { priceListId })
        .andWhere('pli.productVariantId = :variantId', { variantId })
        .andWhere('pli.minQuantity <= :qty', { qty })
        .orderBy('pli.minQuantity', 'DESC')
        .getOne();
    
    return item?.price ?? variant.salePrice;
}
```
