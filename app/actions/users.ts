'use server'

import { getDb } from '@/data/db';
import { User, UserRole } from '@/data/entities/User';
import { Person, PersonType } from '@/data/entities/Person';
import { revalidatePath } from 'next/cache';
import { IsNull } from 'typeorm';
import crypto from 'crypto';

// Types
interface GetUsersParams {
    search?: string;
    rol?: UserRole;
}

interface CreateUserDTO {
    userName: string;
    mail: string;
    password: string;
    phone?: string;
    rol?: UserRole;
    personName: string;
    personDni: string;
}

interface UpdateUserDTO {
    userName?: string;
    mail?: string;
    phone?: string;
    rol?: UserRole;
    personName?: string;
    personDni?: string;
}

interface UserResult {
    success: boolean;
    user?: any;
    error?: string;
}

// Hash password with SHA256
function hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Obtiene usuarios con filtros opcionales
 */
export async function getUsers(params?: GetUsersParams): Promise<any[]> {
    const ds = await getDb();
    const repo = ds.getRepository(User);
    
    const queryBuilder = repo.createQueryBuilder('user')
        .leftJoinAndSelect('user.person', 'person')
        .where('user.deletedAt IS NULL');
    
    if (params?.search) {
        queryBuilder.andWhere(
            '(user.userName LIKE :search OR user.mail LIKE :search OR person.firstName LIKE :search OR person.lastName LIKE :search)',
            { search: `%${params.search}%` }
        );
    }
    
    if (params?.rol) {
        queryBuilder.andWhere('user.rol = :rol', { rol: params.rol });
    }
    
    queryBuilder.orderBy('user.userName', 'ASC');
    
    const users = await queryBuilder.getMany();
    
    // Map to plain objects with person info
    const result = users.map(u => ({
        id: u.id,
        userName: u.userName,
        mail: u.mail,
        rol: u.rol,
        person: u.person ? {
            id: u.person.id,
            name: [u.person.firstName, u.person.lastName].filter(Boolean).join(' '),
            dni: u.person.documentNumber,
            phone: u.person.phone,
        } : undefined
    }));
    
    return JSON.parse(JSON.stringify(result));
}

/**
 * Obtiene un usuario por ID
 */
export async function getUserById(id: string): Promise<any | null> {
    const ds = await getDb();
    const repo = ds.getRepository(User);
    
    const user = await repo.findOne({
        where: { id, deletedAt: IsNull() },
        relations: ['person']
    });
    
    if (!user) return null;
    
    const result = {
        id: user.id,
        userName: user.userName,
        mail: user.mail,
        rol: user.rol,
        person: user.person ? {
            id: user.person.id,
            name: [user.person.firstName, user.person.lastName].filter(Boolean).join(' '),
            dni: user.person.documentNumber,
            phone: user.person.phone,
        } : undefined
    };
    
    return JSON.parse(JSON.stringify(result));
}

/**
 * Crea un nuevo usuario con su persona asociada
 */
export async function createUserWithPerson(data: CreateUserDTO, currentUserId?: string): Promise<UserResult> {
    try {
        const ds = await getDb();
        const userRepo = ds.getRepository(User);
        const personRepo = ds.getRepository(Person);
        
        // Verificar userName único
        const existingUserName = await userRepo.findOne({
            where: { userName: data.userName }
        });
        
        if (existingUserName) {
            return { success: false, error: 'El nombre de usuario ya está en uso' };
        }
        
        // Verificar mail único
        const existingMail = await userRepo.findOne({
            where: { mail: data.mail }
        });
        
        if (existingMail) {
            return { success: false, error: 'El correo ya está en uso' };
        }
        
        // Crear persona primero
        const nameParts = data.personName.split(' ');
        const firstName = nameParts[0] || data.personName;
        const lastName = nameParts.slice(1).join(' ') || undefined;
        
        const person = personRepo.create({
            type: PersonType.NATURAL,
            firstName,
            lastName,
            documentNumber: data.personDni,
            email: data.mail,
            phone: data.phone,
        });
        
        await personRepo.save(person);
        
        // Crear usuario con referencia a persona
        const user = userRepo.create({
            userName: data.userName,
            mail: data.mail,
            pass: hashPassword(data.password),
            rol: data.rol || UserRole.OPERATOR,
            person: person
        });
        
        await userRepo.save(user);
        revalidatePath('/admin/users');
        
        const result = {
            id: user.id,
            userName: user.userName,
            mail: user.mail,
            rol: user.rol,
            person: {
                id: person.id,
                name: data.personName,
                dni: data.personDni,
                phone: data.phone,
            }
        };
        
        return { success: true, user: JSON.parse(JSON.stringify(result)) };
    } catch (error) {
        console.error('Error creating user:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al crear el usuario' 
        };
    }
}

/**
 * Actualiza un usuario y su persona asociada
 */
export async function updateUserWithPerson(
    data: UpdateUserDTO & { id: string }, 
    currentUserId?: string
): Promise<UserResult> {
    try {
        const ds = await getDb();
        const userRepo = ds.getRepository(User);
        const personRepo = ds.getRepository(Person);
        
        const user = await userRepo.findOne({
            where: { id: data.id, deletedAt: IsNull() },
            relations: ['person']
        });
        
        if (!user) {
            return { success: false, error: 'Usuario no encontrado' };
        }
        
        // Verificar userName único si cambia
        if (data.userName && data.userName !== user.userName) {
            const existingUserName = await userRepo.findOne({
                where: { userName: data.userName }
            });
            if (existingUserName) {
                return { success: false, error: 'El nombre de usuario ya está en uso' };
            }
            user.userName = data.userName;
        }
        
        // Verificar mail único si cambia
        if (data.mail && data.mail !== user.mail) {
            const existingMail = await userRepo.findOne({
                where: { mail: data.mail }
            });
            if (existingMail) {
                return { success: false, error: 'El correo ya está en uso' };
            }
            user.mail = data.mail;
        }
        
        if (data.rol) user.rol = data.rol;
        
        // Actualizar persona si existe
        if (user.person) {
            if (data.personName) {
                const nameParts = data.personName.split(' ');
                user.person.firstName = nameParts[0] || data.personName;
                user.person.lastName = nameParts.slice(1).join(' ') || undefined;
            }
            if (data.personDni) user.person.documentNumber = data.personDni;
            if (data.phone) user.person.phone = data.phone;
            if (data.mail) user.person.email = data.mail;
            
            await personRepo.save(user.person);
        }
        
        await userRepo.save(user);
        revalidatePath('/admin/users');
        
        const result = {
            id: user.id,
            userName: user.userName,
            mail: user.mail,
            rol: user.rol,
            person: user.person ? {
                id: user.person.id,
                name: [user.person.firstName, user.person.lastName].filter(Boolean).join(' '),
                dni: user.person.documentNumber,
                phone: user.person.phone,
            } : undefined
        };
        
        return { success: true, user: JSON.parse(JSON.stringify(result)) };
    } catch (error) {
        console.error('Error updating user:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al actualizar el usuario' 
        };
    }
}

/**
 * Elimina un usuario (soft delete)
 */
export async function deleteUser(id: string, currentUserId?: string): Promise<{ success: boolean; error?: string }> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(User);
        
        const user = await repo.findOne({
            where: { id, deletedAt: IsNull() }
        });
        
        if (!user) {
            return { success: false, error: 'Usuario no encontrado' };
        }
        
        // No permitir eliminar el usuario admin
        if (user.userName === 'admin') {
            return { success: false, error: 'No se puede eliminar el usuario administrador' };
        }
        
        // No permitir auto-eliminación
        if (currentUserId && user.id === currentUserId) {
            return { success: false, error: 'No puedes eliminarte a ti mismo' };
        }
        
        await repo.softRemove(user);
        revalidatePath('/admin/users');
        
        return { success: true };
    } catch (error) {
        console.error('Error deleting user:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al eliminar el usuario' 
        };
    }
}
