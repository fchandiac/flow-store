'use server';

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

    const runningBalance = new Map<string, number>();

    const entries: LedgerEntry[] = ledger.postings.map((posting: LedgerPosting) => {
        const previous = runningBalance.get(posting.accountId) ?? 0;
        const current = previous + posting.debit - posting.credit;
        runningBalance.set(posting.accountId, current);

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
            balance: current,
            costCenter: null,
        };
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

    const rangeFormatter = new Intl.DateTimeFormat('es-CL', {
        month: 'short',
        day: '2-digit',
    });

    return periods.map((period) => {
        const start = new Date(period.startDate);
        const end = new Date(period.endDate);
        const name = `${rangeFormatter.format(start)} — ${rangeFormatter.format(end)}`;

        return {
            id: period.id,
            name,
            startDate: period.startDate,
            endDate: period.endDate,
            status: period.status,
            closedAt: period.closedAt ? period.closedAt.toISOString() : null,
            locked: period.status === AccountingPeriodStatus.LOCKED,
        };
    });
}
