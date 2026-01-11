# Server Action: permissions.ts

## Ubicación
`app/actions/permissions.ts`

---

## Descripción

Server actions para la entidad **Permission** (Permisos).

---

## Funciones

### getPermissionsByUser

Obtiene permisos de un usuario.

```typescript
'use server'

export async function getPermissionsByUser(userId: string): Promise<Permission[]>
```

---

### getAllResources

Obtiene lista de recursos disponibles.

```typescript
interface ResourceInfo {
    resource: string;
    displayName: string;
    description: string;
}

export async function getAllResources(): Promise<ResourceInfo[]>
```

**Uso:**
```tsx
const resources = await getAllResources();
// [
//   { resource: 'products', displayName: 'Productos', description: '...' },
//   { resource: 'customers', displayName: 'Clientes', description: '...' },
//   ...
// ]
```

---

### setUserPermissions

Establece permisos de un usuario (reemplaza todos).

```typescript
interface PermissionInput {
    resource: string;
    canCreate: boolean;
    canRead: boolean;
    canUpdate: boolean;
    canDelete: boolean;
}

export async function setUserPermissions(
    userId: string,
    permissions: PermissionInput[]
): Promise<{ success: boolean }>
```

**Uso:**
```tsx
await setUserPermissions(userId, [
    { resource: 'products', canCreate: true, canRead: true, canUpdate: true, canDelete: false },
    { resource: 'customers', canCreate: true, canRead: true, canUpdate: false, canDelete: false }
]);
```

---

### checkPermission

Verifica si usuario tiene permiso específico.

```typescript
export async function checkPermission(
    userId: string,
    resource: string,
    action: 'create' | 'read' | 'update' | 'delete'
): Promise<boolean>
```

**Uso:**
```tsx
const canCreate = await checkPermission(userId, 'products', 'create');
if (!canCreate) {
    throw new Error('Sin permisos');
}
```

---

### checkPermissions

Verifica múltiples permisos.

```typescript
interface PermissionCheck {
    resource: string;
    action: 'create' | 'read' | 'update' | 'delete';
}

export async function checkPermissions(
    userId: string,
    checks: PermissionCheck[]
): Promise<Record<string, boolean>>
```

**Uso:**
```tsx
const perms = await checkPermissions(userId, [
    { resource: 'products', action: 'create' },
    { resource: 'customers', action: 'read' }
]);
// { 'products:create': true, 'customers:read': true }
```

---

### getUserPermissionMatrix

Obtiene matriz de permisos para UI.

```typescript
interface PermissionMatrix {
    resource: string;
    displayName: string;
    canCreate: boolean;
    canRead: boolean;
    canUpdate: boolean;
    canDelete: boolean;
}

export async function getUserPermissionMatrix(userId: string): Promise<PermissionMatrix[]>
```

---

### copyPermissions

Copia permisos de un usuario a otro.

```typescript
export async function copyPermissions(
    fromUserId: string,
    toUserId: string
): Promise<{ success: boolean }>
```

---

## Implementación

```typescript
'use server'

import { getDataSource } from '@/data/db';
import { Permission } from '@/data/entities/Permission';
import { User, UserRole } from '@/data/entities/User';
import { revalidatePath } from 'next/cache';

// Recursos del sistema
const RESOURCES: ResourceInfo[] = [
    { resource: 'products', displayName: 'Productos', description: 'Gestión de productos y variantes' },
    { resource: 'categories', displayName: 'Categorías', description: 'Categorías de productos' },
    { resource: 'customers', displayName: 'Clientes', description: 'Gestión de clientes' },
    { resource: 'suppliers', displayName: 'Proveedores', description: 'Gestión de proveedores' },
    { resource: 'users', displayName: 'Usuarios', description: 'Administración de usuarios' },
    { resource: 'branches', displayName: 'Sucursales', description: 'Gestión de sucursales' },
    { resource: 'storages', displayName: 'Almacenes', description: 'Gestión de almacenes' },
    { resource: 'cash_sessions', displayName: 'Sesiones de Caja', description: 'Apertura y cierre de caja' },
    { resource: 'transactions', displayName: 'Transacciones', description: 'Ventas, compras, movimientos' },
    { resource: 'reports', displayName: 'Reportes', description: 'Acceso a reportes' },
    { resource: 'settings', displayName: 'Configuración', description: 'Configuración del sistema' },
    { resource: 'audits', displayName: 'Auditoría', description: 'Registros de auditoría' }
];

export async function getAllResources(): Promise<ResourceInfo[]> {
    return RESOURCES;
}

export async function getPermissionsByUser(userId: string): Promise<Permission[]> {
    const ds = await getDataSource();
    
    return await ds.getRepository(Permission).find({
        where: { userId },
        order: { resource: 'ASC' }
    });
}

export async function setUserPermissions(
    userId: string,
    permissions: PermissionInput[]
): Promise<{ success: boolean }> {
    const ds = await getDataSource();
    const queryRunner = ds.createQueryRunner();
    
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    try {
        // Eliminar permisos existentes
        await queryRunner.manager.delete(Permission, { userId });
        
        // Crear nuevos permisos
        for (const perm of permissions) {
            // Solo crear si tiene al menos un permiso
            if (perm.canCreate || perm.canRead || perm.canUpdate || perm.canDelete) {
                const permission = queryRunner.manager.create(Permission, {
                    userId,
                    resource: perm.resource,
                    canCreate: perm.canCreate,
                    canRead: perm.canRead,
                    canUpdate: perm.canUpdate,
                    canDelete: perm.canDelete
                });
                await queryRunner.manager.save(permission);
            }
        }
        
        await queryRunner.commitTransaction();
        
        revalidatePath('/admin/users');
        
        return { success: true };
        
    } catch (error) {
        await queryRunner.rollbackTransaction();
        console.error('Error setting permissions:', error);
        return { success: false };
    } finally {
        await queryRunner.release();
    }
}

export async function checkPermission(
    userId: string,
    resource: string,
    action: 'create' | 'read' | 'update' | 'delete'
): Promise<boolean> {
    const ds = await getDataSource();
    
    // Obtener usuario con rol
    const user = await ds.getRepository(User).findOne({
        where: { id: userId }
    });
    
    if (!user) return false;
    
    // Admin tiene todos los permisos
    if (user.rol === UserRole.ADMIN) return true;
    
    // Buscar permiso específico
    const permission = await ds.getRepository(Permission).findOne({
        where: { userId, resource }
    });
    
    if (!permission) return false;
    
    switch (action) {
        case 'create': return permission.canCreate;
        case 'read': return permission.canRead;
        case 'update': return permission.canUpdate;
        case 'delete': return permission.canDelete;
        default: return false;
    }
}

export async function getUserPermissionMatrix(userId: string): Promise<PermissionMatrix[]> {
    const ds = await getDataSource();
    
    const permissions = await ds.getRepository(Permission).find({
        where: { userId }
    });
    
    const permMap = new Map(permissions.map(p => [p.resource, p]));
    
    return RESOURCES.map(r => ({
        resource: r.resource,
        displayName: r.displayName,
        canCreate: permMap.get(r.resource)?.canCreate ?? false,
        canRead: permMap.get(r.resource)?.canRead ?? false,
        canUpdate: permMap.get(r.resource)?.canUpdate ?? false,
        canDelete: permMap.get(r.resource)?.canDelete ?? false
    }));
}

export async function copyPermissions(
    fromUserId: string,
    toUserId: string
): Promise<{ success: boolean }> {
    const permissions = await getPermissionsByUser(fromUserId);
    
    const permissionInputs: PermissionInput[] = permissions.map(p => ({
        resource: p.resource,
        canCreate: p.canCreate,
        canRead: p.canRead,
        canUpdate: p.canUpdate,
        canDelete: p.canDelete
    }));
    
    return await setUserPermissions(toUserId, permissionInputs);
}
```

---

## Uso en Middleware

```typescript
// middleware.ts
import { checkPermission, getCurrentUser } from '@/app/actions';

export async function withPermission(
    resource: string,
    action: 'create' | 'read' | 'update' | 'delete'
) {
    const user = await getCurrentUser();
    if (!user) {
        throw new Error('No autenticado');
    }
    
    const hasPermission = await checkPermission(user.id, resource, action);
    if (!hasPermission) {
        throw new Error(`Sin permisos para ${action} en ${resource}`);
    }
}
```

```typescript
// Uso en server action
export async function createProduct(data: CreateProductDTO) {
    await withPermission('products', 'create');
    // ... continuar
}
```
