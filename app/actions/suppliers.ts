'use server'

import { getDb } from '@/data/db';
import { Supplier, SupplierType } from '@/data/entities/Supplier';
import { Person, PersonType } from '@/data/entities/Person';
import { revalidatePath } from 'next/cache';
import { IsNull } from 'typeorm';

// Types
interface GetSuppliersParams {
    search?: string;
    supplierType?: SupplierType;
    isActive?: boolean;
}

interface CreateSupplierDTO {
    // Person fields
    firstName: string;
    lastName?: string;
    businessName?: string;
    documentType?: string;
    documentNumber?: string;
    email?: string;
    phone?: string;
    address?: string;
    // Supplier fields
    supplierType?: SupplierType;
    creditLimit?: number;
    defaultPaymentTermDays?: number;
    bankName?: string;
    bankAccountNumber?: string;
    bankAccountType?: string;
    notes?: string;
}

interface UpdateSupplierDTO {
    // Person fields
    firstName?: string;
    lastName?: string;
    businessName?: string;
    documentType?: string;
    documentNumber?: string;
    email?: string;
    phone?: string;
    address?: string;
    // Supplier fields
    supplierType?: SupplierType;
    creditLimit?: number;
    currentBalance?: number;
    defaultPaymentTermDays?: number;
    bankName?: string;
    bankAccountNumber?: string;
    bankAccountType?: string;
    isActive?: boolean;
    notes?: string;
}

type PlainSupplier = Supplier & { person: Person | null };

interface SupplierResult {
    success: boolean;
    supplier?: PlainSupplier;
    error?: string;
}

const toPlainSupplier = (supplier: Supplier): PlainSupplier => {
    if (typeof structuredClone === 'function') {
        const cloned = structuredClone({
            ...supplier,
            person: supplier.person ? structuredClone({ ...supplier.person }) : null,
        });

        if (Object.getPrototypeOf(cloned) === null) {
            Object.setPrototypeOf(cloned, Object.prototype);
        }

        if (cloned.person && Object.getPrototypeOf(cloned.person) === null) {
            Object.setPrototypeOf(cloned.person, Object.prototype);
        }

        return cloned as PlainSupplier;
    }

    const plainSupplier = {
        ...supplier,
        person: supplier.person ? { ...supplier.person } : null,
    };
    const jsonCloned = JSON.parse(JSON.stringify(plainSupplier));
    const normalizedSupplier = Object.assign({}, jsonCloned);
    const normalizedPerson = jsonCloned.person && typeof jsonCloned.person === 'object'
        ? Object.assign({}, jsonCloned.person)
        : null;

    return {
        ...normalizedSupplier,
        person: normalizedPerson,
    } as PlainSupplier;
};

const cloneSupplier = (supplier: Supplier | null | undefined): PlainSupplier | null => {
    return supplier ? toPlainSupplier(supplier) : null;
};

/**
 * Obtiene proveedores con filtros opcionales
 */
export async function getSuppliers(params?: GetSuppliersParams): Promise<PlainSupplier[]> {
    const ds = await getDb();
    const repo = ds.getRepository(Supplier);
    
    const queryBuilder = repo.createQueryBuilder('supplier')
        .leftJoinAndSelect('supplier.person', 'person')
        .where('supplier.deletedAt IS NULL');
    
    if (params?.search) {
        queryBuilder.andWhere(
            '(person.firstName LIKE :search OR person.lastName LIKE :search OR person.businessName LIKE :search)',
            { search: `%${params.search}%` }
        );
    }
    
    if (params?.supplierType) {
        queryBuilder.andWhere('supplier.supplierType = :supplierType', { supplierType: params.supplierType });
    }
    
    if (params?.isActive !== undefined) {
        queryBuilder.andWhere('supplier.isActive = :isActive', { isActive: params.isActive });
    }
    
    queryBuilder.orderBy('person.firstName', 'ASC');
    
    const suppliers = await queryBuilder.getMany();
    return suppliers.map(toPlainSupplier);
}

/**
 * Obtiene un proveedor por ID
 */
export async function getSupplierById(id: string): Promise<PlainSupplier | null> {
    const ds = await getDb();
    const repo = ds.getRepository(Supplier);
    
    const supplier = await repo.findOne({
        where: { id, deletedAt: IsNull() },
        relations: ['person']
    });

    return cloneSupplier(supplier);
}

/**
 * Obtiene un proveedor por código
 */


/**
 * Crea un nuevo proveedor
 */
export async function createSupplier(data: CreateSupplierDTO): Promise<SupplierResult> {
    try {
        const ds = await getDb();
        const supplierRepo = ds.getRepository(Supplier);
        const personRepo = ds.getRepository(Person);
        

        
        // Crear persona primero
        const person = personRepo.create({
            type: PersonType.COMPANY,
            firstName: data.firstName,
            lastName: data.lastName,
            businessName: data.businessName,
            documentType: data.documentType,
            documentNumber: data.documentNumber,
            email: data.email,
            phone: data.phone,
            address: data.address
        });
        
        await personRepo.save(person);
        
        // Crear proveedor
        const supplier = supplierRepo.create({
            personId: person.id,
            supplierType: data.supplierType || SupplierType.LOCAL,
            creditLimit: data.creditLimit || 0,
            currentBalance: 0,
            defaultPaymentTermDays: data.defaultPaymentTermDays || 30,
            bankName: data.bankName,
            bankAccountNumber: data.bankAccountNumber,
            bankAccountType: data.bankAccountType,
            notes: data.notes,
            isActive: true
        });
        
        await supplierRepo.save(supplier);
        
        // Cargar proveedor con relación
        const savedSupplier = await supplierRepo.findOne({
            where: { id: supplier.id },
            relations: ['person']
        });
        
        revalidatePath('/admin/inventory/suppliers');

        const plainSupplier = cloneSupplier(savedSupplier)!;
        return { success: true, supplier: plainSupplier };
    } catch (error) {
        console.error('Error creating supplier:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al crear el proveedor' 
        };
    }
}

/**
 * Actualiza un proveedor
 */
export async function updateSupplier(id: string, data: UpdateSupplierDTO): Promise<SupplierResult> {
    try {
        const ds = await getDb();
        const supplierRepo = ds.getRepository(Supplier);
        const personRepo = ds.getRepository(Person);
        
        const supplier = await supplierRepo.findOne({
            where: { id, deletedAt: IsNull() },
            relations: ['person']
        });
        
        if (!supplier) {
            return { success: false, error: 'Proveedor no encontrado' };
        }
        

        
        // Actualizar campos de la persona
        const person = supplier.person;
        if (!person) {
            return { success: false, error: 'Datos de persona no encontrados' };
        }
        if (data.firstName !== undefined) person.firstName = data.firstName;
        if (data.lastName !== undefined) person.lastName = data.lastName;
        if (data.businessName !== undefined) person.businessName = data.businessName;
        if (data.documentType !== undefined) person.documentType = data.documentType;
        if (data.documentNumber !== undefined) person.documentNumber = data.documentNumber;
        if (data.email !== undefined) person.email = data.email;
        if (data.phone !== undefined) person.phone = data.phone;
        if (data.address !== undefined) person.address = data.address;
        
        await personRepo.save(person);
        
        // Actualizar campos del proveedor
        if (data.supplierType !== undefined) supplier.supplierType = data.supplierType;
        if (data.creditLimit !== undefined) supplier.creditLimit = data.creditLimit;
        if (data.currentBalance !== undefined) supplier.currentBalance = data.currentBalance;
        if (data.defaultPaymentTermDays !== undefined) supplier.defaultPaymentTermDays = data.defaultPaymentTermDays;
        if (data.bankName !== undefined) supplier.bankName = data.bankName;
        if (data.bankAccountNumber !== undefined) supplier.bankAccountNumber = data.bankAccountNumber;
        if (data.bankAccountType !== undefined) supplier.bankAccountType = data.bankAccountType;
        if (data.isActive !== undefined) supplier.isActive = data.isActive;
        if (data.notes !== undefined) supplier.notes = data.notes;
        
        await supplierRepo.save(supplier);

        const updatedSupplier = await supplierRepo.findOne({
            where: { id },
            relations: ['person']
        });

        revalidatePath('/admin/inventory/suppliers');
        
        const plainSupplier = cloneSupplier(updatedSupplier)!;
        return { success: true, supplier: plainSupplier };
    } catch (error) {
        console.error('Error updating supplier:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al actualizar el proveedor' 
        };
    }
}

/**
 * Elimina un proveedor (soft delete)
 */
export async function deleteSupplier(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(Supplier);
        
        const supplier = await repo.findOne({
            where: { id, deletedAt: IsNull() }
        });
        
        if (!supplier) {
            return { success: false, error: 'Proveedor no encontrado' };
        }
        
        await repo.softRemove(supplier);
        revalidatePath('/admin/inventory/suppliers');
        
        return { success: true };
    } catch (error) {
        console.error('Error deleting supplier:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al eliminar el proveedor' 
        };
    }
}

/**
 * Busca proveedores por texto
 */
export async function searchSuppliers(query: string, limit: number = 20): Promise<PlainSupplier[]> {
    const ds = await getDb();
    const repo = ds.getRepository(Supplier);
    

    const suppliers = await repo.createQueryBuilder('supplier')
        .leftJoinAndSelect('supplier.person', 'person')
        .where('supplier.deletedAt IS NULL')
        .andWhere('supplier.isActive = true')
        .andWhere(
            '(person.firstName LIKE :query OR person.lastName LIKE :query OR person.businessName LIKE :query)',
            { query: `%${query}%` }
        )
        .orderBy('person.firstName', 'ASC')
        .limit(limit)
        .getMany();

    return suppliers.map(toPlainSupplier);
}

/**
 * Actualiza el balance de un proveedor
 */
export async function updateSupplierBalance(
    id: string, 
    amount: number, 
    operation: 'add' | 'subtract'
): Promise<SupplierResult> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(Supplier);
        
        const supplier = await repo.findOne({
            where: { id, deletedAt: IsNull() },
            relations: ['person']
        });
        
        if (!supplier) {
            return { success: false, error: 'Proveedor no encontrado' };
        }
        
        if (operation === 'add') {
            supplier.currentBalance += amount;
        } else {
            supplier.currentBalance -= amount;
        }
        
        await repo.save(supplier);

        const savedSupplier = await repo.findOne({
            where: { id },
            relations: ['person']
        });
        
        const plainSupplier = cloneSupplier(savedSupplier)!;
        return { success: true, supplier: plainSupplier };
    } catch (error) {
        console.error('Error updating supplier balance:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al actualizar el balance' 
        };
    }
}
