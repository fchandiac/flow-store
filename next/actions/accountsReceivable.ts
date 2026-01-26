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

  // Buscamos transacciones que generen cuentas por cobrar:
  // 1. PAYMENT_IN con CRÉDITO INTERNO (Legacy o pagos manuales)
  // 2. SALE que tengan cuotas de crédito interno en su metadata (Nuevo flujo MIXED o Crédito parcial)
  const queryBuilder = repo
    .createQueryBuilder('tx')
    .leftJoinAndSelect('tx.customer', 'customer')
    .leftJoinAndSelect('customer.person', 'person')
    .where(new Brackets(qb => {
      qb.where('tx.transactionType = :paymentType AND tx.paymentMethod = :method', { 
        paymentType: TransactionType.PAYMENT_IN, 
        method: PaymentMethod.INTERNAL_CREDIT 
      })
      .orWhere('tx.transactionType = :saleType AND (tx.paymentMethod = :method OR tx.paymentMethod = :mixedMethod)', {
        saleType: TransactionType.SALE,
        method: PaymentMethod.INTERNAL_CREDIT,
        mixedMethod: PaymentMethod.MIXED
      });
    }))
    .andWhere('tx.status != :cancelled', { cancelled: TransactionStatus.CANCELLED });

  if (filters.customerId) {
    queryBuilder.andWhere('tx.customerId = :customerId', { customerId: filters.customerId });
  }

  if (filters.search) {
    const term = `%${String(filters.search).trim()}%`;
    const numericTerm = filters.search.replace(/[^0-9]/g, '');
    
    queryBuilder.andWhere(
      new Brackets((qb) => {
        qb.where('tx.documentNumber LIKE :term', { term })
          .orWhere('person.firstName LIKE :term', { term })
          .orWhere('person.lastName LIKE :term', { term })
          .orWhere('person.businessName LIKE :term', { term });
        
        if (numericTerm) {
          qb.orWhere('tx.total LIKE :numTerm', { numTerm: `%${numericTerm}%` });
        }
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

  // Para marcar como pagadas, buscamos transacciones de pago que referencien estas transacciones
  const txIds = transactions.map(t => t.id);
  const paidQuotaIds = new Set<string>();

  if (txIds.length > 0) {
    const paymentRepo = ds.getRepository(Transaction);
    // Buscamos pagos que referencien a estas transacciones originales
    const quotaPayments = await paymentRepo
      .createQueryBuilder('ptx')
      .where('ptx.transactionType = :paymentIn', { paymentIn: TransactionType.PAYMENT_IN })
      .andWhere('ptx.relatedTransactionId IN (:...txIds)', { txIds })
      .andWhere('ptx.status != :cancelled', { cancelled: TransactionStatus.CANCELLED })
      .getMany();
    
    quotaPayments.forEach(p => {
        const metadata = p.metadata as any;
        if (metadata?.paidQuotaId) {
            paidQuotaIds.add(metadata.paidQuotaId);
        }
    });
  }

  const allQuotas: AccountsReceivableQuota[] = [];
  const now = new Date();

  transactions.forEach((tx) => {
    // Intentar obtener sub-pagos de metadata (posibles campos: subPayments o internalCreditQuotas)
    const subPayments = (tx.metadata?.subPayments as any[]) || (tx.metadata?.internalCreditQuotas as any[]) || [];
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
      // Si no tiene sub-pagos explícitos, tratamos el total como una sola cuota
      const dueDate = new Date(tx.createdAt);
      const quotaId = `${tx.id}-1`;
      const isPaid = paidQuotaIds.has(quotaId);

      allQuotas.push({
        id: quotaId,
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
        status: isPaid ? 'PAID' : (dueDate < now ? 'OVERDUE' : 'PENDING'),
      });
    } else {
      subPayments.forEach((sp, index) => {
        const dueDate = new Date(sp.dueDate);
        const quotaId = sp.id || `${tx.id}-${index + 1}`;
        const isPaid = paidQuotaIds.has(quotaId);

        allQuotas.push({
          id: quotaId,
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
          status: isPaid ? 'PAID' : (dueDate < now ? 'OVERDUE' : 'PENDING'),
        });
      });
    }
  });

  // Filtramos si el usuario no quiere ver las pagadas (opcional, según filtros del front)
  let filteredQuotas = allQuotas;
  if (!filters.includePaid) {
    filteredQuotas = allQuotas.filter(q => q.status !== 'PAID');
  }

  return JSON.parse(
    JSON.stringify({
      rows: filteredQuotas,
      total, // Este total es de transacciones, no de cuotas individuales
      page,
      pageSize,
    }),
  );
}
