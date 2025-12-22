# Server Action: users.ts

## Ubicación
`app/actions/users.ts`

---

## Descripción

Server actions para la entidad **User** (Usuario del sistema).

---

## Funciones

### getUsers

Obtiene usuarios del sistema.

```typescript
'use server'

interface GetUsersParams {
    rol?: UserRole;
    search?: string;
    includeDeleted?: boolean;
}

export async function getUsers(params?: GetUsersParams): Promise<User[]>
```

---

### getUserById

Obtiene un usuario con su persona y permisos.

```typescript
interface UserWithDetails extends User {
    person?: Person;
    permissions: Permission[];
}

export async function getUserById(id: string): Promise<UserWithDetails | null>
```

---

### createUser

Crea un nuevo usuario.

```typescript
interface CreateUserDTO {
    userName: string;
    password: string;
    mail: string;
    rol: UserRole;
    personId?: string;  // Vincular a persona existente
    // O crear persona nueva
    person?: {
        type: PersonType;
        firstName: string;
        lastName?: string;
    };
}

interface UserResult {
    success: boolean;
    user?: User;
    error?: string;
}

export async function createUser(data: CreateUserDTO): Promise<UserResult>
```

**Uso:**
```tsx
// Con persona existente
const result = await createUser({
    userName: 'jperez',
    password: 'secret123',
    mail: 'jperez@email.com',
    rol: UserRole.OPERATOR,
    personId: person.id
});

// Creando persona nueva
const result = await createUser({
    userName: 'mgarcia',
    password: 'secret456',
    mail: 'mgarcia@email.com',
    rol: UserRole.OPERATOR,
    person: {
        type: PersonType.NATURAL,
        firstName: 'María',
        lastName: 'García'
    }
});
```

---

### updateUser

Actualiza un usuario.

```typescript
interface UpdateUserDTO {
    userName?: string;
    mail?: string;
    rol?: UserRole;
}

export async function updateUser(id: string, data: UpdateUserDTO): Promise<UserResult>
```

---

### deleteUser

Elimina (soft delete) un usuario.

```typescript
export async function deleteUser(id: string): Promise<{ success: boolean; error?: string }>
```

---

### resetPassword

Resetea la contraseña de un usuario (admin).

```typescript
interface ResetPasswordDTO {
    userId: string;
    newPassword: string;
}

export async function resetPassword(data: ResetPasswordDTO): Promise<{ success: boolean }>
```

---

### assignPermissions

Asigna permisos a un usuario.

```typescript
interface AssignPermissionsDTO {
    userId: string;
    permissions: {
        resource: string;
        canCreate: boolean;
        canRead: boolean;
        canUpdate: boolean;
        canDelete: boolean;
    }[];
}

export async function assignPermissions(data: AssignPermissionsDTO): Promise<{ success: boolean }>
```

**Uso:**
```tsx
await assignPermissions({
    userId: user.id,
    permissions: [
        { resource: 'products', canCreate: true, canRead: true, canUpdate: true, canDelete: false },
        { resource: 'customers', canCreate: true, canRead: true, canUpdate: false, canDelete: false },
        { resource: 'transactions', canCreate: true, canRead: true, canUpdate: false, canDelete: false }
    ]
});
```

---

## Implementación

```typescript
'use server'

import { getDataSource } from '@/data/db';
import { User, UserRole } from '@/data/entities/User';
import { Person } from '@/data/entities/Person';
import { Permission } from '@/data/entities/Permission';
import { hash } from 'bcryptjs';
import { revalidatePath } from 'next/cache';

export async function createUser(data: CreateUserDTO): Promise<UserResult> {
    const ds = await getDataSource();
    const queryRunner = ds.createQueryRunner();
    
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    try {
        // Verificar userName único
        const existing = await queryRunner.manager.findOne(User, {
            where: { userName: data.userName }
        });
        if (existing) {
            return { success: false, error: 'Nombre de usuario ya existe' };
        }
        
        let personId = data.personId;
        
        // Crear persona si se proporciona
        if (data.person && !personId) {
            const person = queryRunner.manager.create(Person, data.person);
            await queryRunner.manager.save(person);
            personId = person.id;
        }
        
        // Hashear contraseña
        const hashedPassword = await hash(data.password, 10);
        
        // Crear usuario
        const user = queryRunner.manager.create(User, {
            userName: data.userName,
            pass: hashedPassword,
            mail: data.mail,
            rol: data.rol,
            personId
        });
        
        await queryRunner.manager.save(user);
        await queryRunner.commitTransaction();
        
        revalidatePath('/admin/users');
        
        return { success: true, user };
        
    } catch (error) {
        await queryRunner.rollbackTransaction();
        console.error('Error creating user:', error);
        return { success: false, error: 'Error al crear usuario' };
    } finally {
        await queryRunner.release();
    }
}

export async function assignPermissions(data: AssignPermissionsDTO): Promise<{ success: boolean }> {
    const ds = await getDataSource();
    const queryRunner = ds.createQueryRunner();
    
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    try {
        // Eliminar permisos existentes
        await queryRunner.manager.delete(Permission, { userId: data.userId });
        
        // Crear nuevos permisos
        for (const perm of data.permissions) {
            const permission = queryRunner.manager.create(Permission, {
                userId: data.userId,
                resource: perm.resource,
                canCreate: perm.canCreate,
                canRead: perm.canRead,
                canUpdate: perm.canUpdate,
                canDelete: perm.canDelete
            });
            await queryRunner.manager.save(permission);
        }
        
        await queryRunner.commitTransaction();
        
        revalidatePath('/admin/users');
        
        return { success: true };
        
    } catch (error) {
        await queryRunner.rollbackTransaction();
        console.error('Error assigning permissions:', error);
        return { success: false };
    } finally {
        await queryRunner.release();
    }
}
```
