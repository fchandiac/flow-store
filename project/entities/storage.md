# Entidad: Storage

## 1. Descripción

La entidad `Storage` representa un almacén o bodega donde se gestiona el inventario. El stock se controla a nivel de Storage, no de Branch.

---

## 2. Estructura

```typescript
enum StorageType {
    IN_BRANCH = 'IN_BRANCH',   // Bodega dentro de sucursal
    CENTRAL = 'CENTRAL',       // Centro de distribución
    EXTERNAL = 'EXTERNAL'      // Almacén externo/tercero
}

@Entity("storages")
export class Storage {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "uuid" })
    companyId: string;

    @Column({ type: "uuid", nullable: true })
    branchId?: string;  // Solo para IN_BRANCH

    @Column({ type: "varchar", length: 255 })
    name: string;

    @Column({ type: "varchar", length: 20, unique: true })
    code: string;

    @Column({ type: "enum", enum: StorageType })
    type: StorageType;

    @Column({ type: "boolean", default: true })
    allowsSales: boolean;

    @Column({ type: "boolean", default: true })
    allowsReceipts: boolean;

    @Column({ type: "text", nullable: true })
    address?: string;

    @Column({ type: "boolean", default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @DeleteDateColumn()
    deletedAt?: Date;

    // Relaciones
    @ManyToOne(() => Company)
    company: Company;

    @ManyToOne(() => Branch, { nullable: true })
    branch?: Branch;
}
```

---

## 3. Diagrama

```
Storage
├── id: UUID (PK)
├── companyId: UUID (FK → Company)
├── branchId: UUID (FK → Branch, nullable)
├── name: varchar(255)
├── code: varchar(20) UNIQUE
├── type: enum(IN_BRANCH, CENTRAL, EXTERNAL)
├── allowsSales: boolean
├── allowsReceipts: boolean
├── address: text (nullable)
├── isActive: boolean
├── createdAt: timestamp
├── updatedAt: timestamp
└── deletedAt: timestamp (soft delete)
```

---

## 4. Tipos de Storage

| Tipo | branchId | Descripción | Ejemplo |
|------|----------|-------------|---------|
| `IN_BRANCH` | Requerido | Bodega dentro de sucursal | Trastienda, Vitrina |
| `CENTRAL` | NULL | Centro de distribución | Bodega central |
| `EXTERNAL` | NULL | Almacén de terceros | Proveedor, 3PL |

---

## 5. Stock en Storage

El stock se calcula sumando transacciones:

```sql
SELECT 
    product_variant_id,
    SUM(quantity) as stock
FROM transactions
WHERE storage_id = :storage_id
  AND product_variant_id IS NOT NULL
GROUP BY product_variant_id;
```

---

## 6. Relaciones

```
Company (1) ──────── (N) Storage
Branch (1) ──────── (N) Storage (solo IN_BRANCH)
Storage (1) ──────── (N) Transaction
```
