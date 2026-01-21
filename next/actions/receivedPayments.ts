'use server'

import { Brackets } from 'typeorm';
import { getDb } from '@/data/db';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
  PaymentMethod,
} from '@/data/entities/Transaction';

export interface ReceivedPaymentFilters {
  dateFrom?: string;
  dateTo?: string;
  paymentMethod?: PaymentMethod;
  pointOfSaleId?: string;
  cashSessionId?: string;
  search?: string;
  includeCancelled?: boolean;
}

export interface ReceivedPaymentListItem {
  id: string;
  documentNumber: string;
  createdAt: string;
  total: number;
  amountPaid: number;
  paymentMethod: PaymentMethod | null;
  branchId: string | null;
  branchName: string | null;
  pointOfSaleId: string | null;
  pointOfSaleName: string | null;
  cashSessionId: string | null;
  cashSessionOpenedAt: string | null;
  cashSessionClosedAt: string | null;
  cashSessionNotes: string | null;
  userId: string;
  userName: string | null;
  userFullName: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
}

export interface ReceivedPaymentsResult {
  rows: ReceivedPaymentListItem[];
  total: number;
  page: number;
  pageSize: number;
}

interface ListReceivedPaymentsParams {
  page?: number;
  pageSize?: number;
  filters?: ReceivedPaymentFilters;
}

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 200;

const normalizeStartOfDay = (value: string): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

const normalizeEndOfDay = (value: string): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCHours(23, 59, 59, 999);
  return date;
};

const normalizeMetadata = (metadata: unknown): Record<string, unknown> | null => {
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }
  return metadata as Record<string, unknown>;
};

export async function listReceivedPayments(
  params?: ListReceivedPaymentsParams,
): Promise<ReceivedPaymentsResult> {
  const ds = await getDb();
  const repo = ds.getRepository(Transaction);

  const page = Math.max(params?.page ?? 1, 1);
  const requestedPageSize = params?.pageSize ?? DEFAULT_PAGE_SIZE;
  const pageSize = Math.min(Math.max(requestedPageSize, 1), MAX_PAGE_SIZE);
  const skip = (page - 1) * pageSize;

  const filters = params?.filters ?? {};

  const queryBuilder = repo
    .createQueryBuilder('payment')
    .leftJoinAndSelect('payment.cashSession', 'cashSession')
    .leftJoinAndSelect('payment.pointOfSale', 'pointOfSale')
    .leftJoinAndSelect('pointOfSale.branch', 'branch')
    .leftJoinAndSelect('payment.user', 'user')
    .leftJoinAndSelect('user.person', 'userPerson')
    .where('payment.transactionType = :transactionType', {
      transactionType: TransactionType.PAYMENT_IN,
    });

  if (!filters.includeCancelled) {
    queryBuilder.andWhere('payment.status != :cancelled', {
      cancelled: TransactionStatus.CANCELLED,
    });
  }

  const dateFrom = filters.dateFrom ? normalizeStartOfDay(filters.dateFrom) : null;
  const dateTo = filters.dateTo ? normalizeEndOfDay(filters.dateTo) : null;

  if (dateFrom) {
    queryBuilder.andWhere('payment.createdAt >= :dateFrom', { dateFrom });
  }

  if (dateTo) {
    queryBuilder.andWhere('payment.createdAt <= :dateTo', { dateTo });
  }

  if (filters.paymentMethod) {
    queryBuilder.andWhere('payment.paymentMethod = :paymentMethod', {
      paymentMethod: filters.paymentMethod,
    });
  }

  if (filters.pointOfSaleId) {
    queryBuilder.andWhere('payment.pointOfSaleId = :pointOfSaleId', {
      pointOfSaleId: filters.pointOfSaleId,
    });
  }

  if (filters.cashSessionId) {
    queryBuilder.andWhere('payment.cashSessionId = :cashSessionId', {
      cashSessionId: filters.cashSessionId,
    });
  }

  if (filters.search && typeof filters.search === 'string' && filters.search.trim().length > 0) {
    const term = `%${filters.search.trim()}%`;
    queryBuilder.andWhere(
      new Brackets((qb) => {
        qb.where('payment.documentNumber LIKE :term', { term })
          .orWhere('COALESCE(payment.notes, \'\') LIKE :term', { term })
          .orWhere("(payment.metadata ->> 'cashSessionRef') LIKE :term", { term });
      }),
    );
  }

  queryBuilder.orderBy('payment.createdAt', 'DESC').skip(skip).take(pageSize);

  const [payments, total] = await queryBuilder.getManyAndCount();

  const rows: ReceivedPaymentListItem[] = payments.map((payment) => {
    const metadata = normalizeMetadata(payment.metadata);
    const cashSession = payment.cashSession ?? null;
    const pointOfSale = payment.pointOfSale ?? null;
    const branch = pointOfSale?.branch ?? null;
    const user = payment.user ?? null;
    const userPerson = (user as any)?.person as
      | { firstName?: string | null; lastName?: string | null }
      | undefined;

    const fullName = userPerson
      ? [userPerson.firstName, userPerson.lastName]
          .filter((part) => Boolean(part && part.trim().length > 0))
          .join(' ')
          .trim() || null
      : null;

    return {
      id: payment.id,
      documentNumber: payment.documentNumber,
      createdAt: payment.createdAt.toISOString(),
      total: Number(payment.total ?? 0),
      amountPaid: Number(payment.amountPaid ?? payment.total ?? 0),
      paymentMethod: payment.paymentMethod ?? null,
      branchId: branch?.id ?? pointOfSale?.branchId ?? null,
      branchName: branch?.name ?? null,
      pointOfSaleId: pointOfSale?.id ?? payment.pointOfSaleId ?? null,
      pointOfSaleName: pointOfSale?.name ?? null,
      cashSessionId: cashSession?.id ?? payment.cashSessionId ?? null,
      cashSessionOpenedAt: cashSession?.openedAt ? cashSession.openedAt.toISOString() : null,
      cashSessionClosedAt: cashSession?.closedAt ? cashSession.closedAt.toISOString() : null,
      cashSessionNotes: cashSession?.notes ?? null,
      userId: payment.userId,
      userName: user?.userName ?? null,
      userFullName: fullName,
      notes: payment.notes ?? null,
      metadata,
    };
  });

  return JSON.parse(
    JSON.stringify({
      rows,
      total,
      page,
      pageSize,
    }),
  );
}
