# Server Action: auth.server.ts

## Ubicación
`app/actions/auth.server.ts`

---

## Descripción

Server actions para autenticación y manejo de sesiones de usuario.

---

## Funciones

### login

Autentica un usuario con credenciales.

```typescript
'use server'

interface LoginCredentials {
    userName: string;
    password: string;
}

interface LoginResult {
    success: boolean;
    user?: {
        id: string;
        userName: string;
        mail: string;
        rol: UserRole;
        person?: Person;
    };
    error?: string;
}

export async function login(credentials: LoginCredentials): Promise<LoginResult>
```

**Uso:**
```tsx
const result = await login({
    userName: 'admin',
    password: 'mypassword'
});

if (result.success) {
    router.push('/admin/dashboard');
} else {
    setError(result.error);
}
```

---

### logout

Cierra la sesión del usuario actual.

```typescript
export async function logout(): Promise<{ success: boolean }>
```

**Uso:**
```tsx
await logout();
router.push('/');
```

---

### getCurrentUser

Obtiene el usuario autenticado actual.

```typescript
interface CurrentUser {
    id: string;
    userName: string;
    mail: string;
    rol: UserRole;
    person?: {
        id: string;
        firstName: string;
        lastName: string;
    };
    permissions?: Permission[];
}

export async function getCurrentUser(): Promise<CurrentUser | null>
```

**Uso:**
```tsx
const user = await getCurrentUser();
if (!user) {
    redirect('/');
}
```

---

### validateSession

Valida que la sesión actual sea válida.

```typescript
export async function validateSession(): Promise<boolean>
```

---

### changePassword

Cambia la contraseña del usuario actual.

```typescript
interface ChangePasswordDTO {
    currentPassword: string;
    newPassword: string;
}

interface ChangePasswordResult {
    success: boolean;
    error?: string;
}

export async function changePassword(data: ChangePasswordDTO): Promise<ChangePasswordResult>
```

**Uso:**
```tsx
const result = await changePassword({
    currentPassword: 'oldpass',
    newPassword: 'newpass123'
});

if (result.success) {
    toast.success('Contraseña actualizada');
}
```

---

### checkPermission

Verifica si el usuario tiene un permiso específico.

```typescript
interface PermissionCheck {
    resource: string;
    action: 'create' | 'read' | 'update' | 'delete';
}

export async function checkPermission(check: PermissionCheck): Promise<boolean>
```

**Uso:**
```tsx
const canCreate = await checkPermission({
    resource: 'products',
    action: 'create'
});

if (!canCreate) {
    toast.error('No tienes permisos para crear productos');
    return;
}
```

---

## Implementación Interna

```typescript
'use server'

import { getDataSource } from '@/data/db';
import { User } from '@/data/entities/User';
import { compare, hash } from 'bcryptjs';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

export async function login(credentials: LoginCredentials): Promise<LoginResult> {
    try {
        const ds = await getDataSource();
        const userRepo = ds.getRepository(User);
        
        // Buscar usuario
        const user = await userRepo.findOne({
            where: { userName: credentials.userName },
            relations: ['person', 'permissions']
        });
        
        if (!user) {
            return { success: false, error: 'Usuario no encontrado' };
        }
        
        // Verificar contraseña
        const valid = await compare(credentials.password, user.pass);
        if (!valid) {
            return { success: false, error: 'Contraseña incorrecta' };
        }
        
        // Crear token JWT
        const token = await new SignJWT({ 
            userId: user.id,
            userName: user.userName,
            rol: user.rol 
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setExpirationTime('8h')
            .sign(JWT_SECRET);
        
        // Guardar en cookie
        cookies().set('auth-token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 8 * 60 * 60 // 8 horas
        });
        
        // Registrar en auditoría
        await logAudit({
            userId: user.id,
            action: 'LOGIN',
            entityName: 'User',
            entityId: user.id
        });
        
        return {
            success: true,
            user: {
                id: user.id,
                userName: user.userName,
                mail: user.mail,
                rol: user.rol,
                person: user.person
            }
        };
        
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: 'Error de autenticación' };
    }
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
    try {
        const cookieStore = cookies();
        const token = cookieStore.get('auth-token')?.value;
        
        if (!token) return null;
        
        const { payload } = await jwtVerify(token, JWT_SECRET);
        
        const ds = await getDataSource();
        const user = await ds.getRepository(User).findOne({
            where: { id: payload.userId as string },
            relations: ['person', 'permissions']
        });
        
        return user;
        
    } catch {
        return null;
    }
}
```

---

## Integración con NextAuth (Alternativa)

Si se usa NextAuth.js:

```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions = {
    providers: [
        CredentialsProvider({
            name: 'credentials',
            credentials: {
                userName: { label: 'Usuario', type: 'text' },
                password: { label: 'Contraseña', type: 'password' }
            },
            async authorize(credentials) {
                const result = await login(credentials);
                if (result.success) {
                    return result.user;
                }
                return null;
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.rol = user.rol;
            }
            return token;
        },
        async session({ session, token }) {
            session.user.id = token.id;
            session.user.rol = token.rol;
            return session;
        }
    }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```
