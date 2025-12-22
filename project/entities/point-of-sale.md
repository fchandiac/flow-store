# Entidad: PointOfSale

## 1. Descripción

La entidad `PointOfSale` representa un punto de venta o terminal dentro de una sucursal. Cada POS puede tener sesiones de caja activas.

---

## 2. Estructura

```typescript
@Entity("points_of_sale")
export class PointOfSale {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "uuid" })
    branchId: string;

    @Column({ type: "varchar", length: 255 })
    name: string;

    @Column({ type: "varchar", length: 20, unique: true })
    code: string;

    @Column({ type: "boolean", default: true })
    isActive: boolean;

    @Column({ type: "json", nullable: true })
    settings?: Record<string, any>;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @DeleteDateColumn()
    deletedAt?: Date;

    // Relaciones
    @ManyToOne(() => Branch)
    branch: Branch;

    @OneToMany(() => CashSession, session => session.pointOfSale)
    cashSessions: CashSession[];
}
```

---

## 3. Diagrama

```
PointOfSale
├── id: UUID (PK)
├── branchId: UUID (FK → Branch)
├── name: varchar(255)
├── code: varchar(20) UNIQUE
├── isActive: boolean
├── settings: JSON (nullable)
├── createdAt: timestamp
├── updatedAt: timestamp
└── deletedAt: timestamp (soft delete)
```

---

## 4. Relaciones

```
Branch (1) ──────── (N) PointOfSale
PointOfSale (1) ──────── (N) CashSession
```

---

## 5. Jerarquía

```
Company
└── Branch
    └── PointOfSale (Terminal/Caja)
        └── CashSession (Turno)
            └── Transactions (CASH_IN, CASH_OUT, SALE, etc.)
```
