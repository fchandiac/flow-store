'use server';

import { getDb } from '@/data/db';
import { Transaction, TransactionStatus, TransactionType, PaymentMethod } from '@/data/entities/Transaction';

export interface SupplierPaymentListItem {
    id: string;
    documentNumber: string;
    supplierId?: string | null;
    supplierName?: string | null;
    supplierAlias?: string | null;
    status: TransactionStatus;
    paymentStatus?: string | null;
    paymentDueDate?: string | null;
    paymentTermDays?: number | null;
    paymentMethod?: PaymentMethod | null;
    total: number;
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    createdAt: string;
    updatedAt: string;
    relatedTransactionId?: string | null;
    receptionDocumentNumber?: string | null;
    origin?: string | null;
    externalReference?: string | null;
    notes?: string | null;
}

export interface GetSupplierPaymentsParams {
    search?: string;
    supplierId?: string;
    status?: TransactionStatus;
    paymentStatus?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
    includeCancelled?: boolean;
}

const DEFAULT_LIMIT = 50;

const normalizeMetadata = (metadata: unknown): Record<string, any> => {
    if (!metadata || typeof metadata !== 'object') {
        return {};
    }
    return metadata as Record<string, any>;
};

export async function getSupplierPayments(
    params?: GetSupplierPaymentsParams
): Promise<SupplierPaymentListItem[]> {
    const ds = await getDb();
    const repo = ds.getRepository(Transaction);

    const queryBuilder = repo
        .createQueryBuilder('payment')
        .leftJoinAndSelect('payment.supplier', 'supplier')
        .leftJoinAndSelect('supplier.person', 'supplierPerson')
        .where('payment.transactionType = :type', { type: TransactionType.PAYMENT_OUT });

    if (!params?.includeCancelled) {
        queryBuilder.andWhere('payment.status != :cancelled', { cancelled: TransactionStatus.CANCELLED });
    }

    if (params?.status) {
        queryBuilder.andWhere('payment.status = :status', { status: params.status });
    }

    if (params?.supplierId) {
        queryBuilder.andWhere('payment.supplierId = :supplierId', { supplierId: params.supplierId });
    }

    if (params?.paymentStatus) {
        queryBuilder.andWhere("(payment.metadata ->> 'paymentStatus') = :paymentStatus", {
            paymentStatus: params.paymentStatus,
        });
    }

    if (params?.search) {
        const term = `%${params.search.trim()}%`;
        queryBuilder.andWhere(
            'payment.documentNumber ILIKE :term OR payment.externalReference ILIKE :term',
            { term }
        );
    }

    if (params?.dateFrom) {
        queryBuilder.andWhere('payment.createdAt >= :dateFrom', { dateFrom: params.dateFrom });
    }

    if (params?.dateTo) {
        queryBuilder.andWhere('payment.createdAt <= :dateTo', { dateTo: params.dateTo });
    }

    const limit = Math.min(Math.max(params?.limit ?? DEFAULT_LIMIT, 1), 100);
    const offset = Math.max(params?.offset ?? 0, 0);

    queryBuilder.orderBy('payment.createdAt', 'DESC').skip(offset).take(limit);

    const payments = await queryBuilder.getMany();

    const results: SupplierPaymentListItem[] = payments.map((payment) => {
        const supplier = payment.supplier;
        const supplierPerson = supplier?.person;
        const metadata = normalizeMetadata(payment.metadata);

        const paymentStatus = typeof metadata.paymentStatus === 'string' ? metadata.paymentStatus : null;
        const paymentDueDate = typeof metadata.paymentDueDate === 'string' ? metadata.paymentDueDate : null;
        const paymentTermDays = typeof metadata.paymentTermDays === 'number' ? metadata.paymentTermDays : null;
        const receptionDocumentNumber = typeof metadata.receptionDocumentNumber === 'string'
            ? metadata.receptionDocumentNumber
            : null;
        const origin = typeof metadata.origin === 'string' ? metadata.origin : null;

        return {
            id: payment.id,
            documentNumber: payment.documentNumber,
            supplierId: payment.supplierId ?? null,
            supplierName: supplierPerson?.businessName ?? supplierPerson?.firstName ?? null,
            supplierAlias: supplier?.alias ?? null,
            status: payment.status,
            paymentStatus,
            paymentDueDate,
            paymentTermDays,
            paymentMethod: payment.paymentMethod ?? null,
            total: Number(payment.total ?? 0),
            subtotal: Number(payment.subtotal ?? 0),
            taxAmount: Number(payment.taxAmount ?? 0),
            discountAmount: Number(payment.discountAmount ?? 0),
            createdAt: payment.createdAt.toISOString(),
            updatedAt: payment.createdAt.toISOString(),
            relatedTransactionId: payment.relatedTransactionId ?? null,
            receptionDocumentNumber,
            origin,
            externalReference: payment.externalReference ?? null,
            notes: payment.notes ?? null,
        };
    });

    return JSON.parse(JSON.stringify(results));
}
