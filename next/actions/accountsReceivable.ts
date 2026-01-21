'use server'

import { Brackets } from 'typeorm';
import { getDb } from '@/data/db';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
  PaymentMethod,
} from '@/data/entities/Transaction';

export interface AccountsReceivableFilters {
  dateFrom?: string;
  dateTo?: string;
  customerId?: string;
  search?: string;
  includePaid?: boolean;
}

export interface AccountsReceivableQuota {
  id: string;
  transactionId: string;
  documentNumber: string;
  createdAt: string;
  customerId: string | null;
  customerName: string | null;
  totalTransactionAmount: number;
  quotaAmount: number;
  dueDate: string;
  quotaNumber: number;
  totalQuotas: number;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
}

export interface AccountsReceivableResult {
  rows: AccountsReceivableQuota[];
  total: number;
  page: number;
  pageSize: number;
}

interface ListAccountReceivableParams {
  page?: number;
  pageSize?: number;
  filters?: AccountsReceivableFilters;
}

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 200;

export async function listAccountsReceivable(
  params?: ListAccountReceivableParams,
): Promise<AccountsReceivableResult> {
  const ds = await getDb();
  const repo = ds.getRepository(Transaction);

  const page = Math.max(params?.page ?? 1, 1);
  const requestedPageSize = params?.pageSize ?? DEFAULT_PAGE_SIZE;
  const pageSize = Math.min(Math.max(requestedPageSize, 1), MAX_PAGE_SIZE);
  const skip = (page - 1) * pageSize;

  const filters = params?.filters ?? {};

  // Buscamos transacciones de tipo PAYMENT_IN que fueron con CRÉDITO INTERNO
  const queryBuilder = repo
    .createQueryBuilder('tx')
    .leftJoinAndSelect('tx.customer', 'customer')
    .leftJoinAndSelect('customer.person', 'person')
    .where('tx.transactionType = :paymentType', { paymentType: TransactionType.PAYMENT_IN })
    .andWhere('tx.paymentMethod = :method', { method: PaymentMethod.INTERNAL_CREDIT })
    .andWhere('tx.status != :cancelled', { cancelled: TransactionStatus.CANCELLED });

  if (filters.customerId) {
    queryBuilder.andWhere('tx.customerId = :customerId', { customerId: filters.customerId });
  }

  if (filters.search) {
    const term = `%${String(filters.search).trim()}%`;
    queryBuilder.andWhere(
      new Brackets((qb) => {
        qb.where('tx.documentNumber LIKE :term', { term })
          .orWhere('person.firstName LIKE :term', { term })
          .orWhere('person.lastName LIKE :term', { term })
          .orWhere('person.businessName LIKE :term', { term });
      }),
    );
  }

  // Ordenamos por fecha de creación decreciente para obtener las ventas más recientes
  queryBuilder.orderBy('tx.createdAt', 'DESC');

  // Nota: Dado que una transacción puede tener múltiples cuotas (subPayments),
  // la paginación "real" por cuota es compleja en SQL puro si están dentro de un JSON.
  // Por ahora paginamos las transacciones y luego aplanamos.
  queryBuilder.skip(skip).take(pageSize);

  const [transactions, total] = await queryBuilder.getManyAndCount();

  const allQuotas: AccountsReceivableQuota[] = [];
  const now = new Date();

  transactions.forEach((tx) => {
    const subPayments = (tx.metadata?.subPayments as any[]) || [];
    const customer = tx.customer;
    const person = customer?.person;
    
    let customerName = 'Consumidor Final';
    if (person) {
        if (person.businessName) {
            customerName = person.businessName;
        } else {
            customerName = `${person.firstName ?? ''} ${person.lastName ?? ''}`.trim() || 'Sin Nombre';
        }
    }

    if (subPayments.length === 0) {
      // Si no tiene sub-pagos explícitos, tratamos el total como una sola cuota venciendo el día de la venta
      const dueDate = new Date(tx.createdAt);
      allQuotas.push({
        id: `${tx.id}-1`,
        transactionId: tx.id,
        documentNumber: tx.documentNumber,
        createdAt: tx.createdAt.toISOString(),
        customerId: tx.customerId ?? null,
        customerName,
        totalTransactionAmount: Number(tx.total),
        quotaAmount: Number(tx.total),
        dueDate: dueDate.toISOString().split('T')[0],
        quotaNumber: 1,
        totalQuotas: 1,
        status: dueDate < now ? 'OVERDUE' : 'PENDING',
      });
    } else {
      subPayments.forEach((sp, index) => {
        const dueDate = new Date(sp.dueDate);
        allQuotas.push({
          id: `${tx.id}-${index + 1}`,
          transactionId: tx.id,
          documentNumber: tx.documentNumber,
          createdAt: tx.createdAt.toISOString(),
          customerId: tx.customerId ?? null,
          customerName,
          totalTransactionAmount: Number(tx.total),
          quotaAmount: Number(sp.amount),
          dueDate: sp.dueDate,
          quotaNumber: index + 1,
          totalQuotas: subPayments.length,
          status: dueDate < now ? 'OVERDUE' : 'PENDING',
        });
      });
    }
  });

  return JSON.parse(
    JSON.stringify({
      rows: allQuotas,
      total, // Este total es de transacciones, no de cuotas individuales
      page,
      pageSize,
    }),
  );
}
