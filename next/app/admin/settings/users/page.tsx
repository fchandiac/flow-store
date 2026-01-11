import { getUsers } from '@/app/actions/users';
import { UserList } from './ui';

export const dynamic = 'force-dynamic';

/**
 * Gestión de Usuarios
 * Ruta: /admin/settings/users
 * CRUD de usuarios del sistema con tarjetas
 * 
 * Patrón UI:
 * - Grid de UserCards con avatar, nombre, rol, email, teléfono
 * - Búsqueda por nombre/usuario/email
 * - Dialogs para crear, editar y eliminar
 * - Control de permisos (USERS_CREATE, USERS_UPDATE, USERS_DELETE)
 */

interface UsersPageProps {
    searchParams: Promise<{ search?: string }>;
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
    const params = await searchParams;
    const search = params?.search || '';
    
    const users = await getUsers({ search: search || undefined });

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Usuarios</h1>
            <UserList users={users} />
        </div>
    );
}
