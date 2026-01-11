'use server'

import { getDb } from '@/data/db';
import { Supplier, SupplierType } from '@/data/entities/Supplier';
import { DocumentType, Person, PersonType } from '@/data/entities/Person';
import { revalidatePath } from 'next/cache';
import { IsNull } from 'typeorm';

// Types
interface GetSuppliersParams {
    search?: string;
    supplierType?: SupplierType;
    isActive?: boolean;
}

interface CreateSupplierDTO {
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
    alias?: string;
    supplierType?: SupplierType;
    defaultPaymentTermDays?: number;
    notes?: string;
}

interface UpdateSupplierDTO {
    // Person fields
    firstName?: string;
    lastName?: string;
    businessName?: string;
    documentType?: DocumentType | null;
    documentNumber?: string;
    email?: string;
    phone?: string;
    address?: string;
    // Supplier fields
    alias?: string;
    supplierType?: SupplierType;
    defaultPaymentTermDays?: number;
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

        let person: Person | null = null;

        if (data.personId) {
            person = await personRepo.findOne({
                where: { id: data.personId, deletedAt: IsNull() },
            });

            if (!person) {
                return { success: false, error: 'Persona no encontrada' };
            }
        }

        if (!person && data.person) {
            const personData = data.person;

            if (!personData.firstName?.trim()) {
                return { success: false, error: 'El nombre del contacto es obligatorio' };
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
                const existingPerson = await personRepo.findOne({
                    where: { documentNumber: personData.documentNumber, deletedAt: IsNull() },
                });
                if (existingPerson) {
                    return { success: false, error: 'Ya existe una persona con ese número de documento' };
                }
            }

            person = personRepo.create({
                type: personData.type,
                firstName: personData.firstName.trim(),
                lastName: personData.lastName?.trim() || undefined,
                businessName: personData.type === PersonType.COMPANY ? personData.businessName?.trim() || undefined : undefined,
                documentType: resolvedDocumentType,
                documentNumber: personData.documentNumber?.trim() || undefined,
                email: personData.email?.trim() || undefined,
                phone: personData.phone?.trim() || undefined,
                address: personData.address?.trim() || undefined,
            });

            await personRepo.save(person);
        }

        if (!person) {
            return { success: false, error: 'Selecciona una persona existente o ingresa los datos para crearla' };
        }

        if (person.type === PersonType.COMPANY && person.documentType !== DocumentType.RUT) {
            person.documentType = DocumentType.RUT;
            await personRepo.save(person);
        }

        if (person.type === PersonType.NATURAL && (!person.documentType || person.documentType === DocumentType.RUT)) {
            person.documentType = DocumentType.RUN;
            await personRepo.save(person);
        }

        const existingSupplier = await supplierRepo.findOne({
            where: { personId: person.id, deletedAt: IsNull() },
        });

        if (existingSupplier) {
            return { success: false, error: 'Esta persona ya está registrada como proveedor' };
        }

        const supplier = supplierRepo.create({
            personId: person.id,
            alias: data.alias?.trim() || undefined,
            supplierType: data.supplierType ?? SupplierType.LOCAL,
            defaultPaymentTermDays: data.defaultPaymentTermDays ?? 30,
            notes: data.notes,
            isActive: true,
        });

        await supplierRepo.save(supplier);

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
        if (data.documentNumber !== undefined && data.documentNumber !== person.documentNumber) {
            const existing = await personRepo.findOne({
                where: { documentNumber: data.documentNumber, deletedAt: IsNull() },
            });
            if (existing && existing.id !== person.id) {
                return { success: false, error: 'Ya existe una persona con ese número de documento' };
            }
            person.documentNumber = data.documentNumber;
        }

        if (data.firstName !== undefined) person.firstName = data.firstName;
        if (data.lastName !== undefined) person.lastName = data.lastName;
        if (data.businessName !== undefined) person.businessName = data.businessName;
        if (data.documentType !== undefined) {
            if (person.type === PersonType.COMPANY) {
                if (data.documentType && data.documentType !== DocumentType.RUT) {
                    return { success: false, error: 'Las empresas deben usar documento tipo RUT' };
                }
                person.documentType = DocumentType.RUT;
            } else {
                if (data.documentType === DocumentType.RUT) {
                    return { success: false, error: 'Las personas naturales no pueden tener documento tipo RUT' };
                }
                person.documentType = data.documentType ?? DocumentType.RUN;
            }
        } else if (person.type === PersonType.COMPANY) {
            person.documentType = DocumentType.RUT;
        } else if (!person.documentType || person.documentType === DocumentType.RUT) {
            person.documentType = DocumentType.RUN;
        }
        if (data.email !== undefined) person.email = data.email;
        if (data.phone !== undefined) person.phone = data.phone;
        if (data.address !== undefined) person.address = data.address;
        
        await personRepo.save(person);
        
        // Actualizar campos del proveedor
        if (data.supplierType !== undefined) supplier.supplierType = data.supplierType;
        if (data.defaultPaymentTermDays !== undefined) supplier.defaultPaymentTermDays = data.defaultPaymentTermDays;
        if (data.isActive !== undefined) supplier.isActive = data.isActive;
        if (data.notes !== undefined) supplier.notes = data.notes;
        if (data.alias !== undefined) supplier.alias = data.alias?.trim() || undefined;
        
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
