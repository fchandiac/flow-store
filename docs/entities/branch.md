# Entidad: Branch

## 1. Descripción

La entidad `Branch` representa una sucursal o local comercial de la empresa. Cada sucursal opera de forma semi-independiente con su propio inventario y punto(s) de venta.

---

## 2. Estructura

```typescript
@Entity("branches")
export class Branch {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "uuid" })
    companyId: string;

    @Column({ type: "varchar", length: 255 })
    name: string;

    @Column({ type: "varchar", length: 20, unique: true })
    code: string;

    @Column({ type: "text", nullable: true })
    address?: string;

    @Column({ type: "varchar", length: 100, nullable: true })
    city?: string;

    @Column({ type: "varchar", length: 50, nullable: true })
    phone?: string;

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
    @ManyToOne(() => Company)
    company: Company;

    @OneToMany(() => PointOfSale, pos => pos.branch)
    pointsOfSale: PointOfSale[];

    @OneToMany(() => Storage, storage => storage.branch)
    storages: Storage[];
}
```

---

## 3. Diagrama

```
Branch
├── id: UUID (PK)
├── companyId: UUID (FK → Company)
├── name: varchar(255)
├── code: varchar(20) UNIQUE
├── address: text (nullable)
├── city: varchar(100) (nullable)
├── phone: varchar(50) (nullable)
├── isActive: boolean
├── settings: JSON (nullable)
├── createdAt: timestamp
├── updatedAt: timestamp
└── deletedAt: timestamp (soft delete)
```

---

## 4. Relaciones

```
Company (1) ──────── (N) Branch
Branch (1) ──────── (N) PointOfSale
Branch (1) ──────── (N) Storage (IN_BRANCH)
Branch (1) ──────── (N) Transaction
```

---

## 5. Jerarquía

```
Company
└── Branch
    ├── Storage (IN_BRANCH)
    │   └── Stock de productos
    ├── PointOfSale
    │   └── CashSession
    └── Transacciones de la sucursal
```
