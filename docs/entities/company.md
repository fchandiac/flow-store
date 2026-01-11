# Entidad: Company

## 1. Descripción

La entidad `Company` representa la configuración de la empresa única del sistema. FlowStore opera con una sola compañía.

> ⚠️ **Sistema de compañía única**: Solo existe una Company en el sistema.

---

## 2. Estructura

```typescript
@Entity("companies")
export class Company {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "varchar", length: 255 })
    name: string;

    @Column({ type: "varchar", length: 10, default: "CLP" })
    defaultCurrency: string;

    @Column({ type: "date", nullable: true })
    fiscalYearStart?: Date;

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
    @OneToMany(() => Tax, tax => tax.company)
    taxes: Tax[];
}
```

---

## 3. Diagrama

```
Company
├── id: UUID (PK)
├── name: varchar(255)
├── defaultCurrency: varchar(10)
├── fiscalYearStart: date (nullable)
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
Company (1) ──────── (N) Storage (CENTRAL, EXTERNAL)
Company (1) ──────── (N) Tax
Company (1) ──────── (N) User
Company (1) ──────── (N) Person
Company (1) ──────── (N) Product
Company (1) ──────── (N) Transaction
```

---

## 5. Settings Típicos

```json
{
    "inventory": {
        "allowNegativeStock": false,
        "costingMethod": "PPP"
    },
    "invoicing": {
        "prefix": "F",
        "nextNumber": 1
    }
}
```

> 📝 Los impuestos se manejan en la entidad [Tax](./tax.md)
