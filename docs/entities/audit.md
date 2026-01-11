# Entidad: Audit

## 1. Descripción

La entidad `Audit` registra todas las acciones realizadas por usuarios en el sistema. Es parte fundamental del modelo inmutable para trazabilidad.

> 📝 Ver documentación completa en `../auditorias.md`

---

## 2. Estructura

```typescript
enum AuditAction {
    CREATE = 'CREATE',
    UPDATE = 'UPDATE',
    DELETE = 'DELETE',
    LOGIN = 'LOGIN',
    LOGOUT = 'LOGOUT',
    VIEW = 'VIEW',
    EXPORT = 'EXPORT',
    PRINT = 'PRINT'
}

@Entity("audits")
export class Audit {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "uuid" })
    userId: string;

    @Column({ type: "enum", enum: AuditAction })
    action: AuditAction;

    @Column({ type: "varchar", length: 100 })
    entityName: string;  // Nombre de la entidad afectada

    @Column({ type: "uuid", nullable: true })
    entityId?: string;  // ID del registro afectado

    @Column({ type: "json", nullable: true })
    previousData?: Record<string, any>;  // Snapshot antes del cambio

    @Column({ type: "json", nullable: true })
    newData?: Record<string, any>;  // Snapshot después del cambio

    @Column({ type: "json", nullable: true })
    metadata?: Record<string, any>;  // Información adicional

    @Column({ type: "varchar", length: 45, nullable: true })
    ipAddress?: string;

    @Column({ type: "varchar", length: 500, nullable: true })
    userAgent?: string;

    @CreateDateColumn()
    createdAt: Date;

    // Relaciones
    @ManyToOne(() => User, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'userId' })
    user: User;
}
```

---

## 3. Diagrama

```
Audit
├── id: UUID (PK)
├── userId: UUID (FK → User)
├── action: enum(CREATE, UPDATE, DELETE, LOGIN, LOGOUT, VIEW, EXPORT, PRINT)
├── entityName: varchar(100)
├── entityId: UUID nullable
├── previousData: JSON nullable
├── newData: JSON nullable
├── metadata: JSON nullable
├── ipAddress: varchar(45) nullable
├── userAgent: varchar(500) nullable
└── createdAt: timestamp
```

---

## 4. Ejemplos de Registros

```json
// Creación de producto
{
    "action": "CREATE",
    "entityName": "Product",
    "entityId": "uuid-product",
    "previousData": null,
    "newData": { "name": "Manzana", "code": "PRD-001" }
}

// Actualización de precio
{
    "action": "UPDATE",
    "entityName": "ProductVariant",
    "entityId": "uuid-variant",
    "previousData": { "salePrice": 50.00 },
    "newData": { "salePrice": 55.00 }
}

// Login de usuario
{
    "action": "LOGIN",
    "entityName": "User",
    "entityId": "uuid-user",
    "metadata": { "success": true },
    "ipAddress": "192.168.1.100"
}
```

---

## 5. Subscriber de TypeORM

```typescript
@EventSubscriber()
export class AuditSubscriber implements EntitySubscriberInterface {
    constructor(
        dataSource: DataSource,
        private auditService: AuditService
    ) {
        dataSource.subscribers.push(this);
    }

    afterInsert(event: InsertEvent<any>) {
        this.auditService.log({
            action: AuditAction.CREATE,
            entityName: event.metadata.tableName,
            entityId: event.entity.id,
            newData: event.entity
        });
    }

    afterUpdate(event: UpdateEvent<any>) {
        this.auditService.log({
            action: AuditAction.UPDATE,
            entityName: event.metadata.tableName,
            entityId: event.entity?.id,
            previousData: event.databaseEntity,
            newData: event.entity
        });
    }

    afterSoftRemove(event: SoftRemoveEvent<any>) {
        this.auditService.log({
            action: AuditAction.DELETE,
            entityName: event.metadata.tableName,
            entityId: event.entity?.id,
            previousData: event.entity
        });
    }
}
```

---

## 6. Relación con Transaction

Transaction también genera registros de Audit, pero la diferencia es:

| Transaction | Audit |
|-------------|-------|
| Movimientos de negocio (ventas, compras, stock) | Acciones de sistema |
| Datos financieros y de inventario | Trazabilidad de cambios |
| Inmutable | Inmutable |
| Tiene líneas de detalle | Tiene snapshots JSON |
