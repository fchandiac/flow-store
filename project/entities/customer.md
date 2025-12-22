# Entidad: Customer

## 1. Descripción

La entidad `Customer` extiende a `Person` para agregar información específica de clientes. Un cliente puede ser persona natural o jurídica.

---

## 2. Estructura

```typescript
@Entity("customers")
export class Customer {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "uuid" })
    personId: string;

    @Column({ type: "varchar", length: 20, nullable: true })
    customerCode?: string;  // Código interno opcional

    @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
    creditLimit: number;

    @Column({ type: "int", default: 0 })
    creditDays: number;  // Días de crédito permitidos

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

    @OneToMany(() => Transaction, txn => txn.customer)
    transactions: Transaction[];
}
```

---

## 3. Diagrama

```
Customer
├── id: UUID (PK)
├── personId: UUID (FK → Person) UNIQUE
├── customerCode: varchar(20) nullable
├── creditLimit: decimal(12,2)
├── creditDays: int
├── notes: varchar(500) nullable
├── isActive: boolean
├── createdAt: timestamp
├── updatedAt: timestamp
└── deletedAt: timestamp (soft delete)
```

---

## 4. Relación con Transaction

Un Customer participa en transacciones de tipo:
- `SALE` - como receptor
- `SALE_RETURN` - devuelve productos
- `REMITTANCE_RECEIVE` - recibe remesas

```typescript
// Ejemplo: crear venta a cliente
const transaction: Transaction = {
    type: TransactionType.SALE,
    customerId: customer.id,  // Vinculación
    branchId: branch.id,
    cashSessionId: session.id,
    amount: 1500.00,
    // ...
}
```

---

## 5. Notas de Implementación

- Los datos personales (nombre, documento, dirección) vienen de `Person`
- `creditLimit` y `creditDays` definen políticas de crédito
- El `customerCode` es opcional, puede usarse para códigos internos del negocio
