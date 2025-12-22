'use server'

import { getDb } from '@/data/db';
import { User, UserRole } from '@/data/entities/User';
import { Person, PersonType } from '@/data/entities/Person';
import { Permission } from '@/data/entities/Permission';
import { Audit } from '@/data/entities/Audit';
import { AuditActionType } from '@/data/entities/audit.types';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { IsNull } from 'typeorm';
import * as crypto from 'crypto';

// Types
interface LoginDTO {
    username: string;
    password: string;
}

interface RegisterDTO {
    username: string;
    password: string;
    email?: string;
    role?: UserRole;
    person?: {
        firstName: string;
        lastName: string;
        email?: string;
        phone?: string;
    };
}

interface UpdateUserDTO {
    userName?: string;
    mail?: string;
    rol?: UserRole;
}

interface ChangePasswordDTO {
    currentPassword: string;
    newPassword: string;
}

interface AuthResult {
    success: boolean;
    user?: Omit<User, 'pass'>;
    error?: string;
}

interface SessionUser {
    id: string;
    userName: string;
    mail?: string;
    rol: UserRole;
    personId?: string;
    personName?: string;
}

// Session cookie name
const SESSION_COOKIE = 'flow_session';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 horas

// ==================== AUTH ACTIONS ====================

/**
 * Inicia sesión de usuario
 */
export async function login(data: LoginDTO): Promise<AuthResult> {
    try {
        const ds = await getDb();
        const userRepo = ds.getRepository(User);
        const auditRepo = ds.getRepository(Audit);
        
        const user = await userRepo.findOne({
            where: { userName: data.username, deletedAt: IsNull() },
            relations: ['person']
        });
        
        if (!user) {
            await logFailedLogin(data.username, 'Usuario no encontrado');
            return { success: false, error: 'Credenciales inválidas' };
        }
        
        // Verificar contraseña
        const passwordHash = hashPassword(data.password);
        if (passwordHash !== user.pass) {
            await logFailedLogin(data.username, 'Contraseña incorrecta');
            return { success: false, error: 'Credenciales inválidas' };
        }
        
        // Crear sesión
        const sessionData: SessionUser = {
            id: user.id,
            userName: user.userName,
            mail: user.mail,
            rol: user.rol,
            personId: user.person?.id,
            personName: user.person ? `${user.person.firstName} ${user.person.lastName || ''}`.trim() : undefined
        };
        
        const cookieStore = await cookies();
        cookieStore.set(SESSION_COOKIE, JSON.stringify(sessionData), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: SESSION_DURATION / 1000,
            path: '/'
        });
        
        // Registrar auditoría
        await auditRepo.save(auditRepo.create({
            entityName: 'User',
            entityId: user.id,
            action: AuditActionType.LOGIN_SUCCESS,
            userId: user.id,
            changes: { timestamp: new Date().toISOString() }
        }));
        
        const { pass: _, ...userWithoutPassword } = user;
        return { success: true, user: userWithoutPassword as any };
    } catch (error) {
        console.error('Error in login:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al iniciar sesión' 
        };
    }
}

/**
 * Cierra la sesión del usuario
 */
export async function logout(): Promise<{ success: boolean }> {
    try {
        const session = await getCurrentSession();
        
        if (session) {
            const ds = await getDb();
            const auditRepo = ds.getRepository(Audit);
            
            await auditRepo.save(auditRepo.create({
                entityName: 'User',
                entityId: session.id,
                action: AuditActionType.LOGOUT,
                userId: session.id,
                changes: { timestamp: new Date().toISOString() }
            }));
        }
        
        const cookieStore = await cookies();
        cookieStore.delete(SESSION_COOKIE);
        
        return { success: true };
    } catch (error) {
        console.error('Error in logout:', error);
        return { success: false };
    }
}

/**
 * Obtiene la sesión actual del usuario
 */
export async function getCurrentSession(): Promise<SessionUser | null> {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get(SESSION_COOKIE);
        
        if (!sessionCookie?.value) {
            return null;
        }
        
        const session = JSON.parse(sessionCookie.value) as SessionUser;
        
        // Verificar que el usuario sigue activo
        const ds = await getDb();
        const userRepo = ds.getRepository(User);
        
        const user = await userRepo.findOne({
            where: { id: session.id, deletedAt: IsNull() }
        });
        
        if (!user) {
            // Usuario ya no existe o está inactivo
            const store = await cookies();
            store.delete(SESSION_COOKIE);
            return null;
        }
        
        return session;
    } catch (error) {
        console.error('Error getting session:', error);
        return null;
    }
}

/**
 * Verifica si hay un usuario autenticado
 */
export async function isAuthenticated(): Promise<boolean> {
    const session = await getCurrentSession();
    return session !== null;
}

/**
 * Obtiene el usuario actual con todos sus datos
 */
export async function getCurrentUser(): Promise<Omit<User, 'pass'> | null> {
    const session = await getCurrentSession();
    if (!session) return null;
    
    const ds = await getDb();
    const repo = ds.getRepository(User);
    
    const user = await repo.findOne({
        where: { id: session.id, deletedAt: IsNull() },
        relations: ['person']
    });
    
    if (!user) return null;
    
    const { pass, ...userWithoutPassword } = user;
    return userWithoutPassword as any;
}

// ==================== USER MANAGEMENT ====================

/**
 * Registra un nuevo usuario
 */
export async function registerUser(data: RegisterDTO): Promise<AuthResult> {
    try {
        const ds = await getDb();
        const userRepo = ds.getRepository(User);
        const personRepo = ds.getRepository(Person);
        
        // Verificar username único
        const existingUser = await userRepo.findOne({
            where: { userName: data.username, deletedAt: IsNull() }
        });
        if (existingUser) {
            return { success: false, error: 'El nombre de usuario ya está en uso' };
        }
        
        // Verificar email único si se proporciona
        if (data.email) {
            const existingEmail = await userRepo.findOne({
                where: { mail: data.email, deletedAt: IsNull() }
            });
            if (existingEmail) {
                return { success: false, error: 'El email ya está en uso' };
            }
        }
        
        // Crear persona si se proporciona
        let person: Person | undefined;
        if (data.person) {
            person = personRepo.create({
                type: PersonType.NATURAL,
                firstName: data.person.firstName,
                lastName: data.person.lastName,
                email: data.person.email || data.email,
                phone: data.person.phone
            });
            await personRepo.save(person);
        }
        
        // Crear usuario
        const user = userRepo.create({
            userName: data.username,
            pass: hashPassword(data.password),
            mail: data.email || '',
            rol: data.role ?? UserRole.OPERATOR,
            person
        });
        
        await userRepo.save(user);
        
        // Recargar con relaciones
        const savedUser = await userRepo.findOne({
            where: { id: user.id },
            relations: ['person']
        });
        
        revalidatePath('/admin/users');
        
        const { pass, ...userWithoutPassword } = savedUser!;
        return { success: true, user: userWithoutPassword as any };
    } catch (error) {
        console.error('Error registering user:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al registrar usuario' 
        };
    }
}

/**
 * Actualiza un usuario
 */
export async function updateUser(id: string, data: UpdateUserDTO): Promise<AuthResult> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(User);
        
        const user = await repo.findOne({ 
            where: { id, deletedAt: IsNull() },
            relations: ['person']
        });
        
        if (!user) {
            return { success: false, error: 'Usuario no encontrado' };
        }
        
        // Verificar username único si se cambia
        if (data.userName && data.userName !== user.userName) {
            const existing = await repo.findOne({ 
                where: { userName: data.userName, deletedAt: IsNull() } 
            });
            if (existing) {
                return { success: false, error: 'El nombre de usuario ya está en uso' };
            }
        }
        
        // Verificar email único si se cambia
        if (data.mail && data.mail !== user.mail) {
            const existing = await repo.findOne({ 
                where: { mail: data.mail, deletedAt: IsNull() } 
            });
            if (existing) {
                return { success: false, error: 'El email ya está en uso' };
            }
        }
        
        // Aplicar cambios
        if (data.userName !== undefined) user.userName = data.userName;
        if (data.mail !== undefined) user.mail = data.mail;
        if (data.rol !== undefined) user.rol = data.rol;
        
        await repo.save(user);
        revalidatePath('/admin/users');
        
        const { pass, ...userWithoutPassword } = user;
        return { success: true, user: userWithoutPassword as any };
    } catch (error) {
        console.error('Error updating user:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al actualizar usuario' 
        };
    }
}

/**
 * Cambia la contraseña del usuario actual
 */
export async function changePassword(data: ChangePasswordDTO): Promise<{ success: boolean; error?: string }> {
    try {
        const session = await getCurrentSession();
        if (!session) {
            return { success: false, error: 'No hay sesión activa' };
        }
        
        const ds = await getDb();
        const repo = ds.getRepository(User);
        
        const user = await repo.findOne({ where: { id: session.id } });
        if (!user) {
            return { success: false, error: 'Usuario no encontrado' };
        }
        
        // Verificar contraseña actual
        const currentHash = hashPassword(data.currentPassword);
        if (currentHash !== user.pass) {
            return { success: false, error: 'Contraseña actual incorrecta' };
        }
        
        // Validar nueva contraseña
        if (data.newPassword.length < 6) {
            return { success: false, error: 'La contraseña debe tener al menos 6 caracteres' };
        }
        
        user.pass = hashPassword(data.newPassword);
        await repo.save(user);
        
        return { success: true };
    } catch (error) {
        console.error('Error changing password:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al cambiar contraseña' 
        };
    }
}

/**
 * Resetea la contraseña de un usuario (solo admin)
 */
export async function resetUserPassword(
    userId: string, 
    newPassword: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const session = await getCurrentSession();
        if (!session || session.rol !== UserRole.ADMIN) {
            return { success: false, error: 'No autorizado' };
        }
        
        const ds = await getDb();
        const repo = ds.getRepository(User);
        
        const user = await repo.findOne({ where: { id: userId, deletedAt: IsNull() } });
        if (!user) {
            return { success: false, error: 'Usuario no encontrado' };
        }
        
        user.pass = hashPassword(newPassword);
        await repo.save(user);
        
        return { success: true };
    } catch (error) {
        console.error('Error resetting password:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al resetear contraseña' 
        };
    }
}

/**
 * Elimina (soft delete) un usuario
 */
export async function deleteUser(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const session = await getCurrentSession();
        if (!session || session.rol !== UserRole.ADMIN) {
            return { success: false, error: 'No autorizado' };
        }
        
        if (session.id === id) {
            return { success: false, error: 'No puedes eliminar tu propio usuario' };
        }
        
        const ds = await getDb();
        const repo = ds.getRepository(User);
        
        await repo.softDelete(id);
        revalidatePath('/admin/users');
        
        return { success: true };
    } catch (error) {
        console.error('Error deleting user:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al eliminar usuario' 
        };
    }
}

/**
 * Obtiene todos los usuarios
 */
export async function getUsers(): Promise<Omit<User, 'pass'>[]> {
    const ds = await getDb();
    const repo = ds.getRepository(User);
    
    const users = await repo.find({
        where: { deletedAt: IsNull() },
        relations: ['person'],
        order: { userName: 'ASC' }
    });
    
    return users.map(({ pass, ...user }) => user as any);
}

/**
 * Obtiene un usuario por ID
 */
export async function getUserById(id: string): Promise<Omit<User, 'pass'> | null> {
    const ds = await getDb();
    const repo = ds.getRepository(User);
    
    const user = await repo.findOne({
        where: { id, deletedAt: IsNull() },
        relations: ['person']
    });
    
    if (!user) return null;
    
    const { pass, ...userWithoutPassword } = user;
    return userWithoutPassword as any;
}

// ==================== PERMISSIONS ====================

/**
 * Verifica si el usuario actual tiene un permiso
 */
export async function hasPermission(permissionCode: string): Promise<boolean> {
    const session = await getCurrentSession();
    if (!session) return false;
    
    // Admin tiene todos los permisos
    if (session.rol === UserRole.ADMIN) return true;
    
    const ds = await getDb();
    const permissionRepo = ds.getRepository(Permission);
    
    // El modelo Permission usa 'ability' (enum Ability) en lugar de 'code'
    // Si el permiso existe para el usuario, está concedido
    const permission = await permissionRepo.findOne({
        where: {
            userId: session.id,
            ability: permissionCode as any // permissionCode debería ser un valor de Ability
        }
    });
    
    return permission !== null;
}

/**
 * Obtiene los permisos de un usuario
 */
export async function getUserPermissions(userId: string): Promise<Permission[]> {
    const ds = await getDb();
    const repo = ds.getRepository(Permission);
    
    return repo.find({
        where: { userId }
    });
}

/**
 * Asigna un permiso a un usuario
 */
export async function grantPermission(
    userId: string, 
    code: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const session = await getCurrentSession();
        if (!session || session.rol !== UserRole.ADMIN) {
            return { success: false, error: 'No autorizado' };
        }
        
        const ds = await getDb();
        const repo = ds.getRepository(Permission);
        
        // Verificar si ya existe el permiso
        let permission = await repo.findOne({
            where: { userId, ability: code as any }
        });
        
        if (permission) {
            // El permiso ya existe, no hacer nada
            return { success: true };
        }
        
        // Crear nuevo permiso
        permission = repo.create({
            userId,
            ability: code as any
        });
        
        await repo.save(permission);
        return { success: true };
    } catch (error) {
        console.error('Error granting permission:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al asignar permiso' 
        };
    }
}

/**
 * Revoca un permiso de un usuario
 */
export async function revokePermission(
    userId: string, 
    code: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const session = await getCurrentSession();
        if (!session || session.rol !== UserRole.ADMIN) {
            return { success: false, error: 'No autorizado' };
        }
        
        const ds = await getDb();
        const repo = ds.getRepository(Permission);
        
        // Para revocar un permiso, lo eliminamos (soft delete)
        const permission = await repo.findOne({
            where: { userId, ability: code as any }
        });
        
        if (permission) {
            await repo.softRemove(permission);
        }
        
        return { success: true };
    } catch (error) {
        console.error('Error revoking permission:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al revocar permiso' 
        };
    }
}

// ==================== HELPERS ====================

function hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
}

async function logFailedLogin(username: string, reason: string): Promise<void> {
    try {
        const ds = await getDb();
        const auditRepo = ds.getRepository(Audit);
        
        await auditRepo.save(auditRepo.create({
            entityName: 'User',
            entityId: 'system',
            action: AuditActionType.LOGIN_FAILED,
            changes: { username, reason, timestamp: new Date().toISOString() }
        }));
    } catch (error) {
        console.error('Error logging failed login:', error);
    }
}
