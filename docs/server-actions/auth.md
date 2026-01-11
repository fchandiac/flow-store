# Server Action: auth.server.ts

## Ubicación
`app/actions/auth.server.ts`

---

## Descripción

Helpers de servidor que exponen la sesión de NextAuth a otras server actions o scripts. El login, logout y la auditoría de accesos se manejan directamente en `authOptions` dentro de NextAuth.

---

## Funciones

### getCurrentSession

Devuelve información básica de la sesión activa obtenida desde NextAuth.

```ts
import { getCurrentSession } from '@/app/actions/auth.server';

const session = await getCurrentSession();
if (!session) {
  redirect('/');
}
```

**Firma:**

```ts
interface SessionInfo {
  id: string;
  userName: string;
  name?: string | null;
  email?: string | null;
  rol: UserRole;
  permissions: string[];
}

export async function getCurrentSession(): Promise<SessionInfo | null>;
```

### getCurrentUser

Busca el usuario asociado a la sesión actual en la base de datos (incluye relaciones como `person`). Ideal para server actions que necesitan loader completo del usuario.

```ts
const user = await getCurrentUser();
if (!user) {
  throw new Error('Sesión inválida');
}
```

### isAuthenticated

Atajo que indica si hay sesión válida.

```ts
if (!(await isAuthenticated())) {
  return { success: false, error: 'No autorizado' };
}
```

---

## Flujo de autenticación

1. **Credenciales**: `app/api/auth/authOptions.ts` usa `CredentialsProvider` para validar usuario/contraseña con bcrypt (migrando hashes SHA256 existentes a bcrypt automáticamente).
2. **Sesión JWT**: NextAuth guarda los datos en un JWT firmado y los expone mediante `getServerSession`.
3. **Server Actions**: `auth.server.ts` reutiliza `getServerSession(authOptions)` para exponer información consumible por otras server actions.
4. **Cliente**: Componentes React utilizan `useSession`, `signIn` y `signOut` directamente desde NextAuth.

---

## Requisitos

- Variables de entorno: `NEXTAUTH_SECRET` y `NEXTAUTH_URL` deben estar configuradas.
- Hashes de usuario: todos los seeds y scripts deben producir contraseñas con `bcrypt.hash(..., 12)` para alinearse con el flujo de autorización.

---

## Recursos Relacionados

- `app/api/auth/authOptions.ts`: configuración principal de NextAuth.
- `app/Providers.tsx`: registra `SessionProvider` en el árbol de React.
- `app/state/contexts/PermissionsContext.tsx`: deriva habilidades desde la sesión.
- `app/api/auth/check-session/route.ts`: endpoint que reutiliza NextAuth para exponer información de sesión al cliente.
