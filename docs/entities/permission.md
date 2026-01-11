# Entidad: Permission

## 1. Descripción

La entidad `Permission` define los permisos granulares asignados a usuarios con rol `OPERATOR`. Los usuarios `ADMIN` tienen acceso total.

> 📝 Ver documentación completa en `../permisos.md`

---

## 2. Estructura

```typescript
@Entity("permissions")
export class Permission {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "uuid" })
    userId: string;

    @Column({ type: "varchar", length: 100 })
    resource: string;  // Recurso al que aplica

    @Column({ type: "boolean", default: false })
    canCreate: boolean;

    @Column({ type: "boolean", default: false })
    canRead: boolean;

    @Column({ type: "boolean", default: false })
    canUpdate: boolean;

    @Column({ type: "boolean", default: false })
    canDelete: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Relaciones
    @ManyToOne(() => User, user => user.permissions, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;
}
```

---

## 3. Diagrama

```
Permission
├── id: UUID (PK)
├── userId: UUID (FK → User)
├── resource: varchar(100)
├── canCreate: boolean
├── canRead: boolean
├── canUpdate: boolean
├── canDelete: boolean
├── createdAt: timestamp
└── updatedAt: timestamp
```

---

## 4. Recursos Disponibles

| Resource | Descripción |
|----------|-------------|
| `products` | Gestión de productos |
| `categories` | Categorías de productos |
| `customers` | Clientes |
| `suppliers` | Proveedores |
| `users` | Usuarios del sistema |
| `cash_sessions` | Sesiones de caja |
| `transactions` | Transacciones |
| `reports` | Reportes |
| `settings` | Configuraciones |

---

## 5. Ejemplo de Asignación

```json
// Usuario operador de caja
{
    "userId": "uuid-operator",
    "permissions": [
        { "resource": "products", "canRead": true },
        { "resource": "customers", "canRead": true, "canCreate": true },
        { "resource": "cash_sessions", "canCreate": true, "canUpdate": true },
        { "resource": "transactions", "canCreate": true, "canRead": true }
    ]
}

// Usuario de inventario
{
    "userId": "uuid-inventory",
    "permissions": [
        { "resource": "products", "canCreate": true, "canRead": true, "canUpdate": true },
        { "resource": "categories", "canCreate": true, "canRead": true, "canUpdate": true },
        { "resource": "suppliers", "canRead": true },
        { "resource": "reports", "canRead": true }
    ]
}
```

---

## 6. Middleware de Verificación

```typescript
// Decorador para endpoints
@CheckPermission({ resource: 'products', action: 'create' })
async createProduct(data: CreateProductDto) {
    // Solo se ejecuta si tiene permiso
}

// Función de verificación
async function hasPermission(
    userId: string, 
    resource: string, 
    action: 'create' | 'read' | 'update' | 'delete'
): Promise<boolean> {
    const user = await userRepo.findOne({
        where: { id: userId },
        relations: ['permissions']
    });

    // Admin tiene acceso total
    if (user.rol === UserRole.ADMIN) return true;

    const permission = user.permissions.find(p => p.resource === resource);
    
    switch (action) {
        case 'create': return permission?.canCreate ?? false;
        case 'read': return permission?.canRead ?? false;
        case 'update': return permission?.canUpdate ?? false;
        case 'delete': return permission?.canDelete ?? false;
    }
}
```

---

## 7. Relación con Transaction

Los permisos controlan qué tipos de Transaction puede crear un usuario:

- `transactions` + `canCreate` → Puede crear ventas, compras, etc.
- `cash_sessions` + `canCreate` → Puede abrir sesiones de caja
- `reports` + `canRead` → Puede ver reportes de transacciones
