'use server';

import { revalidatePath } from 'next/cache';
import { getDb } from '@/data/db';
import { Transaction, TransactionStatus, TransactionType, PaymentMethod } from '@/data/entities/Transaction';
import { AccountTypeName, BankName, PersonBankAccount } from '@/data/entities/Person';
import { getCurrentSession } from './auth.server';
import { getCompany } from './companies';

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

export interface SupplierPaymentContext {
    payment: {
        id: string;
        documentNumber: string;
        total: number;
        amountPaid: number;
        pendingAmount: number;
        supplierId?: string | null;
        supplierName?: string | null;
        paymentStatus?: string | null;
        paymentMethod?: PaymentMethod | null;
        status: TransactionStatus;
        notes?: string | null;
    };
    supplierAccounts: PersonBankAccount[];
    companyAccounts: PersonBankAccount[];
}

export interface CompleteSupplierPaymentInput {
    paymentId: string;
    paymentMethod: PaymentMethod;
    companyAccountKey?: string;
    supplierAccount?: {
        bankName: BankName;
        accountType: AccountTypeName;
        accountNumber: string;
        accountHolderName?: string;
    };
    companyAccount?: {
        bankName: BankName;
        accountType: AccountTypeName;
        accountNumber: string;
        accountHolderName?: string;
    };
    note?: string;
}

export interface SupplierPaymentActionResult {
    success: boolean;
    error?: string;
    documentNumber?: string;
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

const serializeAccounts = (accounts: PersonBankAccount[] | null | undefined): PersonBankAccount[] => {
    if (!Array.isArray(accounts)) {
        return [];
    }
    return accounts.map((account) => ({
        accountKey: account.accountKey,
        bankName: account.bankName,
        accountType: account.accountType,
        accountNumber: account.accountNumber,
        accountHolderName: account.accountHolderName,
        isPrimary: account.isPrimary,
        notes: account.notes,
    }));
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

export async function getSupplierPaymentContext(paymentId: string): Promise<{ success: true; data: SupplierPaymentContext } | { success: false; error: string }> {
    const ds = await getDb();
    const repo = ds.getRepository(Transaction);

    const payment = await repo.findOne({
        where: { id: paymentId },
        relations: ['supplier', 'supplier.person'],
    });

    if (!payment) {
        return { success: false, error: 'Pago no encontrado' };
    }

    if (payment.transactionType !== TransactionType.PAYMENT_OUT) {
        return { success: false, error: 'La transacción seleccionada no es un pago a proveedor' };
    }

    if (payment.status === TransactionStatus.CANCELLED) {
        return { success: false, error: 'El pago está anulado y no se puede modificar' };
    }

    const metadata = normalizeMetadata(payment.metadata);
    const paymentStatus = typeof metadata.paymentStatus === 'string' ? metadata.paymentStatus : null;

    const supplierAccounts = serializeAccounts(payment.supplier?.person?.bankAccounts ?? null);

    const company = await getCompany();
    const companyAccounts = serializeAccounts(company?.bankAccounts ?? null);

    const amountPaid = Number(payment.amountPaid ?? 0);
    const total = Number(payment.total ?? 0);
    const pendingAmount = Math.max(total - amountPaid, 0);

    return {
        success: true,
        data: {
            payment: {
                id: payment.id,
                documentNumber: payment.documentNumber,
                total,
                amountPaid,
                pendingAmount,
                supplierId: payment.supplierId ?? null,
                supplierName: payment.supplier?.person?.businessName
                    ?? payment.supplier?.person?.firstName
                    ?? null,
                paymentStatus,
                paymentMethod: payment.paymentMethod ?? null,
                status: payment.status,
                notes: payment.notes ?? null,
            },
            supplierAccounts,
            companyAccounts,
        },
    };
}

export async function completeSupplierPayment(
    input: CompleteSupplierPaymentInput
): Promise<SupplierPaymentActionResult> {
    if (!input.paymentId) {
        return { success: false, error: 'Identificador de pago inválido' };
    }

    if (input.paymentMethod !== PaymentMethod.CASH && input.paymentMethod !== PaymentMethod.TRANSFER) {
        return { success: false, error: 'Método de pago no soportado' };
    }

    const session = await getCurrentSession();
    if (!session) {
        return { success: false, error: 'No hay sesión activa' };
    }

    const ds = await getDb();
    const repo = ds.getRepository(Transaction);

    const payment = await repo.findOne({
        where: { id: input.paymentId },
        relations: ['supplier', 'supplier.person'],
    });

    if (!payment) {
        return { success: false, error: 'Pago no encontrado' };
    }

    if (payment.transactionType !== TransactionType.PAYMENT_OUT) {
        return { success: false, error: 'La transacción seleccionada no es un pago a proveedor' };
    }

    if (payment.status === TransactionStatus.CANCELLED) {
        return { success: false, error: 'El pago está anulado y no se puede confirmar' };
    }

    const metadata = normalizeMetadata(payment.metadata);
    const currentStatus = typeof metadata.paymentStatus === 'string' ? metadata.paymentStatus.toUpperCase() : null;

    if (currentStatus === 'PAID') {
        return { success: false, error: 'El pago ya está registrado como pagado' };
    }

    let supplierAccount: PersonBankAccount | undefined;
    let companyAccount: PersonBankAccount | undefined;

    payment.bankAccountKey = undefined;

    if (input.paymentMethod === PaymentMethod.TRANSFER) {
        if (!input.supplierAccount || !input.companyAccount) {
            return { success: false, error: 'Debes seleccionar cuentas bancarias para la transferencia' };
        }

        const supplierAccounts = serializeAccounts(payment.supplier?.person?.bankAccounts ?? null);

        supplierAccount = supplierAccounts.find((account) =>
            account.bankName === input.supplierAccount?.bankName
            && account.accountType === input.supplierAccount?.accountType
            && account.accountNumber.trim() === input.supplierAccount?.accountNumber.trim()
        );

        if (!supplierAccount) {
            return { success: false, error: 'La cuenta bancaria del proveedor no es válida' };
        }

        const company = await getCompany();
        if (!company) {
            return { success: false, error: 'No se encontró la compañía' };
        }

        const companyAccounts = serializeAccounts(company.bankAccounts ?? null);

        companyAccount = companyAccounts.find((account) =>
            account.bankName === input.companyAccount?.bankName
            && account.accountType === input.companyAccount?.accountType
            && account.accountNumber.trim() === input.companyAccount?.accountNumber.trim()
        );

        if (!companyAccount) {
            return { success: false, error: 'La cuenta bancaria de la compañía no es válida' };
        }

        if (!companyAccount.accountKey) {
            return { success: false, error: 'La cuenta bancaria seleccionada no tiene un identificador válido' };
        }

        payment.bankAccountKey = companyAccount.accountKey;
        if (input.companyAccountKey && input.companyAccountKey !== companyAccount.accountKey) {
            return { success: false, error: 'La cuenta bancaria seleccionada no coincide con la enviada' };
        }
    }

    const total = Number(payment.total ?? 0);

    payment.paymentMethod = input.paymentMethod;
    payment.amountPaid = total;
    payment.status = TransactionStatus.CONFIRMED;

    const notes = typeof input.note === 'string' ? input.note.trim() : '';
    if (notes.length > 0) {
        payment.notes = notes;
    }

    const paymentDetails: Record<string, any> = {
        method: input.paymentMethod,
    };

    if (notes.length > 0) {
        paymentDetails.note = notes;
    }

    if (input.paymentMethod === PaymentMethod.TRANSFER && supplierAccount && companyAccount) {
        paymentDetails.transfer = {
            supplierAccount,
            companyAccount,
        };
    }

    const nextMetadata = {
        ...metadata,
        paymentStatus: 'PAID',
        paymentConfirmedAt: new Date().toISOString(),
        paymentConfirmedBy: session.id,
        paymentDetails,
    };

    payment.metadata = nextMetadata;

    await repo.save(payment);

    revalidatePath('/admin/purchasing/supplier-payments');

    return {
        success: true,
        documentNumber: payment.documentNumber,
    };
}
