'use server';

import { revalidatePath } from 'next/cache';
import { getDb } from '@/data/db';
import { getCompany } from './companies';
import { AccountType } from '@/data/entities/AccountingAccount';
import { AccountingPeriod, AccountingPeriodStatus } from '@/data/entities/AccountingPeriod';
import { buildLedger, normalizeBalanceForPresentation, LedgerPosting } from '@/data/services/AccountingEngine';

export interface AccountingAccountNode {
    id: string;
    code: string;
    name: string;
    type: AccountType;
    parentId: string | null;
    balance: number;
    children: AccountingAccountNode[];
}

export interface LedgerEntry {
    id: string;
    accountId: string;
    accountCode: string;
    accountName: string;
    date: string;
    reference: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
    costCenter?: string | null;
}

export interface FinancialReportSummary {
    balanceSheet: Array<{
        group: string;
        amount: number;
    }>;
    incomeStatement: {
        ingresos: number;
        egresos: number;
        resultado: number;
    };
}

export interface AccountingPeriodSummary {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    status: AccountingPeriodStatus;
    closedAt?: string | null;
    locked: boolean;
}

export interface CreateAccountingPeriodInput {
    startDate: string;
    endDate: string;
}

export interface AccountingPeriodMutationResult {
    success: boolean;
    error?: string;
    period?: AccountingPeriodSummary;
}

const ACCOUNTING_PERIODS_PATH = '/admin/accounting/periods';

const toISODate = (date: Date): string => {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const resolveMonthlyRange = (targetDate: Date): { startDate: string; endDate: string } => {
    const base = new Date(targetDate);
    const start = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 1));
    const end = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0));
    return {
        startDate: toISODate(start),
        endDate: toISODate(end),
    };
};

export async function ensureAccountingPeriodForCompany(companyId: string, targetDate: Date = new Date()): Promise<AccountingPeriod> {
    const ds = await getDb();
    const repo = ds.getRepository(AccountingPeriod);
    const { startDate, endDate } = resolveMonthlyRange(targetDate);

    let period = await repo.findOne({
        where: {
            companyId,
            startDate,
            endDate,
        },
    });

    if (period) {
        return period;
    }

    period = repo.create({
        companyId,
        startDate,
        endDate,
        status: AccountingPeriodStatus.OPEN,
    });

    return repo.save(period);
}

export async function ensureAccountingPeriodForDate(targetDate: Date = new Date()): Promise<AccountingPeriod> {
    const company = await getCompany();
    if (!company) {
        throw new Error('No se encontró la compañía activa para generar el período contable.');
    }
    return ensureAccountingPeriodForCompany(company.id, targetDate);
}

const periodNameFormatter = new Intl.DateTimeFormat('es-CL', {
    month: 'short',
    day: '2-digit',
});

const serializeAccountingPeriod = (period: AccountingPeriod): AccountingPeriodSummary => {
    const start = new Date(period.startDate);
    const end = new Date(period.endDate);
    const name = `${periodNameFormatter.format(start)} — ${periodNameFormatter.format(end)}`;

    return {
        id: period.id,
        name,
        startDate: period.startDate,
        endDate: period.endDate,
        status: period.status,
        closedAt: period.closedAt ? period.closedAt.toISOString() : null,
        locked: period.status === AccountingPeriodStatus.LOCKED,
    };
};

export async function getAccountingHierarchy(): Promise<AccountingAccountNode[]> {
    const company = await getCompany();
    if (!company) {
        return [];
    }

    const ds = await getDb();
    const ledger = await buildLedger(ds, { companyId: company.id });

    const byId = new Map<string, AccountingAccountNode>();
    const roots: AccountingAccountNode[] = [];

    for (const account of ledger.accounts) {
        byId.set(account.id, {
            id: account.id,
            code: account.code,
            name: account.name,
            type: account.type,
            parentId: account.parentId ?? null,
            balance: normalizeBalanceForPresentation(account.type, ledger.balanceByAccount[account.id] ?? 0),
            children: [],
        });
    }

    for (const node of byId.values()) {
        if (node.parentId && byId.has(node.parentId)) {
            byId.get(node.parentId)?.children.push(node);
        } else {
            roots.push(node);
        }
    }

    const aggregateBalances = (nodes: AccountingAccountNode[]): number => {
        let total = 0;
        for (const node of nodes) {
            if (node.children.length > 0) {
                node.children.sort((a, b) => a.code.localeCompare(b.code));
                const childrenSum = aggregateBalances(node.children);
                node.balance += childrenSum;
            }
            total += node.balance;
        }
        return total;
    };

    aggregateBalances(roots);

    roots.sort((a, b) => a.code.localeCompare(b.code));

    return roots;
}

export async function getLedgerPreview(): Promise<LedgerEntry[]> {
    const company = await getCompany();
    if (!company) {
        return [];
    }

    const ds = await getDb();
    const ledger = await buildLedger(ds, { companyId: company.id });

    if (ledger.postings.length === 0) {
        return [];
    }

    const accountTypeById = new Map<string, AccountType>(
        ledger.accounts.map((account) => [account.id, account.type]),
    );
    const runningBalance = new Map<string, number>();

    const entries: LedgerEntry[] = ledger.postings.map((posting: LedgerPosting) => {
        const previous = runningBalance.get(posting.accountId) ?? 0;
        const current = previous + posting.debit - posting.credit;
        runningBalance.set(posting.accountId, current);

        const accountType = accountTypeById.get(posting.accountId);
        const normalizedBalance = accountType
            ? normalizeBalanceForPresentation(accountType, current)
            : current;

        return {
            id: posting.id,
            accountId: posting.accountId,
            accountCode: posting.accountCode,
            accountName: posting.accountName,
            date: posting.date,
            reference: posting.reference,
            description: posting.description,
            debit: posting.debit,
            credit: posting.credit,
            balance: normalizedBalance,
            costCenter: null,
        };
    });

    entries.sort((a, b) => {
        const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateDiff !== 0) {
            return dateDiff;
        }
        return (b.reference ?? '').localeCompare(a.reference ?? '');
    });

    return entries;
}

export async function getFinancialReportSummary(): Promise<FinancialReportSummary> {
    const company = await getCompany();
    if (!company) {
        return {
            balanceSheet: [
                { group: 'Activo', amount: 0 },
                { group: 'Pasivo', amount: 0 },
                { group: 'Patrimonio', amount: 0 },
            ],
            incomeStatement: {
                ingresos: 0,
                egresos: 0,
                resultado: 0,
            },
        };
    }

    const ds = await getDb();
    const ledger = await buildLedger(ds, { companyId: company.id });

    const totals = {
        asset: 0,
        liability: 0,
        equity: 0,
        income: 0,
        expense: 0,
    };

    for (const account of ledger.accounts) {
        const balance = ledger.balanceByAccount[account.id] ?? 0;
        const normalized = normalizeBalanceForPresentation(account.type, balance);

        switch (account.type) {
            case AccountType.ASSET:
                totals.asset += normalized;
                break;
            case AccountType.LIABILITY:
                totals.liability += normalized;
                break;
            case AccountType.EQUITY:
                totals.equity += normalized;
                break;
            case AccountType.INCOME:
                totals.income += normalized;
                break;
            case AccountType.EXPENSE:
                totals.expense += normalized;
                break;
            default:
                break;
        }
    }

    const round = (value: number) => Math.round(value);

    return {
        balanceSheet: [
            { group: 'Activo', amount: round(totals.asset) },
            { group: 'Pasivo', amount: round(totals.liability) },
            { group: 'Patrimonio', amount: round(totals.equity) },
        ],
        incomeStatement: {
            ingresos: round(totals.income),
            egresos: round(totals.expense),
            resultado: round(totals.income - totals.expense),
        },
    };
}

export async function getAccountingPeriods(): Promise<AccountingPeriodSummary[]> {
    const company = await getCompany();
    if (!company) {
        return [];
    }

    const ds = await getDb();
    const repo = ds.getRepository(AccountingPeriod);

    const periods = await repo
        .createQueryBuilder('period')
        .where('period.companyId = :companyId', { companyId: company.id })
        .orderBy('period.startDate', 'DESC')
        .getMany();

    return periods.map((period) => serializeAccountingPeriod(period));
}

export async function createAccountingPeriod(input: CreateAccountingPeriodInput): Promise<AccountingPeriodMutationResult> {
    const company = await getCompany();
    if (!company) {
        return { success: false, error: 'No hay compañía activa configurada.' };
    }

    const normalizedStart = input.startDate?.trim();
    const normalizedEnd = input.endDate?.trim();

    if (!normalizedStart || !normalizedEnd) {
        return { success: false, error: 'Debes definir la fecha de inicio y término del período.' };
    }

    const startDate = new Date(normalizedStart);
    const endDate = new Date(normalizedEnd);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        return { success: false, error: 'Las fechas ingresadas no son válidas.' };
    }

    if (endDate < startDate) {
        return { success: false, error: 'La fecha de término no puede ser anterior a la fecha de inicio.' };
    }

    const expectedRange = resolveMonthlyRange(startDate);
    if (expectedRange.startDate !== normalizedStart || expectedRange.endDate !== normalizedEnd) {
        return { success: false, error: 'Los períodos contables deben abarcar exactamente un mes calendario.' };
    }

    const ds = await getDb();
    const repo = ds.getRepository(AccountingPeriod);

    const existingOpenPeriod = await repo.findOne({
        where: {
            companyId: company.id,
            status: AccountingPeriodStatus.OPEN,
        },
    });

    if (existingOpenPeriod) {
        const formatter = new Intl.DateTimeFormat('es-CL');
        const formattedStart = formatter.format(new Date(existingOpenPeriod.startDate));
        const formattedEnd = formatter.format(new Date(existingOpenPeriod.endDate));
        return {
            success: false,
            error: `Ya existe un período contable activo desde ${formattedStart} hasta ${formattedEnd}. Debes cerrarlo antes de crear uno nuevo.`,
        };
    }

    const overlappingPeriods = await repo
        .createQueryBuilder('period')
        .where('period.companyId = :companyId', { companyId: company.id })
        .andWhere('period.startDate <= :endDate AND period.endDate >= :startDate', {
            startDate: normalizedStart,
            endDate: normalizedEnd,
        })
        .getCount();

    if (overlappingPeriods > 0) {
        return { success: false, error: 'El período se superpone con otro período contable existente.' };
    }

    const entity = repo.create({
        companyId: company.id,
        startDate: normalizedStart,
        endDate: normalizedEnd,
        status: AccountingPeriodStatus.OPEN,
    });

    const saved = await repo.save(entity);

    revalidatePath(ACCOUNTING_PERIODS_PATH);

    return {
        success: true,
        period: serializeAccountingPeriod(saved),
    };
}
