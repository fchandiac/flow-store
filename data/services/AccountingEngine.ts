import { DataSource, In } from 'typeorm';
import { AccountingAccount, AccountType } from '../entities/AccountingAccount';
import { AccountingRule, RuleScope } from '../entities/AccountingRule';
import { Transaction, TransactionStatus, TransactionType } from '../entities/Transaction';
import { TransactionLine } from '../entities/TransactionLine';

export interface LedgerPosting {
    id: string;
    transactionId: string;
    ruleId: string;
    scope: RuleScope;
    accountId: string;
    accountCode: string;
    accountName: string;
    date: string;
    reference: string;
    description: string;
    debit: number;
    credit: number;
}

export interface LedgerComputationResult {
    accounts: AccountingAccount[];
    postings: LedgerPosting[];
    balanceByAccount: Record<string, number>;
}

interface BuildLedgerParams {
    companyId: string;
    from?: Date;
    to?: Date;
    limitTransactions?: number;
}

type TransactionWithMetadata = Transaction & { metadata?: Record<string, any> | null };

type LinesByTransaction = Map<string, TransactionLine[]>;

type RulesByScope = {
    transactionRules: AccountingRule[];
    lineRules: AccountingRule[];
};

const TRANSACTION_TYPES_WITH_SUBTOTAL_BASE = new Set<
    TransactionType
>([
    TransactionType.SALE,
    TransactionType.SALE_RETURN,
]);

const INVERT_POLARITY_TYPES = new Set<TransactionType>([
    TransactionType.SALE_RETURN,
    TransactionType.PURCHASE_RETURN,
]);

function toNumber(value: unknown): number {
    if (value === null || value === undefined) {
        return 0;
    }
    const numeric = typeof value === 'string' ? Number(value) : (value as number);
    return Number.isFinite(numeric) ? numeric : 0;
}

function parseMetadata(transaction: Transaction): Record<string, any> {
    if (!transaction.metadata || typeof transaction.metadata !== 'object') {
        return {};
    }
    return transaction.metadata as Record<string, any>;
}

function splitRules(rules: AccountingRule[]): RulesByScope {
    const transactionRules: AccountingRule[] = [];
    const lineRules: AccountingRule[] = [];

    for (const rule of rules) {
        if (!rule.isActive) {
            continue;
        }
        if (rule.appliesTo === RuleScope.TRANSACTION) {
            transactionRules.push(rule);
        } else {
            lineRules.push(rule);
        }
    }

    return { transactionRules, lineRules };
}

function matchesTransactionRule(rule: AccountingRule, transaction: TransactionWithMetadata): boolean {
    if (rule.transactionType !== transaction.transactionType) {
        return false;
    }

    if (rule.paymentMethod && rule.paymentMethod !== transaction.paymentMethod) {
        return false;
    }

    if (rule.taxId) {
        const metadata = parseMetadata(transaction);
        const transactionTaxId = metadata.taxId ?? metadata.tax_id ?? null;
        if (transactionTaxId !== rule.taxId) {
            return false;
        }
    }

    if (rule.expenseCategoryId) {
        const explicitCategoryId = transaction.expenseCategoryId ?? null;
        if (explicitCategoryId) {
            if (explicitCategoryId !== rule.expenseCategoryId) {
                return false;
            }
        } else {
            const metadata = parseMetadata(transaction);
            const transactionExpenseCategoryId =
                metadata.expenseCategoryId ?? metadata.expense_category_id ?? metadata.expenseCategory?.id ?? null;
            if (transactionExpenseCategoryId !== rule.expenseCategoryId) {
                return false;
            }
        }
    }

    return true;
}

function matchesLineRule(rule: AccountingRule, line: TransactionLine): boolean {
    if (rule.taxId && line.taxId !== rule.taxId) {
        return false;
    }

    return true;
}

function resolveTransactionAmount(rule: AccountingRule, transaction: Transaction): number {
    let baseAmount: number;

    if (TRANSACTION_TYPES_WITH_SUBTOTAL_BASE.has(transaction.transactionType)) {
        baseAmount = toNumber(transaction.subtotal);
    } else {
        baseAmount = toNumber(transaction.total);
    }

    if (INVERT_POLARITY_TYPES.has(transaction.transactionType)) {
        baseAmount *= -1;
    }

    if (!Number.isFinite(baseAmount) || baseAmount === 0) {
        return 0;
    }

    return baseAmount;
}

function resolveLineAmount(transaction: Transaction, line: TransactionLine): number {
    let amount = toNumber(line.taxAmount);
    if (amount === 0) {
        amount = toNumber(line.subtotal);
    }
    if (INVERT_POLARITY_TYPES.has(transaction.transactionType)) {
        amount *= -1;
    }
    return amount;
}

function createPostingId(transactionId: string, ruleId: string, accountId: string, postfix: string): string {
    return `${transactionId}:${ruleId}:${accountId}:${postfix}`;
}

function applyAmountToAccounts(
    amount: number,
    debitAccount: AccountingAccount,
    creditAccount: AccountingAccount,
    payload: {
        transaction: Transaction;
        rule: AccountingRule;
        reference: string;
        description: string;
    },
    accumulator: LedgerPosting[],
): void {
    if (!Number.isFinite(amount) || amount === 0) {
        return;
    }

    const magnitude = Math.abs(amount);
    const debitPosting: LedgerPosting = {
        id: createPostingId(payload.transaction.id, payload.rule.id, debitAccount.id, amount >= 0 ? 'D' : 'CR'),
        transactionId: payload.transaction.id,
        ruleId: payload.rule.id,
        scope: payload.rule.appliesTo,
        accountId: debitAccount.id,
        accountCode: debitAccount.code,
        accountName: debitAccount.name,
        date: payload.transaction.createdAt.toISOString(),
        reference: payload.reference,
        description: payload.description,
        debit: amount >= 0 ? magnitude : 0,
        credit: amount >= 0 ? 0 : magnitude,
    };

    const creditPosting: LedgerPosting = {
        id: createPostingId(payload.transaction.id, payload.rule.id, creditAccount.id, amount >= 0 ? 'C' : 'DR'),
        transactionId: payload.transaction.id,
        ruleId: payload.rule.id,
        scope: payload.rule.appliesTo,
        accountId: creditAccount.id,
        accountCode: creditAccount.code,
        accountName: creditAccount.name,
        date: payload.transaction.createdAt.toISOString(),
        reference: payload.reference,
        description: payload.description,
        debit: amount >= 0 ? 0 : magnitude,
        credit: amount >= 0 ? magnitude : 0,
    };

    accumulator.push(debitPosting, creditPosting);
}

function groupLinesByTransaction(lines: TransactionLine[]): LinesByTransaction {
    const map: LinesByTransaction = new Map();

    for (const line of lines) {
        if (!line.transactionId) {
            continue;
        }
        const bucket = map.get(line.transactionId) ?? [];
        bucket.push(line);
        map.set(line.transactionId, bucket);
    }

    return map;
}

function sumLineAmounts(
    rule: AccountingRule,
    transaction: Transaction,
    lines: readonly TransactionLine[],
): number {
    let amount = 0;

    for (const line of lines) {
        if (!matchesLineRule(rule, line)) {
            continue;
        }
        amount += resolveLineAmount(transaction, line);
    }

    return amount;
}

export async function buildLedger(
    dataSource: DataSource,
    params: BuildLedgerParams,
): Promise<LedgerComputationResult> {
    const accountRepo = dataSource.getRepository(AccountingAccount);
    const ruleRepo = dataSource.getRepository(AccountingRule);
    const transactionRepo = dataSource.getRepository(Transaction);
    const lineRepo = dataSource.getRepository(TransactionLine);

    const accounts = await accountRepo.find({
        where: { companyId: params.companyId },
        order: { code: 'ASC' },
    });

    if (accounts.length === 0) {
        return {
            accounts,
            postings: [],
            balanceByAccount: {},
        };
    }

    const accountsById = new Map(accounts.map((account) => [account.id, account]));

    const rules = await ruleRepo.find({
        where: { companyId: params.companyId },
        order: { priority: 'ASC' },
    });

    if (rules.length === 0) {
        return {
            accounts,
            postings: [],
            balanceByAccount: Object.fromEntries(accounts.map((account) => [account.id, 0])),
        };
    }

    const { transactionRules, lineRules } = splitRules(rules);

    if (transactionRules.length === 0 && lineRules.length === 0) {
        return {
            accounts,
            postings: [],
            balanceByAccount: Object.fromEntries(accounts.map((account) => [account.id, 0])),
        };
    }

    const relevantTypes = new Set<TransactionType>();
    for (const rule of rules) {
        relevantTypes.add(rule.transactionType);
    }

    const transactionQuery = transactionRepo
        .createQueryBuilder('transaction')
        .leftJoin('transaction.branch', 'branch')
        .where('transaction.status = :status', { status: TransactionStatus.CONFIRMED })
        .andWhere('transaction.transactionType IN (:...types)', { types: Array.from(relevantTypes) })
        .andWhere('(branch.companyId = :companyId OR branch.companyId IS NULL)', { companyId: params.companyId })
        .orderBy('transaction.createdAt', 'ASC');

    if (params.from) {
        transactionQuery.andWhere('transaction.createdAt >= :from', { from: params.from });
    }

    if (params.to) {
        transactionQuery.andWhere('transaction.createdAt <= :to', { to: params.to });
    }

    if (params.limitTransactions && params.limitTransactions > 0) {
        transactionQuery.take(params.limitTransactions);
    }

    const transactions = await transactionQuery.getMany();

    if (transactions.length === 0) {
        return {
            accounts,
            postings: [],
            balanceByAccount: Object.fromEntries(accounts.map((account) => [account.id, 0])),
        };
    }

    const lines: TransactionLine[] = lineRules.length > 0
        ? await lineRepo.find({
              where: { transactionId: In(transactions.map((tx) => tx.id)) },
          })
        : [];

    const linesMap = groupLinesByTransaction(lines);

    const postings: LedgerPosting[] = [];

    for (const transaction of transactions) {
        const reference = transaction.documentNumber || transaction.externalReference || transaction.id;
        const description = transaction.notes || transaction.transactionType;
        const linesForTransaction = linesMap.get(transaction.id) ?? [];

        for (const rule of transactionRules) {
            if (!matchesTransactionRule(rule, transaction)) {
                continue;
            }

            const debitAccount = accountsById.get(rule.debitAccountId);
            const creditAccount = accountsById.get(rule.creditAccountId);

            if (!debitAccount || !creditAccount) {
                continue;
            }

            const amount = resolveTransactionAmount(rule, transaction);
            applyAmountToAccounts(
                amount,
                debitAccount,
                creditAccount,
                {
                    transaction,
                    rule,
                    reference,
                    description,
                },
                postings,
            );
        }

        if (linesForTransaction.length === 0 || lineRules.length === 0) {
            continue;
        }

        for (const rule of lineRules) {
            if (rule.transactionType !== transaction.transactionType) {
                continue;
            }

            const debitAccount = accountsById.get(rule.debitAccountId);
            const creditAccount = accountsById.get(rule.creditAccountId);

            if (!debitAccount || !creditAccount) {
                continue;
            }

            const amount = sumLineAmounts(rule, transaction, linesForTransaction);
            applyAmountToAccounts(
                amount,
                debitAccount,
                creditAccount,
                {
                    transaction,
                    rule,
                    reference,
                    description,
                },
                postings,
            );
        }
    }

    postings.sort((a, b) => {
        if (a.date === b.date) {
            return a.id.localeCompare(b.id);
        }
        return a.date.localeCompare(b.date);
    });

    const balanceMap = new Map<string, number>();

    for (const account of accounts) {
        balanceMap.set(account.id, 0);
    }

    for (const posting of postings) {
        const current = balanceMap.get(posting.accountId) ?? 0;
        balanceMap.set(posting.accountId, current + posting.debit - posting.credit);
    }

    return {
        accounts,
        postings,
        balanceByAccount: Object.fromEntries(balanceMap),
    };
}

export function normalizeBalanceForPresentation(type: AccountType, balance: number): number {
    switch (type) {
        case AccountType.ASSET:
        case AccountType.EXPENSE:
            return balance;
        case AccountType.LIABILITY:
        case AccountType.EQUITY:
        case AccountType.INCOME:
            return balance * -1;
        default:
            return balance;
    }
}
