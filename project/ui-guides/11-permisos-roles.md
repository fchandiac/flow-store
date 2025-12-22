# FlowStore ERP - Sistema de Permisos y Roles

## 📋 Descripción General

El sistema de permisos de FlowStore controla el acceso a funcionalidades basado en:
1. **Rol del usuario** (ADMIN, OPERATOR)
2. **Permisos específicos** asignados individualmente

---

## 👤 Roles de Usuario

### ADMIN (Administrador)
- **Acceso completo**: Tiene TODOS los permisos automáticamente
- **No requiere permisos individuales**: El sistema otorga todos los permisos por el rol
- **Uso**: Dueños, gerentes, personal de TI

### OPERATOR (Operador)
- **Acceso limitado**: Solo tiene los permisos asignados específicamente
- **Requiere configuración**: Se deben asignar permisos manualmente
- **Uso**: Cajeros, vendedores, personal operativo

---

## 🔐 Comportamiento del Sistema

### Regla Principal
```
Si usuario.rol === 'ADMIN' → tiene TODOS los permisos automáticamente
Si usuario.rol === 'OPERATOR' → solo permisos asignados en tabla permissions
```

### Implementación (PermissionsContext.tsx)
```typescript
// ADMIN tiene TODOS los permisos automáticamente
if (userRole === 'ADMIN') {
  for (const ability of ABILITY_VALUES) {
    merged.add(ability);
  }
}
```

---

## 📝 Permisos Disponibles

### Usuarios
| Permiso | Descripción |
|---------|-------------|
| USERS_MENU | Ver menú de usuarios |
| USERS_CREATE | Crear usuarios |
| USERS_UPDATE | Editar usuarios |
| USERS_DELETE | Eliminar usuarios |

### Dashboard
| Permiso | Descripción |
|---------|-------------|
| DASHBOARD_MENU | Acceso al dashboard |

### Productos/Inventario
| Permiso | Descripción |
|---------|-------------|
| (pendiente definir) | ... |

---

## 🛠️ Uso en Componentes

### Hook usePermissions
```typescript
import { usePermissions } from '@/app/state/hooks/usePermissions';

const MyComponent = () => {
  const { has, hasAny, isLoading } = usePermissions();
  
  // Verificar permiso único
  if (has('USERS_CREATE')) {
    // Mostrar botón crear
  }
  
  // Verificar cualquiera de varios permisos
  if (hasAny(['USERS_UPDATE', 'USERS_DELETE'])) {
    // Mostrar acciones
  }
};
```

### Ejemplo Práctico (UserCard)
```typescript
const canEdit = has('USERS_UPDATE');
const canDelete = has('USERS_DELETE');

return (
  <Card>
    {canEdit && <EditButton />}
    {canDelete && <DeleteButton />}
  </Card>
);
```

---

## 🌱 Seed de Usuario Admin

El seed (`seed-flowstore.ts`) crea:
1. Usuario `admin` con rol `ADMIN`
2. Contraseña: `890890`

**Importante**: El usuario ADMIN no necesita permisos en la tabla `permissions` porque el sistema los otorga automáticamente por su rol.

---

## ⚙️ Configuración Técnica

### Entidad Permission
```typescript
// data/entities/Permission.ts
export enum Ability {
  USERS_CREATE = 'USERS_CREATE',
  USERS_UPDATE = 'USERS_UPDATE',
  USERS_DELETE = 'USERS_DELETE',
  // ... más permisos
}
```

### Agregar Nuevos Permisos
1. Agregar al enum `Ability` en `Permission.ts`
2. Agregar al array `ABILITY_VALUES` en `lib/permissions.ts`
3. Agregar definición con label y descripción en `definitions`

---

## 🔄 Flujo de Autenticación

```
Login → NextAuth JWT → session.user.role = 'ADMIN'
                    ↓
        PermissionsContext detecta rol
                    ↓
        if (ADMIN) → otorga TODOS los permisos
                    ↓
        usePermissions().has('X') → true para cualquier X
```

---

## 📌 Notas Importantes

1. **Sesión persistente**: Los permisos se cargan del JWT, no de la DB en cada request
2. **Cambios de permisos**: Requieren re-login para tomar efecto
3. **ADMIN siempre tiene acceso**: No importa qué permisos tenga en la tabla
4. **OPERATOR es restrictivo**: Solo puede hacer lo que tenga asignado
