# Documentación Técnica: Sistema de Permisos

Este documento describe el sistema de permisos del ERP, que permite un control granular de acceso a funcionalidades específicas por usuario.

---

## 1. Filosofía de Permisos

### 1.1 Principios Fundamentales

| Principio | Descripción |
|-----------|-------------|
| **Granularidad** | Permisos específicos por funcionalidad |
| **Flexibilidad** | Asignación individual por usuario |
| **Complementario** | Trabaja junto con el sistema de roles |
| **Auditable** | Cambios de permisos son rastreables |

### 1.2 Relación Roles vs Permisos

```
┌─────────────────────────────────────────────────────────┐
│                      ACCESO                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   ROL (User.rol)          PERMISOS (Permission)         │
│   ├── ADMIN               ├── USERS_CREATE              │
│   │   (acceso total)      ├── USERS_UPDATE              │
│   │                       ├── USERS_DELETE              │
│   └── OPERATOR            └── ... (más permisos)        │
│       (acceso limitado)                                 │
│                                                         │
│   Nivel MACRO             Nivel GRANULAR                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

> **Nota:** Los roles definen acceso general, los permisos permiten excepciones específicas.

---

## 2. Entidad Permission

### 2.1 Estructura de Datos

```typescript
@Entity('permissions')
@Unique(['userId', 'ability'])
export class Permission {
    id: UUID              // Identificador único
    userId?: UUID         // Usuario al que pertenece el permiso
    user: User            // Relación con usuario
    ability: Ability      // Tipo de permiso/habilidad
    description?: string  // Descripción opcional
    createdAt: Date       // Fecha de creación
    updatedAt: Date       // Última actualización
    deletedAt?: Date      // Soft delete
}
```

### 2.2 Diagrama de Entidad

```
Permission
├── id: UUID (PK)
├── userId: UUID (FK → User, nullable, indexed)
├── ability: enum(Ability)
├── description: varchar(255, nullable)
├── createdAt: timestamp
├── updatedAt: timestamp
└── deletedAt: timestamp (soft delete)

Constraints:
└── UNIQUE(userId, ability) - Un usuario no puede tener el mismo permiso duplicado
```

---

## 3. Habilidades (Abilities)

### 3.1 Catálogo de Permisos Disponibles

```typescript
enum Ability {
    // Gestión de Usuarios
    USERS_CREATE = 'USERS_CREATE',
    USERS_UPDATE = 'USERS_UPDATE',
    USERS_DELETE = 'USERS_DELETE',
}
```

### 3.2 Descripción de Permisos

| Permiso | Código | Descripción |
|---------|--------|-------------|
| **Crear Usuarios** | `USERS_CREATE` | Permite crear nuevos usuarios en el sistema |
| **Actualizar Usuarios** | `USERS_UPDATE` | Permite modificar datos de usuarios existentes |
| **Eliminar Usuarios** | `USERS_DELETE` | Permite eliminar (soft delete) usuarios |

### 3.3 Permisos Futuros (Extensible)

El sistema está diseñado para agregar más permisos según crezca el ERP:

```typescript
// Ejemplo de extensión futura
enum Ability {
    // Usuarios
    USERS_CREATE = 'USERS_CREATE',
    USERS_UPDATE = 'USERS_UPDATE',
    USERS_DELETE = 'USERS_DELETE',
    
    // Inventario (futuro)
    INVENTORY_VIEW = 'INVENTORY_VIEW',
    INVENTORY_ADJUST = 'INVENTORY_ADJUST',
    
    // Ventas (futuro)
    SALES_CREATE = 'SALES_CREATE',
    SALES_VOID = 'SALES_VOID',
    
    // Reportes (futuro)
    REPORTS_VIEW = 'REPORTS_VIEW',
    REPORTS_EXPORT = 'REPORTS_EXPORT',
    
    // Configuración (futuro)
    SETTINGS_MODIFY = 'SETTINGS_MODIFY',
}
```

---

## 4. Relaciones

### 4.1 Permission → User

```
Permission ──────────── User
           ManyToOne
           (nullable)
           onDelete: SET NULL
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `user` | `User` | Usuario que posee el permiso |
| `userId` | `UUID` | FK indexado para búsquedas rápidas |
| Cardinalidad | N:1 | Un usuario puede tener múltiples permisos |
| Nullable | Sí | Permite permisos huérfanos (usuario eliminado) |
| On Delete | SET NULL | Si se elimina el usuario, el permiso queda huérfano |

### 4.2 Diagrama de Relaciones

```
┌─────────────┐         ┌──────────────┐
│    User     │◄────────│  Permission  │
├─────────────┤   N:1   ├──────────────┤
│ id          │         │ id           │
│ userName    │         │ userId (FK)  │
│ rol         │         │ ability      │
│ ...         │         │ description  │
└─────────────┘         └──────────────┘
```

---

## 5. Constraint Único

### 5.1 Restricción de Duplicados

```typescript
@Unique(['userId', 'ability'])
```

Esta restricción garantiza que:
- Un usuario **no puede** tener el mismo permiso dos veces
- Cada combinación `userId + ability` es única
- Previene errores de asignación duplicada

### 5.2 Ejemplo

```
✅ Válido:
User A → USERS_CREATE
User A → USERS_UPDATE
User B → USERS_CREATE

❌ Inválido (violación de constraint):
User A → USERS_CREATE
User A → USERS_CREATE  ← ERROR: Duplicado
```

---

## 6. Operaciones CRUD

### 6.1 Asignar Permiso a Usuario

```typescript
interface AssignPermissionPayload {
    userId: string;
    ability: Ability;
    description?: string;
}

// Crear el permiso
const permission = new Permission();
permission.userId = payload.userId;
permission.ability = payload.ability;
permission.description = payload.description;
await repository.save(permission);
```

### 6.2 Revocar Permiso

```typescript
// Soft delete del permiso
await repository.softDelete({ userId, ability });
```

### 6.3 Verificar Permiso

```typescript
// Verificar si usuario tiene un permiso específico
const hasPermission = await repository.findOne({
    where: {
        userId: userId,
        ability: Ability.USERS_CREATE,
        deletedAt: IsNull()
    }
});

if (hasPermission) {
    // Usuario tiene el permiso
}
```

### 6.4 Listar Permisos de Usuario

```typescript
const userPermissions = await repository.find({
    where: {
        userId: userId,
        deletedAt: IsNull()
    }
});
```

---

## 7. Lógica de Autorización

### 7.1 Flujo de Verificación

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Request   │────▶│  Verificar   │────▶│  Verificar  │
│   (Acción)  │     │    ROL       │     │   PERMISO   │
│             │     │              │     │             │
└─────────────┘     └──────────────┘     └─────────────┘
                           │                    │
                           ▼                    ▼
                    ┌──────────────┐     ┌─────────────┐
                    │ ADMIN = OK   │     │ Tiene       │
                    │ OPERATOR →   │────▶│ permiso?    │
                    │ verificar    │     │             │
                    └──────────────┘     └─────────────┘
                                               │
                                    ┌──────────┴──────────┐
                                    ▼                     ▼
                              ┌─────────┐           ┌─────────┐
                              │ Sí: OK  │           │ No:     │
                              │ Permitir│           │ Denegar │
                              └─────────┘           └─────────┘
```

### 7.2 Pseudocódigo de Autorización

```typescript
function canUserPerform(user: User, requiredAbility: Ability): boolean {
    // ADMIN siempre tiene acceso total
    if (user.rol === UserRole.ADMIN) {
        return true;
    }
    
    // OPERATOR necesita permiso específico
    return userHasPermission(user.id, requiredAbility);
}
```

---

## 8. Índices y Performance

### 8.1 Índices Definidos

| Columna | Tipo | Propósito |
|---------|------|-----------|
| `userId` | INDEX | Búsqueda rápida de permisos por usuario |
| `(userId, ability)` | UNIQUE | Prevenir duplicados + búsqueda eficiente |

### 8.2 Queries Optimizadas

```sql
-- Permisos de un usuario (usa índice userId)
SELECT * FROM permissions 
WHERE userId = ? AND deletedAt IS NULL;

-- Verificar permiso específico (usa índice único compuesto)
SELECT 1 FROM permissions 
WHERE userId = ? AND ability = ? AND deletedAt IS NULL
LIMIT 1;

-- Usuarios con un permiso específico
SELECT DISTINCT userId FROM permissions 
WHERE ability = ? AND deletedAt IS NULL;
```

---

## 9. Integración con Auditoría

Todas las operaciones de permisos deberían generar auditoría:

| Operación | Acción Auditoría | Descripción |
|-----------|------------------|-------------|
| Asignar permiso | `CREATE` | Nuevo permiso asignado |
| Revocar permiso | `DELETE` | Permiso revocado (soft delete) |
| Modificar descripción | `UPDATE` | Descripción actualizada |

### 9.1 Ejemplo de Registro de Auditoría

```json
{
    "entityName": "Permission",
    "entityId": "uuid-del-permiso",
    "userId": "uuid-del-admin-que-asigno",
    "action": "CREATE",
    "newValues": {
        "userId": "uuid-del-usuario-destino",
        "ability": "USERS_CREATE",
        "description": "Permiso para crear usuarios"
    }
}
```

---

## 10. Mejores Prácticas

### 10.1 Asignación de Permisos

✅ **Recomendado:**
- Asignar permisos mínimos necesarios (principio de menor privilegio)
- Documentar razón de asignación en `description`
- Revisar permisos periódicamente

❌ **Evitar:**
- Asignar todos los permisos a operadores
- Dejar permisos huérfanos sin revisar
- Crear permisos duplicados manualmente

### 10.2 Extensión del Sistema

Para agregar nuevos permisos:

1. **Agregar al enum `Ability`:**
```typescript
enum Ability {
    // ... existentes
    NUEVO_PERMISO = 'NUEVO_PERMISO',
}
```

2. **Crear migración** para actualizar el enum en la BD

3. **Implementar verificación** en el código correspondiente

4. **Documentar** el nuevo permiso

---

## 11. Seguridad

### 11.1 Consideraciones

| Aspecto | Recomendación |
|---------|---------------|
| **Gestión** | Solo ADMIN puede asignar/revocar permisos |
| **Visualización** | Usuarios no ven permisos de otros |
| **Soft Delete** | Permisos revocados se conservan para auditoría |
| **Caché** | Invalidar caché de permisos al modificar |

### 11.2 Validaciones

```typescript
// Antes de asignar permiso, verificar:
// 1. Usuario que asigna es ADMIN
// 2. Usuario destino existe y está activo
// 3. Permiso no está ya asignado
// 4. Ability es válido (del enum)
```
