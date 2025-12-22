# Entidad: Supplier

## 1. Descripción

La entidad `Supplier` extiende a `Person` para agregar información específica de proveedores. Un proveedor puede ser persona natural o empresa.

---

## 2. Estructura

```typescript
@Entity("suppliers")
export class Supplier {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "uuid" })
    personId: string;

    @Column({ type: "varchar", length: 20, nullable: true })
    supplierCode?: string;  // Código interno opcional

    @Column({ type: "varchar", length: 100, nullable: true })
    contactName?: string;  // Nombre del contacto

    @Column({ type: "varchar", length: 20, nullable: true })
    contactPhone?: string;

    @Column({ type: "int", default: 0 })
    paymentDays: number;  // Días de pago acordados

    @Column({ type: "varchar", length: 500, nullable: true })
    notes?: string;

    @Column({ type: "boolean", default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @DeleteDateColumn()
    deletedAt?: Date;

    // Relaciones
    @OneToOne(() => Person, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'personId' })
    person: Person;

    @OneToMany(() => Transaction, txn => txn.supplier)
    transactions: Transaction[];

    @OneToMany(() => Product, product => product.defaultSupplier)
    products: Product[];
}
```

---

## 3. Diagrama

```
Supplier
├── id: UUID (PK)
├── personId: UUID (FK → Person) UNIQUE
├── supplierCode: varchar(20) nullable
├── contactName: varchar(100) nullable
├── contactPhone: varchar(20) nullable
├── paymentDays: int
├── notes: varchar(500) nullable
├── isActive: boolean
├── createdAt: timestamp
├── updatedAt: timestamp
└── deletedAt: timestamp (soft delete)
```

---

## 4. Relación con Transaction

Un Supplier participa en transacciones de tipo:
- `PURCHASE` - como origen de la compra
- `PURCHASE_RETURN` - recibe devoluciones

```typescript
// Ejemplo: registrar compra a proveedor
const transaction: Transaction = {
    type: TransactionType.PURCHASE,
    supplierId: supplier.id,  // Vinculación
    branchId: branch.id,
    amount: 5000.00,
    // ...
}
```

---

## 5. Notas de Implementación

- Los datos fiscales y de contacto base vienen de `Person`
- `contactName` y `contactPhone` son datos adicionales del representante
- `paymentDays` define el plazo de pago acordado con el proveedor
- Los productos pueden tener un `defaultSupplier` asignado
