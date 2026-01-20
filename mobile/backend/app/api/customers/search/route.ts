import { NextResponse } from 'next/server';
import { getDataSource } from '../../../../src/db';
import { Customer } from '@/data/entities/Customer';
import { Person } from '@/data/entities/Person';

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

const buildDisplayName = (person: Person | undefined | null): string => {
  if (!person) {
    return 'Cliente sin nombre';
  }

  if (person.businessName && person.businessName.trim().length > 0) {
    return person.businessName.trim();
  }

  const names = [person.firstName, person.lastName].filter((value) => value && value.trim().length > 0);
  if (names.length > 0) {
    return names.join(' ').trim();
  }

  return person.firstName?.trim() ?? 'Cliente sin nombre';
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const rawQuery = url.searchParams.get('query') ?? url.searchParams.get('q') ?? '';
    const rawPage = Number(url.searchParams.get('page'));
    const rawPageSize = Number(url.searchParams.get('pageSize'));

    const query = rawQuery.trim();
    const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
    const pageSizeCandidate = Number.isFinite(rawPageSize) && rawPageSize > 0 ? Math.floor(rawPageSize) : DEFAULT_PAGE_SIZE;
    const pageSize = Math.min(pageSizeCandidate, MAX_PAGE_SIZE);
    const skip = (page - 1) * pageSize;

    const dataSource = await getDataSource();
    const customerRepo = dataSource.getRepository(Customer);

    const qb = customerRepo
      .createQueryBuilder('customer')
      .leftJoinAndSelect('customer.person', 'person')
      .where('customer.deletedAt IS NULL')
      .andWhere('customer.isActive = :isActive', { isActive: true })
      .andWhere('person.deletedAt IS NULL');

    if (query.length > 0) {
      const likeQuery = `%${query.toLowerCase()}%`;
      const conditions = [
        'LOWER(COALESCE(person.businessName, "")) LIKE :likeQuery',
        'LOWER(CONCAT(COALESCE(person.firstName, ""), " ", COALESCE(person.lastName, ""))) LIKE :likeQuery',
        'LOWER(COALESCE(person.firstName, "")) LIKE :likeQuery',
        'LOWER(COALESCE(person.lastName, "")) LIKE :likeQuery',
        'LOWER(COALESCE(person.documentNumber, "")) LIKE :likeQuery',
        'LOWER(COALESCE(person.email, "")) LIKE :likeQuery',
        'LOWER(COALESCE(person.phone, "")) LIKE :likeQuery',
      ];
      qb.andWhere(`(${conditions.join(' OR ')})`, { likeQuery });
    }

    qb.orderBy('person.businessName', 'ASC')
      .addOrderBy('person.firstName', 'ASC')
      .addOrderBy('person.lastName', 'ASC');

    const [customers, total] = await qb.skip(skip).take(pageSize).getManyAndCount();

    const items = customers.map((customer) => {
      const person = customer.person ?? null;
      const creditLimit = Number(customer.creditLimit) || 0;
      const currentBalance = Number(customer.currentBalance) || 0;
      const availableCredit = Math.max(creditLimit - currentBalance, 0);

      return {
        customerId: customer.id,
        personId: customer.personId,
        displayName: buildDisplayName(person),
        documentType: person?.documentType ?? null,
        documentNumber: person?.documentNumber ?? null,
        email: person?.email ?? null,
        phone: person?.phone ?? null,
        address: person?.address ?? null,
        creditLimit,
        currentBalance,
        availableCredit,
        paymentDayOfMonth: customer.paymentDayOfMonth,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
      };
    });

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return NextResponse.json({
      success: true,
      customers: items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      query,
    });
  } catch (error) {
    console.error('[customers/search] Error searching customers', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor.' },
      { status: 500 },
    );
  }
}
