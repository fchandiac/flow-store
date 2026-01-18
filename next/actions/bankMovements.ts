'use server'

import { getDb } from '@/data/db';
import { getCompany } from './companies';
import { Transaction, TransactionStatus, TransactionType, PaymentMethod } from '@/data/entities/Transaction';
import type { CompanyBankAccount } from '@/data/entities/Company';
import type { Customer } from '@/data/entities/Customer';
import type { Supplier } from '@/data/entities/Supplier';
import type { Person } from '@/data/entities/Person';

const RELEVANT_TRANSACTION_TYPES: TransactionType[] = [
    TransactionType.PAYMENT_IN,
    TransactionType.PAYMENT_OUT,
    TransactionType.OPERATING_EXPENSE,
    TransactionType.CASH_DEPOSIT,
    TransactionType.CASH_SESSION_DEPOSIT,
];

const INCOMING_TRANSACTION_TYPES = new Set<TransactionType>([
    TransactionType.PAYMENT_IN,
    TransactionType.CASH_DEPOSIT,
    TransactionType.CASH_SESSION_DEPOSIT,
]);

const OUTGOING_TRANSACTION_TYPES = new Set<TransactionType>([
    TransactionType.PAYMENT_OUT,
    TransactionType.OPERATING_EXPENSE,
]);

export type BankMovementDirection = 'IN' | 'OUT';

export type BankMovementKind =
    | 'CAPITAL_CONTRIBUTION'
    | 'BANK_TO_CASH_TRANSFER'
    | 'CUSTOMER_PAYMENT'
    | 'SUPPLIER_PAYMENT'
    | 'OPERATING_EXPENSE'
    | 'CASH_DEPOSIT'
    | 'GENERAL';

export interface BankMovementRecord {
    id: string;
    documentNumber: string | null;
    transactionType: TransactionType;
    direction: BankMovementDirection;
    movementKind: BankMovementKind;
    total: number;
    createdAt: string;
    bankAccountKey?: string | null;
    bankAccountLabel: string | null;
    bankAccountNumber?: string | null;
    bankName?: string | null;
    notes?: string | null;
    paymentMethod?: PaymentMethod | null;
    recordedBy?: string | null;
    counterpartyName?: string | null;
    metadata?: Record<string, any> | null;
}

export interface BankMovementsOverviewSummary {
    projectedBalance: number;
    incomingTotal: number;
    outgoingTotal: number;
    incomingCount: number;
    outgoingCount: number;
    monthIncomingTotal: number;
    monthIncomingCount: number;
    monthOutgoingTotal: number;
    monthOutgoingCount: number;
    monthCapitalTotal: number;
    monthCapitalCount: number;
    monthTransfersTotal: number;
    monthTransfersCount: number;
}

export interface BankMovementsOverview {
    summary: BankMovementsOverviewSummary;
    recentMovements: BankMovementRecord[];
    monthMovements: BankMovementRecord[];
}

function toNumber(value: unknown): number {
    if (value === null || value === undefined) {
        return 0;
    }
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : 0;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function resolveDirection(transactionType: TransactionType): BankMovementDirection {
    if (INCOMING_TRANSACTION_TYPES.has(transactionType)) {
        return 'IN';
    }
    return 'OUT';
}

function inferMovementKind(
    transaction: Transaction,
    metadata: Record<string, any>,
): BankMovementKind {
    const explicit = metadata?.bankMovement?.kind;
    if (typeof explicit === 'string') {
        return explicit as BankMovementKind;
    }

    switch (transaction.transactionType) {
        case TransactionType.CASH_DEPOSIT:
            return 'CASH_DEPOSIT';
        case TransactionType.PAYMENT_IN:
            return 'CUSTOMER_PAYMENT';
        case TransactionType.PAYMENT_OUT:
            return metadata?.paymentDetails ? 'SUPPLIER_PAYMENT' : 'GENERAL';
        case TransactionType.OPERATING_EXPENSE:
            return 'OPERATING_EXPENSE';
        case TransactionType.CASH_SESSION_DEPOSIT:
            return 'BANK_TO_CASH_TRANSFER';
        default:
            return 'GENERAL';
    }
}

function buildAccountLabel(account: CompanyBankAccount | undefined, fallbackKey: string | null | undefined): {
    label: string | null;
    number: string | null;
    bankName: string | null;
} {
    if (!account) {
        if (!fallbackKey) {
            return {
                label: null,
                number: null,
                bankName: null,
            };
        }
        return {
            label: `Cuenta ${fallbackKey.slice(0, 8)}…`,
            number: null,
            bankName: null,
        };
    }

    const maskedNumber = account.accountNumber.length > 4
        ? `${account.accountNumber.slice(0, -4).replace(/[0-9]/g, '•')}${account.accountNumber.slice(-4)}`
        : account.accountNumber;

    return {
        label: `${account.bankName} · ${maskedNumber}`,
        number: account.accountNumber,
        bankName: account.bankName,
    };
}

function buildCounterpartyName(transaction: Transaction & {
    supplier?: Supplier | null;
    customer?: Customer | null;
}): string | null {
    const supplierPerson = (transaction.supplier as Supplier | undefined)?.person as Person | undefined;
    if (supplierPerson) {
        return supplierPerson.businessName
            || [supplierPerson.firstName, supplierPerson.lastName].filter(Boolean).join(' ')
            || null;
    }

    const customerPerson = (transaction.customer as Customer | undefined)?.person as Person | undefined;
    if (customerPerson) {
        return customerPerson.businessName
            || [customerPerson.firstName, customerPerson.lastName].filter(Boolean).join(' ')
            || null;
    }

    return null;
}

function buildRecordedBy(transaction: Transaction & { user?: { person?: Person | null } | null }): string | null {
    const userPerson = transaction.user?.person;
    if (!userPerson) {
        return null;
    }
    return [userPerson.firstName, userPerson.lastName].filter(Boolean).join(' ') || null;
}

function normalizeMetadata(metadata: unknown): Record<string, any> {
    if (!metadata || typeof metadata !== 'object') {
        return {};
    }
    try {
        return JSON.parse(JSON.stringify(metadata));
    } catch (error) {
        console.warn('[bankMovements] metadata serialization error', error);
        return {};
    }
}

function mapTransactionToRecord(
    transaction: Transaction & {
        supplier?: Supplier | null;
        customer?: Customer | null;
        user?: { person?: Person | null } | null;
    },
    accountIndex: Map<string, CompanyBankAccount>,
): BankMovementRecord {
    const metadata = normalizeMetadata(transaction.metadata);
    const direction = resolveDirection(transaction.transactionType);
    const kind = inferMovementKind(transaction, metadata);
    const account = transaction.bankAccountKey ? accountIndex.get(transaction.bankAccountKey) : undefined;
    const accountView = buildAccountLabel(account, transaction.bankAccountKey);

    return {
        id: transaction.id,
        documentNumber: transaction.documentNumber ?? null,
        transactionType: transaction.transactionType,
        direction,
        movementKind: kind,
        total: toNumber(transaction.total),
        createdAt: transaction.createdAt instanceof Date
            ? transaction.createdAt.toISOString()
            : new Date(transaction.createdAt).toISOString(),
        bankAccountKey: transaction.bankAccountKey ?? null,
        bankAccountLabel: accountView.label,
        bankAccountNumber: accountView.number,
        bankName: accountView.bankName,
        notes: transaction.notes ?? null,
        paymentMethod: transaction.paymentMethod ?? null,
        recordedBy: buildRecordedBy(transaction),
        counterpartyName: buildCounterpartyName(transaction),
        metadata,
    };
}

interface AggregateRow {
    incomingTotal: string | number | null;
    outgoingTotal: string | number | null;
    incomingCount: string | number | null;
    outgoingCount: string | number | null;
}

function sanitizeAggregate(row: AggregateRow | undefined): {
    incomingTotal: number;
    outgoingTotal: number;
    incomingCount: number;
    outgoingCount: number;
} {
    if (!row) {
        return {
            incomingTotal: 0,
            outgoingTotal: 0,
            incomingCount: 0,
            outgoingCount: 0,
        };
    }

    return {
        incomingTotal: toNumber(row.incomingTotal),
        outgoingTotal: toNumber(row.outgoingTotal),
        incomingCount: toNumber(row.incomingCount),
        outgoingCount: toNumber(row.outgoingCount),
    };
}

export async function getBankMovementsOverview(): Promise<BankMovementsOverview> {
    const [ds, company] = await Promise.all([getDb(), getCompany()]);

    const accountIndex = new Map<string, CompanyBankAccount>();
    if (company?.bankAccounts) {
        for (const account of company.bankAccounts) {
            if (!account.accountKey) {
                continue;
            }
            accountIndex.set(account.accountKey, account);
        }
    }

    const repo = ds.getRepository(Transaction);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const now = new Date();

    const [recentTransactions, monthTransactions, aggregateRaw] = await Promise.all([
        repo.createQueryBuilder('transaction')
            .leftJoinAndSelect('transaction.supplier', 'supplier')
            .leftJoinAndSelect('supplier.person', 'supplierPerson')
            .leftJoinAndSelect('transaction.customer', 'customer')
            .leftJoinAndSelect('customer.person', 'customerPerson')
            .leftJoinAndSelect('transaction.user', 'registeredBy')
            .leftJoinAndSelect('registeredBy.person', 'registeredByPerson')
            .where('transaction.status = :status', { status: TransactionStatus.CONFIRMED })
            .andWhere('transaction.transactionType IN (:...types)', { types: RELEVANT_TRANSACTION_TYPES })
            .andWhere('(transaction.bankAccountKey IS NOT NULL OR transaction.paymentMethod = :transfer)', {
                transfer: PaymentMethod.TRANSFER,
            })
            .orderBy('transaction.createdAt', 'DESC')
            .take(60)
            .getMany(),
        repo.createQueryBuilder('transaction')
            .where('transaction.status = :status', { status: TransactionStatus.CONFIRMED })
            .andWhere('transaction.transactionType IN (:...types)', { types: RELEVANT_TRANSACTION_TYPES })
            .andWhere('(transaction.bankAccountKey IS NOT NULL OR transaction.paymentMethod = :transfer)', {
                transfer: PaymentMethod.TRANSFER,
            })
            .andWhere('transaction.createdAt BETWEEN :monthStart AND :monthEnd', {
                monthStart,
                monthEnd: now,
            })
            .orderBy('transaction.createdAt', 'DESC')
            .getMany(),
        repo.createQueryBuilder('transaction')
            .select([
                `COALESCE(SUM(CASE WHEN transaction.transactionType IN (:...inTypes) THEN transaction.total ELSE 0 END), 0) AS "incomingTotal"`,
                `COALESCE(SUM(CASE WHEN transaction.transactionType IN (:...outTypes) THEN transaction.total ELSE 0 END), 0) AS "outgoingTotal"`,
                `COALESCE(SUM(CASE WHEN transaction.transactionType IN (:...inTypes) THEN 1 ELSE 0 END), 0) AS "incomingCount"`,
                `COALESCE(SUM(CASE WHEN transaction.transactionType IN (:...outTypes) THEN 1 ELSE 0 END), 0) AS "outgoingCount"`,
            ])
            .where('transaction.status = :status', { status: TransactionStatus.CONFIRMED })
            .andWhere('transaction.transactionType IN (:...types)', { types: RELEVANT_TRANSACTION_TYPES })
            .andWhere('(transaction.bankAccountKey IS NOT NULL OR transaction.paymentMethod = :transfer)', {
                transfer: PaymentMethod.TRANSFER,
            })
            .setParameters({
                inTypes: Array.from(INCOMING_TRANSACTION_TYPES),
                outTypes: Array.from(OUTGOING_TRANSACTION_TYPES),
            })
            .getRawOne<AggregateRow>(),
    ]);

    const aggregate = sanitizeAggregate(aggregateRaw);

    const recentMovements = recentTransactions.map((transaction) =>
        mapTransactionToRecord(transaction as Transaction & {
            supplier?: Supplier | null;
            customer?: Customer | null;
            user?: { person?: Person | null } | null;
        }, accountIndex)
    );

    const monthMovements = monthTransactions.map((transaction) =>
        mapTransactionToRecord(transaction as Transaction & {
            supplier?: Supplier | null;
            customer?: Customer | null;
            user?: { person?: Person | null } | null;
        }, accountIndex)
    );

    let monthIncomingTotal = 0;
    let monthOutgoingTotal = 0;
    let monthIncomingCount = 0;
    let monthOutgoingCount = 0;
    let monthCapitalTotal = 0;
    let monthCapitalCount = 0;
    let monthTransfersTotal = 0;
    let monthTransfersCount = 0;

    for (const movement of monthMovements) {
        if (movement.direction === 'IN') {
            monthIncomingTotal += movement.total;
            monthIncomingCount += 1;
        } else {
            monthOutgoingTotal += movement.total;
            monthOutgoingCount += 1;
        }

        if (movement.movementKind === 'CAPITAL_CONTRIBUTION') {
            monthCapitalTotal += movement.total;
            monthCapitalCount += 1;
        } else if (movement.movementKind === 'BANK_TO_CASH_TRANSFER') {
            monthTransfersTotal += movement.total;
            monthTransfersCount += 1;
        }
    }

    const projectedBalance = Number((aggregate.incomingTotal - aggregate.outgoingTotal).toFixed(2));

    return {
        summary: {
            projectedBalance,
            incomingTotal: Number(aggregate.incomingTotal.toFixed(2)),
            outgoingTotal: Number(aggregate.outgoingTotal.toFixed(2)),
            incomingCount: aggregate.incomingCount,
            outgoingCount: aggregate.outgoingCount,
            monthIncomingTotal: Number(monthIncomingTotal.toFixed(2)),
            monthIncomingCount,
            monthOutgoingTotal: Number(monthOutgoingTotal.toFixed(2)),
            monthOutgoingCount,
            monthCapitalTotal: Number(monthCapitalTotal.toFixed(2)),
            monthCapitalCount,
            monthTransfersTotal: Number(monthTransfersTotal.toFixed(2)),
            monthTransfersCount,
        },
        recentMovements,
        monthMovements,
    };
}
