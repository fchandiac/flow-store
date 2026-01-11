# Entidad: Storage

## 1. Descripción

La entidad `Storage` representa un almacén o bodega donde se gestiona el inventario. El stock se controla a nivel de Storage, no de Branch.

---

## 2. Estructura

```typescript
enum StorageType {
    WAREHOUSE = 'WAREHOUSE',
    STORE = 'STORE',
    COLD_ROOM = 'COLD_ROOM',
    TRANSIT = 'TRANSIT'
}

enum StorageCategory {
    IN_BRANCH = 'IN_BRANCH',   // Bodegas dentro de sucursal
    CENTRAL = 'CENTRAL',       // Centros de distribución
    EXTERNAL = 'EXTERNAL'      // Almacenes de terceros
}

@Entity("storages")
export class Storage {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "uuid", nullable: true })
    branchId?: string;  // Requerido para IN_BRANCH

    @Column({ type: "varchar", length: 255 })
    name: string;

    @Column({ type: "varchar", length: 50, nullable: true })
    code?: string;

    @Column({ type: "enum", enum: StorageType, default: StorageType.WAREHOUSE })
    type: StorageType;

    @Column({ type: "enum", enum: StorageCategory, default: StorageCategory.IN_BRANCH })
    category: StorageCategory;

    @Column({ type: "boolean", default: false })
    isDefault: boolean;

    @Column({ type: "boolean", default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @DeleteDateColumn()
    deletedAt?: Date;

    @ManyToOne(() => Branch, { nullable: true })
    branch?: Branch;
}
```

---

## 3. Diagrama

```
Storage
├── id: UUID (PK)
├── branchId: UUID (FK → Branch, nullable)
├── name: varchar(255)
├── code: varchar(50)
├── type: enum(WAREHOUSE, STORE, COLD_ROOM, TRANSIT)
├── category: enum(IN_BRANCH, CENTRAL, EXTERNAL)
├── isActive: boolean
├── isDefault: boolean
├── createdAt: timestamp
├── updatedAt: timestamp
└── deletedAt: timestamp (soft delete)
```

---

## 4. Tipos de Storage

| Tipo | branchId | Descripción | Ejemplo |
|------|----------|-------------|---------|
| `IN_BRANCH` | Requerido | Operan dentro de una sucursal específica | Vitrina, piso de ventas |
| `CENTRAL` | NULL | Centros de distribución o logística central | CEDIS principal |
| `EXTERNAL` | NULL | Almacenes operados por terceros o consignaciones | Operador logístico |

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
Branch (1) ──────── (N) Storage (solo IN_BRANCH)
Storage (1) ──────── (N) Transaction
```
