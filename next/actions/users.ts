'use server'

import { getDb } from '@/data/db';
import { User, UserRole } from '@/data/entities/User';
import { DocumentType, Person, PersonType } from '@/data/entities/Person';
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
    rol?: UserRole;
    personId?: string;
    person?: {
        type: PersonType;
        firstName: string;
        lastName?: string;
        businessName?: string;
        documentType?: DocumentType | null;
        documentNumber?: string;
        email?: string;
        phone?: string;
        address?: string;
    };
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

        let person: Person | null = null;

        if (data.personId) {
            person = await personRepo.findOne({
                where: { id: data.personId, deletedAt: IsNull() },
            });

            if (!person) {
                return { success: false, error: 'Persona no encontrada' };
            }

            if (data.person) {
                const { email, phone, address, documentType, documentNumber } = data.person;
                let updated = false;

                if (email !== undefined && email !== person.email) {
                    person.email = email;
                    updated = true;
                }

                if (phone !== undefined && phone !== person.phone) {
                    person.phone = phone;
                    updated = true;
                }

                if (address !== undefined && address !== person.address) {
                    person.address = address;
                    updated = true;
                }

                if (documentNumber && documentNumber !== person.documentNumber) {
                    const existingDoc = await personRepo.findOne({
                        where: { documentNumber, deletedAt: IsNull() },
                    });
                    if (existingDoc && existingDoc.id !== person.id) {
                        return { success: false, error: 'Ya existe una persona con ese número de documento' };
                    }
                    person.documentNumber = documentNumber;
                    updated = true;
                }

                if (person.type === PersonType.COMPANY) {
                    if (documentType && documentType !== DocumentType.RUT) {
                        return { success: false, error: 'Las empresas deben usar documento tipo RUT' };
                    }
                    if (person.documentType !== DocumentType.RUT) {
                        person.documentType = DocumentType.RUT;
                        updated = true;
                    }
                } else {
                    if (documentType === DocumentType.RUT) {
                        return { success: false, error: 'Las personas naturales no pueden tener documento tipo RUT' };
                    }
                    if (documentType) {
                        if (person.documentType !== documentType) {
                            person.documentType = documentType;
                            updated = true;
                        }
                    } else if (!person.documentType || person.documentType === DocumentType.RUT) {
                        person.documentType = DocumentType.RUN;
                        updated = true;
                    }
                }

                if (updated) {
                    await personRepo.save(person);
                }
            } else {
                if (person.type === PersonType.COMPANY && person.documentType !== DocumentType.RUT) {
                    person.documentType = DocumentType.RUT;
                    await personRepo.save(person);
                }
                if (person.type === PersonType.NATURAL && (!person.documentType || person.documentType === DocumentType.RUT)) {
                    person.documentType = DocumentType.RUN;
                    await personRepo.save(person);
                }
            }
        } else if (data.person) {
            const personData = data.person;

            if (!personData.firstName?.trim()) {
                return { success: false, error: 'El nombre es obligatorio para la persona' };
            }

            if (personData.type === PersonType.NATURAL && !personData.lastName?.trim()) {
                return { success: false, error: 'El apellido es obligatorio para personas naturales' };
            }

            if (personData.type === PersonType.COMPANY && !personData.businessName?.trim()) {
                return { success: false, error: 'La razón social es obligatoria para empresas' };
            }

            let resolvedDocumentType: DocumentType;
            if (personData.type === PersonType.COMPANY) {
                if (personData.documentType && personData.documentType !== DocumentType.RUT) {
                    return { success: false, error: 'Las empresas deben usar documento tipo RUT' };
                }
                resolvedDocumentType = DocumentType.RUT;
            } else {
                if (personData.documentType === DocumentType.RUT) {
                    return { success: false, error: 'Las personas naturales no pueden tener documento tipo RUT' };
                }
                resolvedDocumentType = personData.documentType ?? DocumentType.RUN;
            }

            if (personData.documentNumber) {
                const existingDni = await personRepo.findOne({
                    where: { documentNumber: personData.documentNumber, deletedAt: IsNull() },
                });

                if (existingDni) {
                    return { success: false, error: 'Ya existe una persona con ese número de documento' };
                }
            }

            const createdPerson = personRepo.create({
                type: personData.type,
                firstName: personData.firstName,
                lastName: personData.lastName,
                businessName: personData.businessName,
                documentType: resolvedDocumentType,
                documentNumber: personData.documentNumber,
                email: personData.email ?? data.mail,
                phone: personData.phone,
                address: personData.address,
            });

            await personRepo.save(createdPerson);
            person = createdPerson;
        } else {
            return { success: false, error: 'Debes seleccionar o crear una persona' };
        }

        if (!person) {
            return { success: false, error: 'No fue posible asociar la persona al usuario' };
        }

        const user = userRepo.create({
            userName: data.userName,
            mail: data.mail,
            pass: hashPassword(data.password),
            rol: data.rol || UserRole.OPERATOR,
            person,
        });

        await userRepo.save(user);
        revalidatePath('/admin/settings/users');
        
        const result = {
            id: user.id,
            userName: user.userName,
            mail: user.mail,
            rol: user.rol,
            person: person
                ? {
                      id: person.id,
                      name: [person.firstName, person.lastName].filter(Boolean).join(' '),
                      dni: person.documentNumber,
                      phone: person.phone,
                  }
                : undefined,
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
        revalidatePath('/admin/settings/users');
        
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
        revalidatePath('/admin/settings/users');
        
        return { success: true };
    } catch (error) {
        console.error('Error deleting user:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al eliminar el usuario' 
        };
    }
}
