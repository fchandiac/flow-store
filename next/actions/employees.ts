'use server';

import { revalidatePath } from 'next/cache';
import { IsNull } from 'typeorm';
import { getDb } from '@/data/db';
import { Employee, EmploymentType, EmployeeStatus } from '@/data/entities/Employee';
import { Person } from '@/data/entities/Person';
import { CostCenter } from '@/data/entities/CostCenter';
import { OrganizationalUnit } from '@/data/entities/OrganizationalUnit';
import { getCompany } from './companies';

export interface EmployeePersonSummary {
	id: string;
	firstName: string;
	lastName: string | null;
	businessName: string | null;
	documentType: string | null;
	documentNumber: string | null;
	email: string | null;
	phone: string | null;
}

export interface EmployeeListItem {
	id: string;
	person: EmployeePersonSummary;
	branch: { id: string; name: string | null } | null;
	costCenter: { id: string; name: string; code: string } | null;
	organizationalUnit: { id: string; name: string; code: string; unitType: string } | null;
	employmentType: EmploymentType;
	status: EmployeeStatus;
	hireDate: string;
	terminationDate: string | null;
	baseSalary: number | null;
	createdAt: string;
	updatedAt: string;
}

export interface ListEmployeesParams {
	includeTerminated?: boolean;
	search?: string;
	limit?: number;
}

export interface CreateEmployeeInput {
	personId: string;
	costCenterId?: string | null;
	organizationalUnitId?: string | null;
	employmentType: EmploymentType;
	status: EmployeeStatus;
	hireDate: string;
	terminationDate?: string | null;
	baseSalary?: number | null;
}

export interface EmployeeMutationResult {
	success: boolean;
	error?: string;
	employee?: EmployeeListItem;
}

const EMPLOYEES_PATH = '/admin/human-resources';

const buildPersonSummary = (person: Person): EmployeePersonSummary => ({
	id: person.id,
	firstName: person.firstName,
	lastName: person.lastName ?? null,
	businessName: person.businessName ?? null,
	documentType: person.documentType ?? null,
	documentNumber: person.documentNumber ?? null,
	email: person.email ?? null,
	phone: person.phone ?? null,
});

const buildEmployeeListItem = (employee: Employee): EmployeeListItem => ({
	id: employee.id,
	person: buildPersonSummary(employee.person),
	branch: employee.branch
		? { id: employee.branch.id, name: employee.branch.name ?? null }
		: null,
	costCenter: employee.costCenter
		? { id: employee.costCenter.id, name: employee.costCenter.name, code: employee.costCenter.code }
		: null,
	organizationalUnit: employee.organizationalUnit
		? {
			id: employee.organizationalUnit.id,
			name: employee.organizationalUnit.name,
			code: employee.organizationalUnit.code,
			unitType: employee.organizationalUnit.unitType,
		}
		: null,
	employmentType: employee.employmentType,
	status: employee.status,
	hireDate: employee.hireDate,
	terminationDate: employee.terminationDate ?? null,
	baseSalary: employee.baseSalary != null ? Number(employee.baseSalary) : null,
	createdAt: employee.createdAt?.toISOString?.() ?? new Date().toISOString(),
	updatedAt: employee.updatedAt?.toISOString?.() ?? new Date().toISOString(),
});

const normalizeOptionalString = (value?: string | null): string | null => {
	if (value == null) {
		return null;
	}
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
};

const normalizeOptionalId = (value?: string | null): string | null => {
	if (!value) {
		return null;
	}
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
};

export async function listEmployees(params?: ListEmployeesParams): Promise<EmployeeListItem[]> {
	const company = await getCompany();
	if (!company) {
		throw new Error('No hay compañía configurada.');
	}

	const ds = await getDb();
	const repo = ds.getRepository(Employee);

	const query = repo
		.createQueryBuilder('employee')
		.leftJoinAndSelect('employee.person', 'person')
		.leftJoinAndSelect('employee.branch', 'branch')
		.leftJoinAndSelect('employee.costCenter', 'costCenter')
		.leftJoinAndSelect('employee.organizationalUnit', 'organizationalUnit')
		.where('employee.companyId = :companyId', { companyId: company.id })
		.andWhere('employee.deletedAt IS NULL');

	if (!params?.includeTerminated) {
		query.andWhere('employee.status != :terminated', { terminated: EmployeeStatus.TERMINATED });
	}

	if (params?.search?.trim()) {
		const searchTerm = `%${params.search.trim().toLowerCase().replace(/\s+/g, '%')}%`;
		query.andWhere(
			`(LOWER(person.firstName) LIKE :term OR LOWER(person.lastName) LIKE :term OR LOWER(person.businessName) LIKE :term OR LOWER(person.documentNumber) LIKE :term)`,
			{ term: searchTerm },
		);
	}

	const limit = params?.limit ? Math.min(Math.max(params.limit, 1), 300) : 200;
	query.orderBy('person.firstName', 'ASC').addOrderBy('person.lastName', 'ASC').take(limit);

	const employees = await query.getMany();

	return employees.map((employee) => buildEmployeeListItem(employee));
}

export async function createEmployee(input: CreateEmployeeInput): Promise<EmployeeMutationResult> {
	try {
		const company = await getCompany();
		if (!company) {
			return { success: false, error: 'No hay compañía configurada.' };
		}

		const ds = await getDb();
		const employeeRepo = ds.getRepository(Employee);
		const personRepo = ds.getRepository(Person);
		const costCenterRepo = ds.getRepository(CostCenter);
		const organizationalUnitRepo = ds.getRepository(OrganizationalUnit);

		const person = await personRepo.findOne({ where: { id: input.personId, deletedAt: IsNull() } });
		if (!person) {
			return { success: false, error: 'La persona seleccionada no existe o fue eliminada.' };
		}

		const existingEmployee = await employeeRepo.findOne({
			where: {
				companyId: company.id,
				personId: input.personId,
				deletedAt: IsNull(),
			},
		});

		if (existingEmployee) {
			return { success: false, error: 'Esta persona ya está registrada como empleado.' };
		}

		let costCenterId: string | null = null;
		if (input.costCenterId) {
			const costCenter = await costCenterRepo.findOne({ where: { id: input.costCenterId } });
			if (!costCenter) {
				return { success: false, error: 'El centro de costos seleccionado no existe.' };
			}
			if (costCenter.companyId !== company.id) {
				return { success: false, error: 'El centro de costos seleccionado pertenece a otra compañía.' };
			}
			costCenterId = costCenter.id;
		}

		let organizationalUnitId: string | null = null;
		let derivedBranchId: string | null = null;
		if (input.organizationalUnitId) {
			const organizationalUnit = await organizationalUnitRepo.findOne({
				where: { id: input.organizationalUnitId },
				relations: ['branch'],
			});
			if (!organizationalUnit) {
				return { success: false, error: 'La unidad organizativa seleccionada no existe.' };
			}
			if (organizationalUnit.companyId !== company.id) {
				return { success: false, error: 'La unidad organizativa seleccionada pertenece a otra compañía.' };
			}
			organizationalUnitId = organizationalUnit.id;
			derivedBranchId = organizationalUnit.branchId ?? null;
		}

		const normalizedHireDate = input.hireDate?.trim();
		if (!normalizedHireDate) {
			return { success: false, error: 'La fecha de ingreso es obligatoria.' };
		}

		const normalizedTerminationDate = normalizeOptionalString(input.terminationDate);
		if (input.status === EmployeeStatus.TERMINATED && !normalizedTerminationDate) {
			return { success: false, error: 'Los empleados terminados deben tener fecha de término.' };
		}

		if (normalizedTerminationDate) {
			const hireTime = new Date(normalizedHireDate).getTime();
			const terminationTime = new Date(normalizedTerminationDate).getTime();
			if (Number.isNaN(hireTime) || Number.isNaN(terminationTime)) {
				return { success: false, error: 'Las fechas de ingreso y término deben ser válidas.' };
			}
			if (terminationTime < hireTime) {
				return { success: false, error: 'La fecha de término no puede ser anterior a la fecha de ingreso.' };
			}
		}

		let baseSalaryValue: string | null = null;
		if (input.baseSalary != null) {
			const numericSalary = Number(input.baseSalary);
			if (!Number.isFinite(numericSalary) || numericSalary < 0) {
				return { success: false, error: 'El salario base debe ser un número positivo.' };
			}
			baseSalaryValue = Math.round(numericSalary).toString();
		}

		const employee = new Employee();
		employee.companyId = company.id;
		employee.personId = person.id;
		employee.branchId = normalizeOptionalId(derivedBranchId) ?? undefined;
		employee.costCenterId = normalizeOptionalId(costCenterId) ?? undefined;
		employee.organizationalUnitId = normalizeOptionalId(organizationalUnitId) ?? undefined;
		employee.employmentType = input.employmentType;
		employee.status = input.status;
		employee.hireDate = normalizedHireDate;
		employee.terminationDate = normalizedTerminationDate ?? undefined;
		employee.baseSalary = baseSalaryValue ?? undefined;

		await employeeRepo.save(employee);

		const saved = await employeeRepo.findOne({
			where: { id: employee.id },
			relations: ['person', 'branch', 'costCenter', 'organizationalUnit'],
		});

		revalidatePath(EMPLOYEES_PATH);

		if (!saved) {
			return { success: true };
		}

		return { success: true, employee: buildEmployeeListItem(saved) };
	} catch (error) {
		console.error('[createEmployee] Error:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Error al crear el empleado.',
		};
	}
}