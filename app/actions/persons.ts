'use server'

import { getDb } from '@/data/db';
import { Person, PersonType } from '@/data/entities/Person';
import { Customer } from '@/data/entities/Customer';
import { Supplier } from '@/data/entities/Supplier';
import { revalidatePath } from 'next/cache';
import { IsNull, Like } from 'typeorm';

// Types
interface GetPersonsParams {
    type?: PersonType;
    search?: string;
    page?: number;
    limit?: number;
}

interface PersonsResponse {
    data: Person[];
    total: number;
}

interface CreatePersonDTO {
    type: PersonType;
    firstName: string;
    lastName?: string;
    businessName?: string;
    documentType?: string;
    documentNumber?: string;
    email?: string;
    phone?: string;
    address?: string;
}

interface UpdatePersonDTO {
    firstName?: string;
    lastName?: string;
    businessName?: string;
    documentType?: string;
    documentNumber?: string;
    email?: string;
    phone?: string;
    address?: string;
}

interface PersonResult {
    success: boolean;
    person?: Person;
    error?: string;
}

/**
 * Obtiene personas con filtros
 */
export async function getPersons(params?: GetPersonsParams): Promise<PersonsResponse> {
    const ds = await getDb();
    const repo = ds.getRepository(Person);
    
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const skip = (page - 1) * limit;
    
    const queryBuilder = repo.createQueryBuilder('person')
        .where('person.deletedAt IS NULL');
    
    if (params?.type) {
        queryBuilder.andWhere('person.type = :type', { type: params.type });
    }
    
    if (params?.search) {
        queryBuilder.andWhere(
            '(person.firstName LIKE :search OR person.lastName LIKE :search OR person.businessName LIKE :search OR person.documentNumber LIKE :search OR person.email LIKE :search)',
            { search: `%${params.search}%` }
        );
    }
    
    queryBuilder
        .orderBy('person.firstName', 'ASC')
        .addOrderBy('person.lastName', 'ASC')
        .skip(skip)
        .take(limit);
    
    const [data, total] = await queryBuilder.getManyAndCount();
    
    return { data, total };
}

/**
 * Obtiene una persona por ID
 */
export async function getPersonById(id: string): Promise<Person | null> {
    const ds = await getDb();
    const repo = ds.getRepository(Person);
    
    return repo.findOne({
        where: { id, deletedAt: IsNull() }
    });
}

/**
 * Busca persona por número de documento
 */
export async function getPersonByDocumentNumber(documentNumber: string): Promise<Person | null> {
    const ds = await getDb();
    const repo = ds.getRepository(Person);
    
    return repo.findOne({
        where: { documentNumber, deletedAt: IsNull() }
    });
}

/**
 * Crea una nueva persona
 */
export async function createPerson(data: CreatePersonDTO): Promise<PersonResult> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(Person);
        
        // Validaciones
        if (data.type === PersonType.NATURAL && !data.lastName) {
            return { success: false, error: 'El apellido es requerido para personas naturales' };
        }
        
        if (data.type === PersonType.COMPANY && !data.businessName) {
            return { success: false, error: 'La razón social es requerida para empresas' };
        }
        
        // Verificar documento único si se proporciona
        if (data.documentNumber) {
            const existing = await repo.findOne({ 
                where: { documentNumber: data.documentNumber, deletedAt: IsNull() } 
            });
            if (existing) {
                return { success: false, error: 'Ya existe una persona con ese número de documento' };
            }
        }
        
        const person = repo.create({
            type: data.type,
            firstName: data.firstName,
            lastName: data.lastName,
            businessName: data.businessName,
            documentType: data.documentType,
            documentNumber: data.documentNumber,
            email: data.email,
            phone: data.phone,
            address: data.address
        });
        
        await repo.save(person);
        revalidatePath('/admin/persons');
        
        return { success: true, person };
    } catch (error) {
        console.error('Error creating person:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al crear la persona' 
        };
    }
}

/**
 * Actualiza una persona
 */
export async function updatePerson(id: string, data: UpdatePersonDTO): Promise<PersonResult> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(Person);
        
        const person = await repo.findOne({ 
            where: { id, deletedAt: IsNull() } 
        });
        
        if (!person) {
            return { success: false, error: 'Persona no encontrada' };
        }
        
        // Verificar documento único si se cambia
        if (data.documentNumber && data.documentNumber !== person.documentNumber) {
            const existing = await repo.findOne({ 
                where: { documentNumber: data.documentNumber, deletedAt: IsNull() } 
            });
            if (existing) {
                return { success: false, error: 'Ya existe una persona con ese número de documento' };
            }
        }
        
        if (data.firstName !== undefined) person.firstName = data.firstName;
        if (data.lastName !== undefined) person.lastName = data.lastName;
        if (data.businessName !== undefined) person.businessName = data.businessName;
        if (data.documentType !== undefined) person.documentType = data.documentType;
        if (data.documentNumber !== undefined) person.documentNumber = data.documentNumber;
        if (data.email !== undefined) person.email = data.email;
        if (data.phone !== undefined) person.phone = data.phone;
        if (data.address !== undefined) person.address = data.address;
        
        await repo.save(person);
        revalidatePath('/admin/persons');
        
        return { success: true, person };
    } catch (error) {
        console.error('Error updating person:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al actualizar la persona' 
        };
    }
}

/**
 * Elimina (soft delete) una persona
 */
export async function deletePerson(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(Person);
        const customerRepo = ds.getRepository(Customer);
        const supplierRepo = ds.getRepository(Supplier);
        
        const person = await repo.findOne({ 
            where: { id, deletedAt: IsNull() }
        });
        
        if (!person) {
            return { success: false, error: 'Persona no encontrada' };
        }
        
        // Verificar que no tenga Customer o Supplier activos usando queries directas
        const customerCount = await customerRepo.count({ 
            where: { personId: id, deletedAt: IsNull() } 
        });
        if (customerCount > 0) {
            return { success: false, error: 'No se puede eliminar: tiene registros de cliente asociados' };
        }
        
        const supplierCount = await supplierRepo.count({ 
            where: { personId: id, deletedAt: IsNull() } 
        });
        if (supplierCount > 0) {
            return { success: false, error: 'No se puede eliminar: tiene registros de proveedor asociados' };
        }
        
        await repo.softDelete(id);
        revalidatePath('/admin/persons');
        
        return { success: true };
    } catch (error) {
        console.error('Error deleting person:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al eliminar la persona' 
        };
    }
}

/**
 * Obtiene nombre completo de la persona
 */
export function getPersonFullName(person: Person): string {
    if (person.type === PersonType.COMPANY) {
        return person.businessName || person.firstName;
    }
    return `${person.firstName} ${person.lastName || ''}`.trim();
}
