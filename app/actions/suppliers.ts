'use server'

import { getDb } from '@/data/db';
import { Supplier, SupplierType } from '@/data/entities/Supplier';
import { Person, PersonType } from '@/data/entities/Person';
import { Transaction } from '@/data/entities/Transaction';
import { revalidatePath } from 'next/cache';
import { IsNull } from 'typeorm';

// Types
interface GetSuppliersParams {
    search?: string;
    supplierType?: SupplierType;
    isActive?: boolean;
    page?: number;
    limit?: number;
}

interface SuppliersResponse {
    data: (Supplier & { person: Person })[];
    total: number;
}

interface CreateSupplierDTO {
    personId?: string;
    person?: {
        type: PersonType;
        firstName: string;
        lastName?: string;
        businessName?: string;
        documentType?: string;
        documentNumber?: string;
        email?: string;
        phone?: string;
        address?: string;
    };
    code?: string;
    supplierType?: SupplierType;
    taxId?: string;
    bankName?: string;
    bankAccountNumber?: string;
    bankAccountType?: string;
    paymentTermDays?: number;
    notes?: string;
}

interface UpdateSupplierDTO {
    code?: string;
    supplierType?: SupplierType;
    taxId?: string;
    bankName?: string;
    bankAccountNumber?: string;
    bankAccountType?: string;
    paymentTermDays?: number;
    notes?: string;
    isActive?: boolean;
}

interface SupplierResult {
    success: boolean;
    supplier?: Supplier;
    error?: string;
}

/**
 * Obtiene proveedores con filtros
 */
export async function getSuppliers(params?: GetSuppliersParams): Promise<SuppliersResponse> {
    const ds = await getDb();
    const repo = ds.getRepository(Supplier);
    
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const skip = (page - 1) * limit;
    
    const queryBuilder = repo.createQueryBuilder('supplier')
        .leftJoinAndSelect('supplier.person', 'person')
        .where('supplier.deletedAt IS NULL')
        .andWhere('person.deletedAt IS NULL');
    
    if (params?.search) {
        queryBuilder.andWhere(
            '(person.firstName LIKE :search OR person.lastName LIKE :search OR person.businessName LIKE :search OR person.documentNumber LIKE :search OR supplier.code LIKE :search OR supplier.taxId LIKE :search)',
            { search: `%${params.search}%` }
        );
    }
    
    if (params?.supplierType) {
        queryBuilder.andWhere('supplier.supplierType = :supplierType', { supplierType: params.supplierType });
    }
    
    if (params?.isActive !== undefined) {
        queryBuilder.andWhere('supplier.isActive = :isActive', { isActive: params.isActive });
    }
    
    queryBuilder
        .orderBy('person.firstName', 'ASC')
        .addOrderBy('person.lastName', 'ASC')
        .skip(skip)
        .take(limit);
    
    const [data, total] = await queryBuilder.getManyAndCount();
    
    return { data: data as (Supplier & { person: Person })[], total };
}

/**
 * Obtiene un proveedor por ID con detalles
 */
export async function getSupplierById(id: string): Promise<(Supplier & { 
    person: Person; 
    recentPurchases: Transaction[];
}) | null> {
    const ds = await getDb();
    const supplierRepo = ds.getRepository(Supplier);
    const transactionRepo = ds.getRepository(Transaction);
    
    const supplier = await supplierRepo.findOne({
        where: { id, deletedAt: IsNull() },
        relations: ['person']
    });
    
    if (!supplier) return null;
    
    const recentPurchases = await transactionRepo.find({
        where: { supplierId: id },
        order: { createdAt: 'DESC' },
        take: 10
    });
    
    return { ...supplier, recentPurchases } as any;
}

/**
 * Busca proveedor por código
 */
export async function getSupplierByCode(code: string): Promise<Supplier | null> {
    const ds = await getDb();
    const repo = ds.getRepository(Supplier);
    
    return repo.findOne({
        where: { code, deletedAt: IsNull() },
        relations: ['person']
    });
}

/**
 * Busca proveedor por RUT/Tax ID
 */
export async function getSupplierByTaxId(taxId: string): Promise<Supplier | null> {
    const ds = await getDb();
    const repo = ds.getRepository(Supplier);
    
    return repo.findOne({
        where: { taxId, deletedAt: IsNull() },
        relations: ['person']
    });
}

/**
 * Crea un nuevo proveedor
 */
export async function createSupplier(data: CreateSupplierDTO): Promise<SupplierResult> {
    try {
        const ds = await getDb();
        const supplierRepo = ds.getRepository(Supplier);
        const personRepo = ds.getRepository(Person);
        
        let personId = data.personId;
        
        // Si se proporciona persona nueva, crearla
        if (data.person && !personId) {
            // Validar persona
            if (data.person.type === PersonType.NATURAL && !data.person.lastName) {
                return { success: false, error: 'El apellido es requerido para personas naturales' };
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
            
            const person = personRepo.create(data.person);
            await personRepo.save(person);
            personId = person.id;
        }
        
        if (!personId) {
            return { success: false, error: 'Se requiere personId o datos de persona' };
        }
        
        // Verificar código único si se proporciona
        if (data.code) {
            const existingSupplier = await supplierRepo.findOne({
                where: { code: data.code, deletedAt: IsNull() }
            });
            if (existingSupplier) {
                return { success: false, error: 'El código de proveedor ya está en uso' };
            }
        }
        
        // Verificar RUT único si se proporciona
        if (data.taxId) {
            const existingSupplierTax = await supplierRepo.findOne({
                where: { taxId: data.taxId, deletedAt: IsNull() }
            });
            if (existingSupplierTax) {
                return { success: false, error: 'El RUT ya está registrado' };
            }
        }
        
        // Verificar que la persona no sea ya proveedor
        const existingSupplierForPerson = await supplierRepo.findOne({
            where: { personId, deletedAt: IsNull() }
        });
        if (existingSupplierForPerson) {
            return { success: false, error: 'Esta persona ya es proveedor' };
        }
        
        const supplier = supplierRepo.create({
            personId,
            code: data.code,
            supplierType: data.supplierType ?? SupplierType.LOCAL,
            taxId: data.taxId,
            bankName: data.bankName,
            bankAccountNumber: data.bankAccountNumber,
            bankAccountType: data.bankAccountType,
            paymentTermDays: data.paymentTermDays ?? 30,
            notes: data.notes,
            currentBalance: 0,
            isActive: true
        });
        
        await supplierRepo.save(supplier);
        
        // Recargar con relaciones
        const savedSupplier = await supplierRepo.findOne({
            where: { id: supplier.id },
            relations: ['person']
        });
        
        revalidatePath('/admin/suppliers');
        
        return { success: true, supplier: savedSupplier! };
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
        const repo = ds.getRepository(Supplier);
        
        const supplier = await repo.findOne({ 
            where: { id, deletedAt: IsNull() },
            relations: ['person']
        });
        
        if (!supplier) {
            return { success: false, error: 'Proveedor no encontrado' };
        }
        
        // Verificar código único si se cambia
        if (data.code && data.code !== supplier.code) {
            const existing = await repo.findOne({ 
                where: { code: data.code, deletedAt: IsNull() } 
            });
            if (existing) {
                return { success: false, error: 'El código ya está en uso' };
            }
        }
        
        // Verificar RUT único si se cambia
        if (data.taxId && data.taxId !== supplier.taxId) {
            const existing = await repo.findOne({ 
                where: { taxId: data.taxId, deletedAt: IsNull() } 
            });
            if (existing) {
                return { success: false, error: 'El RUT ya está en uso' };
            }
        }
        
        if (data.code !== undefined) supplier.code = data.code;
        if (data.supplierType !== undefined) supplier.supplierType = data.supplierType;
        if (data.taxId !== undefined) supplier.taxId = data.taxId;
        if (data.bankName !== undefined) supplier.bankName = data.bankName;
        if (data.bankAccountNumber !== undefined) supplier.bankAccountNumber = data.bankAccountNumber;
        if (data.bankAccountType !== undefined) supplier.bankAccountType = data.bankAccountType;
        if (data.paymentTermDays !== undefined) supplier.paymentTermDays = data.paymentTermDays;
        if (data.notes !== undefined) supplier.notes = data.notes;
        if (data.isActive !== undefined) supplier.isActive = data.isActive;
        
        await repo.save(supplier);
        revalidatePath('/admin/suppliers');
        
        return { success: true, supplier };
    } catch (error) {
        console.error('Error updating supplier:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al actualizar el proveedor' 
        };
    }
}

/**
 * Elimina (soft delete) un proveedor
 */
export async function deleteSupplier(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(Supplier);
        const transactionRepo = ds.getRepository(Transaction);
        
        const supplier = await repo.findOne({ 
            where: { id, deletedAt: IsNull() } 
        });
        
        if (!supplier) {
            return { success: false, error: 'Proveedor no encontrado' };
        }
        
        // Verificar que no tenga transacciones
        const transactionCount = await transactionRepo.count({
            where: { supplierId: id }
        });
        
        if (transactionCount > 0) {
            return { success: false, error: 'No se puede eliminar: tiene transacciones asociadas' };
        }
        
        await repo.softDelete(id);
        revalidatePath('/admin/suppliers');
        
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
 * Actualiza el saldo del proveedor
 */
export async function updateSupplierBalance(
    supplierId: string, 
    amount: number,
    operation: 'add' | 'subtract'
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(Supplier);
        
        const supplier = await repo.findOne({ where: { id: supplierId } });
        if (!supplier) {
            return { success: false, error: 'Proveedor no encontrado' };
        }
        
        const currentBalance = Number(supplier.currentBalance) || 0;
        const newBalance = operation === 'add' 
            ? currentBalance + amount 
            : currentBalance - amount;
        
        supplier.currentBalance = newBalance;
        await repo.save(supplier);
        
        return { success: true, newBalance };
    } catch (error) {
        console.error('Error updating supplier balance:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al actualizar saldo' 
        };
    }
}
