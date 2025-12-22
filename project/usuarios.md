# Documentación Técnica: Gestión de Usuarios

Este documento describe el sistema de gestión de usuarios del ERP, incluyendo su estructura, roles y relaciones.

---

## 1. Entidad User

### 1.1 Estructura de Datos

```typescript
@Entity("users")
export class User {
    id: UUID              // Identificador único
    userName: string      // Nombre de usuario (login)
    pass: string          // Contraseña encriptada
    mail: string          // Correo electrónico
    rol: UserRole         // Rol del usuario
    person?: Person       // Persona asociada (opcional)
    deletedAt?: Date      // Soft delete timestamp
}
```

### 1.2 Diagrama de Entidad

```
User
├── id: UUID (PK)
├── userName: string (unique)
├── pass: string (encrypted)
├── mail: string
├── rol: enum(ADMIN, OPERATOR)
├── person_id: UUID (FK → Person, nullable)
└── deletedAt: timestamp (soft delete)
```

---

## 2. Roles de Usuario

### 2.1 Tipos de Roles

| Rol | Código | Descripción |
|-----|--------|-------------|
| **Administrador** | `ADMIN` | Acceso completo al sistema |
| **Operador** | `OPERATOR` | Acceso limitado a operaciones diarias |

### 2.2 Permisos por Rol

```typescript
enum UserRole {
    ADMIN = 'ADMIN',      // Control total
    OPERATOR = 'OPERATOR' // Operaciones básicas
}
```

#### Administrador (ADMIN)
- Gestión completa de usuarios
- Acceso a configuraciones del sistema
- Visualización de auditorías
- Gestión de todos los módulos

#### Operador (OPERATOR)
- Operaciones de venta/compra
- Gestión de inventario básica
- Sin acceso a configuraciones sensibles
- **Puede recibir permisos adicionales** mediante el sistema de `Permission`

> 📝 Ver documento `permisos.md` para el sistema de permisos granulares.

---

## 3. Relaciones

### 3.1 User → Person

```
User ──────────── Person
     ManyToOne
     (opcional)
     onDelete: SET NULL
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `person` | `Person` | Persona asociada al usuario |
| Cardinalidad | N:1 | Muchos usuarios pueden no tener persona |
| Nullable | Sí | El usuario puede existir sin persona |
| On Delete | SET NULL | Si se elimina la persona, el campo queda null |

### 3.2 User → Audit

```
User ──────────── Audit
     OneToMany
     (inverso)
```

Los usuarios son referenciados en las auditorías para rastrear quién realizó cada acción.

### 3.3 User → Permission

```
User ──────────── Permission
     OneToMany
     (inverso)
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| Relación | 1:N | Un usuario puede tener múltiples permisos |
| Constraint | UNIQUE(userId, ability) | No puede haber permisos duplicados |

Los permisos permiten control granular de acceso para usuarios con rol `OPERATOR`.

---

## 4. Operaciones CRUD

### 4.1 Crear Usuario

```typescript
// Payload requerido
interface CreateUserPayload {
    userName: string;
    pass: string;
    mail: string;
    rol: UserRole;
    personId?: string;
}
```

**Validaciones:**
- `userName` debe ser único
- `mail` debe tener formato válido
- `pass` se encripta antes de guardar

### 4.2 Actualizar Usuario

```typescript
// Campos actualizables
interface UpdateUserPayload {
    userName?: string;
    mail?: string;
    rol?: UserRole;
    personId?: string | null;
}
```

> ⚠️ La contraseña se actualiza mediante operación separada (`UPDATE_PASSWORD`)

### 4.3 Eliminar Usuario (Soft Delete)

```typescript
// Usa DeleteDateColumn de TypeORM
user.deletedAt = new Date();
```

El usuario no se elimina físicamente, solo se marca como eliminado.

---

## 5. Autenticación

### 5.1 Proceso de Login

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Cliente   │────▶│   Validar    │────▶│   Generar   │
│  (userName/ │     │  Credenciales│     │   Sesión    │
│    pass)    │     │              │     │             │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   Registrar  │
                    │   Auditoría  │
                    │  (LOGIN/     │
                    │  LOGIN_FAILED)│
                    └──────────────┘
```

### 5.2 Acciones de Autenticación Auditadas

| Acción | Descripción | entityName |
|--------|-------------|------------|
| `LOGIN_SUCCESS` | Inicio de sesión exitoso | `Auth` |
| `LOGIN_FAILED` | Intento fallido de login | `Auth` |
| `LOGOUT` | Cierre de sesión | `Auth` |
| `UPDATE_PASSWORD` | Cambio de contraseña | `User` |

---

## 6. Seguridad

### 6.1 Encriptación de Contraseñas

- Las contraseñas se almacenan encriptadas
- Nunca se almacenan en texto plano
- Se usa hash seguro (bcrypt o similar)

### 6.2 Soft Delete

```typescript
@DeleteDateColumn()
deletedAt?: Date;
```

**Beneficios:**
- Historial de usuarios preservado
- Auditorías mantienen referencia válida
- Posibilidad de restaurar usuarios

---

## 7. Índices y Performance

### 7.1 Índices Recomendados

| Columna | Tipo | Propósito |
|---------|------|-----------|
| `userName` | UNIQUE | Búsqueda rápida en login |
| `mail` | INDEX | Búsqueda por correo |
| `rol` | INDEX | Filtrado por rol |
| `deletedAt` | INDEX | Filtrar usuarios activos |

### 7.2 Query Patterns Comunes

```sql
-- Usuarios activos
SELECT * FROM users WHERE deletedAt IS NULL;

-- Buscar por userName
SELECT * FROM users WHERE userName = ? AND deletedAt IS NULL;

-- Usuarios por rol
SELECT * FROM users WHERE rol = ? AND deletedAt IS NULL;
```

---

## 8. Integración con Auditoría

Todas las operaciones sobre usuarios generan registros de auditoría:

| Operación | Acción Auditoría |
|-----------|------------------|
| Crear usuario | `CREATE` |
| Actualizar datos | `UPDATE` |
| Cambiar contraseña | `UPDATE_PASSWORD` |
| Eliminar (soft) | `DELETE` |
| Login exitoso | `LOGIN_SUCCESS` |
| Login fallido | `LOGIN_FAILED` |
| Logout | `LOGOUT` |

> 📝 Ver documento `auditorias.md` para más detalles sobre el sistema de auditoría.
