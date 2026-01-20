'use server'

import { getDb } from '@/data/db';
import { Customer } from '@/data/entities/Customer';
import { DocumentType, Person, PersonType } from '@/data/entities/Person';
import { Transaction } from '@/data/entities/Transaction';
import { revalidatePath } from 'next/cache';
import { IsNull } from 'typeorm';

// Types
interface GetCustomersParams {
    search?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
}

interface CustomersResponse {
    data: {
        id: string;
        personId: string;
        creditLimit: number;
        paymentDayOfMonth: 5 | 10 | 15 | 20 | 25 | 30;
        notes?: string;
        currentBalance: number;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        person: {
            id: string;
            type: PersonType;
            firstName: string;
            lastName?: string;
            businessName?: string;
            documentType?: DocumentType | null;
            documentNumber?: string;
            email?: string;
            phone?: string;
            address?: string;
            createdAt: Date;
            updatedAt: Date;
        };
    }[];
    total: number;
}

interface CreateCustomerDTO {
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
    creditLimit?: number;
    paymentDayOfMonth?: 5 | 10 | 15 | 20 | 25 | 30;
    notes?: string;
}

interface UpdateCustomerDTO {
    creditLimit?: number;
    paymentDayOfMonth?: 5 | 10 | 15 | 20 | 25 | 30;
    notes?: string;
    isActive?: boolean;
}

interface CustomerResult {
    success: boolean;
    customer?: Customer;
    error?: string;
}

/**
 * Obtiene clientes con filtros
 */
export async function getCustomers(params?: GetCustomersParams): Promise<CustomersResponse> {
    const ds = await getDb();
    const repo = ds.getRepository(Customer);
    
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const skip = (page - 1) * limit;
    
    const queryBuilder = repo.createQueryBuilder('customer')
        .leftJoinAndSelect('customer.person', 'person')
        .where('customer.deletedAt IS NULL')
        .andWhere('person.deletedAt IS NULL');
    
    if (params?.search) {
        queryBuilder.andWhere(
            '(person.firstName LIKE :search OR person.lastName LIKE :search OR person.businessName LIKE :search OR person.documentNumber LIKE :search)',
            { search: `%${params.search}%` }
        );
    }
    
    if (params?.isActive !== undefined) {
        queryBuilder.andWhere('customer.isActive = :isActive', { isActive: params.isActive });
    }
    
    queryBuilder
        .orderBy('person.firstName', 'ASC')
        .addOrderBy('person.lastName', 'ASC')
        .skip(skip)
        .take(limit);
    
    const [data, total] = await queryBuilder.getManyAndCount();
    
    // Convertir a objetos planos para evitar problemas de serialización
    const plainData = data.map(customer => ({
        id: customer.id,
        personId: customer.personId,
        creditLimit: customer.creditLimit,
        paymentDayOfMonth: customer.paymentDayOfMonth,
        notes: customer.notes,
        currentBalance: customer.currentBalance,
        isActive: customer.isActive,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
        person: {
            id: customer.person!.id,
            type: customer.person!.type,
            firstName: customer.person!.firstName,
            lastName: customer.person!.lastName,
            businessName: customer.person!.businessName,
            documentType: customer.person!.documentType,
            documentNumber: customer.person!.documentNumber,
            email: customer.person!.email,
            phone: customer.person!.phone,
            address: customer.person!.address,
            createdAt: customer.person!.createdAt,
            updatedAt: customer.person!.updatedAt,
        }
    }));
    
    return { data: plainData, total };
}

/**
 * Obtiene un cliente por ID con detalles
 */
export async function getCustomerById(id: string): Promise<(Customer & { 
    person: Person; 
    recentTransactions: Transaction[];
}) | null> {
    const ds = await getDb();
    const customerRepo = ds.getRepository(Customer);
    const transactionRepo = ds.getRepository(Transaction);
    
    const customer = await customerRepo.findOne({
        where: { id, deletedAt: IsNull() },
        relations: ['person']
    });
    
    if (!customer) return null;
    
    const recentTransactions = await transactionRepo.find({
        where: { customerId: id },
        order: { createdAt: 'DESC' },
        take: 10
    });
    
    // Convertir a objeto plano
    const plainCustomer = {
        id: customer.id,
        personId: customer.personId,
        creditLimit: customer.creditLimit,
        paymentDayOfMonth: customer.paymentDayOfMonth,
        notes: customer.notes,
        currentBalance: customer.currentBalance,
        isActive: customer.isActive,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
        person: customer.person ? {
            id: customer.person.id,
            type: customer.person.type,
            firstName: customer.person.firstName,
            lastName: customer.person.lastName,
            businessName: customer.person.businessName,
            documentType: customer.person.documentType,
            documentNumber: customer.person.documentNumber,
            email: customer.person.email,
            phone: customer.person.phone,
            address: customer.person.address,
            createdAt: customer.person.createdAt,
            updatedAt: customer.person.updatedAt,
        } : undefined,
        recentTransactions: recentTransactions.map(tx => ({
            id: tx.id,
            customerId: tx.customerId,
            documentNumber: tx.documentNumber,
            transactionType: tx.transactionType,
            status: tx.status,
            total: tx.total,
            createdAt: tx.createdAt,
        }))
    };
    
    return plainCustomer as any;
}

/**
 * Crea un nuevo cliente
 */
export async function createCustomer(data: CreateCustomerDTO): Promise<CustomerResult> {
    try {
        const ds = await getDb();
        const customerRepo = ds.getRepository(Customer);
        const personRepo = ds.getRepository(Person);
        
        let personId = data.personId;
        
        // Si se proporciona persona nueva, crearla
        if (data.person && !personId) {
            // Validar persona
            if (data.person.type === PersonType.NATURAL && !data.person.lastName) {
                return { success: false, error: 'El apellido es requerido para personas naturales' };
            }

            let documentType: DocumentType;
            if (data.person.type === PersonType.COMPANY) {
                if (data.person.documentType && data.person.documentType !== DocumentType.RUT) {
                    return { success: false, error: 'Las empresas deben usar documento tipo RUT' };
                }
                documentType = DocumentType.RUT;
            } else {
                if (data.person.documentType === DocumentType.RUT) {
                    return { success: false, error: 'Las personas naturales no pueden tener documento tipo RUT' };
                }
                documentType = data.person.documentType ?? DocumentType.RUN;
            }
            
            // Verificar documento único
            if (data.person.documentNumber) {
                const existingPerson = await personRepo.findOne({
                    where: { documentNumber: data.person.documentNumber, deletedAt: IsNull() }
                });
                if (existingPerson) {
                    return { success: false, error: 'Ya existe una persona con ese número de documento' };
                }
            }
            
            const person = personRepo.create({
                ...data.person,
                documentType,
                email: data.person.email,
            });
            await personRepo.save(person);
            personId = person.id;
        }
        
        if (!personId) {
            return { success: false, error: 'Se requiere personId o datos de persona' };
        }
        
        // Verificar que la persona no sea ya cliente
        const existingCustomerForPerson = await customerRepo.findOne({
            where: { personId, deletedAt: IsNull() }
        });
        if (existingCustomerForPerson) {
            return { success: false, error: 'Esta persona ya es cliente' };
        }
        
        const customer = customerRepo.create({
            personId,
            creditLimit: data.creditLimit ?? 0,
            paymentDayOfMonth: data.paymentDayOfMonth ?? 5,
            notes: data.notes,
            currentBalance: 0,
            isActive: true
        });
        
        await customerRepo.save(customer);
        
        // Recargar con relaciones
        const savedCustomer = await customerRepo.findOne({
            where: { id: customer.id },
            relations: ['person']
        });
        
        revalidatePath('/admin/sales/customers');
        
        // Convertir a objeto plano para evitar problemas de serialización
        const plainCustomer = {
            id: savedCustomer!.id,
            personId: savedCustomer!.personId,
            creditLimit: savedCustomer!.creditLimit,
            paymentDayOfMonth: savedCustomer!.paymentDayOfMonth,
            notes: savedCustomer!.notes,
            currentBalance: savedCustomer!.currentBalance,
            isActive: savedCustomer!.isActive,
            createdAt: savedCustomer!.createdAt,
            updatedAt: savedCustomer!.updatedAt,
            person: savedCustomer!.person ? {
                id: savedCustomer!.person.id,
                type: savedCustomer!.person.type,
                firstName: savedCustomer!.person.firstName,
                lastName: savedCustomer!.person.lastName,
                businessName: savedCustomer!.person.businessName,
                documentType: savedCustomer!.person.documentType,
                documentNumber: savedCustomer!.person.documentNumber,
                email: savedCustomer!.person.email,
                phone: savedCustomer!.person.phone,
                address: savedCustomer!.person.address,
                createdAt: savedCustomer!.person.createdAt,
                updatedAt: savedCustomer!.person.updatedAt,
            } : undefined
        };
        
        return { success: true, customer: plainCustomer };
    } catch (error) {
        console.error('Error creating customer:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al crear el cliente' 
        };
    }
}

/**
 * Actualiza un cliente
 */
export async function updateCustomer(id: string, data: UpdateCustomerDTO): Promise<CustomerResult> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(Customer);
        
        const customer = await repo.findOne({ 
            where: { id, deletedAt: IsNull() },
            relations: ['person']
        });
        
        if (!customer) {
            return { success: false, error: 'Cliente no encontrado' };
        }
        
        if (data.creditLimit !== undefined) customer.creditLimit = data.creditLimit;
        if (data.paymentDayOfMonth !== undefined) customer.paymentDayOfMonth = data.paymentDayOfMonth;
        if (data.notes !== undefined) customer.notes = data.notes;
        if (data.isActive !== undefined) customer.isActive = data.isActive;
        
        await repo.save(customer);
        revalidatePath('/admin/sales/customers');
        
        // Convertir a objeto plano
        const plainCustomer = {
            id: customer.id,
            personId: customer.personId,
            creditLimit: customer.creditLimit,
            paymentDayOfMonth: customer.paymentDayOfMonth,
            notes: customer.notes,
            currentBalance: customer.currentBalance,
            isActive: customer.isActive,
            createdAt: customer.createdAt,
            updatedAt: customer.updatedAt,
            person: customer.person ? {
                id: customer.person.id,
                type: customer.person.type,
                firstName: customer.person.firstName,
                lastName: customer.person.lastName,
                businessName: customer.person.businessName,
                documentType: customer.person.documentType,
                documentNumber: customer.person.documentNumber,
                email: customer.person.email,
                phone: customer.person.phone,
                address: customer.person.address,
                createdAt: customer.person.createdAt,
                updatedAt: customer.person.updatedAt,
            } : undefined
        };
        
        return { success: true, customer: plainCustomer };
    } catch (error) {
        console.error('Error updating customer:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al actualizar el cliente' 
        };
    }
}

/**
 * Elimina (soft delete) un cliente
 */
export async function deleteCustomer(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(Customer);
        const transactionRepo = ds.getRepository(Transaction);
        
        const customer = await repo.findOne({ 
            where: { id, deletedAt: IsNull() } 
        });
        
        if (!customer) {
            return { success: false, error: 'Cliente no encontrado' };
        }
        
        // Verificar que no tenga transacciones
        const transactionCount = await transactionRepo.count({
            where: { customerId: id }
        });
        
        if (transactionCount > 0) {
            return { success: false, error: 'No se puede eliminar: tiene transacciones asociadas' };
        }
        
        await repo.softDelete(id);
        revalidatePath('/admin/sales/customers');
        
        return { success: true };
    } catch (error) {
        console.error('Error deleting customer:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al eliminar el cliente' 
        };
    }
}

/**
 * Actualiza el saldo del cliente
 */
export async function updateCustomerBalance(
    customerId: string, 
    amount: number,
    operation: 'add' | 'subtract'
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(Customer);
        
        const customer = await repo.findOne({ where: { id: customerId } });
        if (!customer) {
            return { success: false, error: 'Cliente no encontrado' };
        }
        
        const currentBalance = Number(customer.currentBalance) || 0;
        const newBalance = operation === 'add' 
            ? currentBalance + amount 
            : currentBalance - amount;
        
        customer.currentBalance = newBalance;
        await repo.save(customer);
        
        return { success: true, newBalance };
    } catch (error) {
        console.error('Error updating customer balance:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al actualizar saldo' 
        };
    }
}
