import { NextResponse } from 'next/server';
import { getDataSource } from '../../../src/db';
import { Customer } from '@/data/entities/Customer';
import { DocumentType, Person, PersonType } from '@/data/entities/Person';

const sanitizeString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const parseDocumentType = (value: unknown): DocumentType | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const upper = value.trim().toUpperCase();
  if (!upper) {
    return null;
  }

  const entries = Object.values(DocumentType);
  return entries.includes(upper as DocumentType) ? (upper as DocumentType) : null;
};

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, message: 'Solicitud inválida.' },
        { status: 400 },
      );
    }

    const firstName = sanitizeString((body as Record<string, unknown>).firstName) ?? undefined;
    const lastName = sanitizeString((body as Record<string, unknown>).lastName);
    const documentNumber = sanitizeString((body as Record<string, unknown>).documentNumber);
    const email = sanitizeString((body as Record<string, unknown>).email);
    const phone = sanitizeString((body as Record<string, unknown>).phone);
    const address = sanitizeString((body as Record<string, unknown>).address);
    const documentType = parseDocumentType((body as Record<string, unknown>).documentType);

    if (!firstName) {
      return NextResponse.json(
        { success: false, message: 'El nombre es obligatorio.' },
        { status: 400 },
      );
    }

    const dataSource = await getDataSource();
    const personRepo = dataSource.getRepository(Person);
    const customerRepo = dataSource.getRepository(Customer);

    let person: Person | null = null;
    if (documentNumber) {
      person = await personRepo.findOne({
        where: { documentNumber },
        withDeleted: true,
      });

      if (person) {
        const existingCustomer = await customerRepo.findOne({
          where: { personId: person.id },
          withDeleted: true,
        });

        if (existingCustomer && !existingCustomer.deletedAt) {
          return NextResponse.json(
            { success: false, message: 'Ya existe un cliente con ese documento.' },
            { status: 409 },
          );
        }

        if (existingCustomer && existingCustomer.deletedAt) {
          existingCustomer.deletedAt = null;
          existingCustomer.isActive = true;
          await customerRepo.save(existingCustomer);
          person.deletedAt = null;
          person.firstName = firstName;
          person.lastName = lastName ?? undefined;
          person.documentType = documentType;
          person.email = email ?? undefined;
          person.phone = phone ?? undefined;
          person.address = address ?? undefined;
          await personRepo.save(person);

          const creditLimit = Number(existingCustomer.creditLimit ?? 0) || 0;
          const currentBalance = Number(existingCustomer.currentBalance ?? 0) || 0;
          const availableCredit = Math.max(creditLimit - currentBalance, 0);
          const displayName = person.businessName?.trim()
            || `${person.firstName}${person.lastName ? ` ${person.lastName}` : ''}`.trim()
            || 'Cliente sin nombre';

          return NextResponse.json({
            success: true,
            customer: {
              customerId: existingCustomer.id,
              personId: existingCustomer.personId,
              displayName,
              documentType: person.documentType ?? documentType ?? null,
              documentNumber: person.documentNumber ?? null,
              email: person.email ?? null,
              phone: person.phone ?? null,
              address: person.address ?? null,
              creditLimit,
              currentBalance,
              availableCredit,
              defaultPaymentTermDays: existingCustomer.defaultPaymentTermDays ?? 0,
              createdAt: existingCustomer.createdAt,
              updatedAt: existingCustomer.updatedAt,
            },
          });
        }
      }
    }

    if (!person) {
      person = personRepo.create({
        type: PersonType.NATURAL,
        firstName,
        lastName: lastName ?? undefined,
        documentType: documentType ?? null,
        documentNumber: documentNumber ?? undefined,
        email: email ?? undefined,
        phone: phone ?? undefined,
        address: address ?? undefined,
      });
      await personRepo.save(person);
    } else {
      person.deletedAt = null;
      person.firstName = firstName;
      person.lastName = lastName ?? undefined;
      person.documentType = documentType ?? null;
      person.documentNumber = documentNumber ?? undefined;
      person.email = email ?? undefined;
      person.phone = phone ?? undefined;
      person.address = address ?? undefined;
      await personRepo.save(person);
    }

    const customer = customerRepo.create({
      personId: person.id,
      creditLimit: 0,
      currentBalance: 0,
      defaultPaymentTermDays: 0,
      isActive: true,
    });
    await customerRepo.save(customer);

    const displayName = person.businessName?.trim()
      || `${person.firstName}${person.lastName ? ` ${person.lastName}` : ''}`.trim()
      || 'Cliente sin nombre';

    return NextResponse.json({
      success: true,
      customer: {
        customerId: customer.id,
        personId: customer.personId,
        displayName,
        documentType: person.documentType ?? null,
        documentNumber: person.documentNumber ?? null,
        email: person.email ?? null,
        phone: person.phone ?? null,
        address: person.address ?? null,
        creditLimit: 0,
        currentBalance: 0,
        availableCredit: 0,
        defaultPaymentTermDays: 0,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
      },
    });
  } catch (error) {
    console.error('[customers] Error creating customer', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor.' },
      { status: 500 },
    );
  }
}
