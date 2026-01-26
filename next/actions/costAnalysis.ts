'use server';

import { getDb } from '@/data/db';
import { Transaction, TransactionType } from '@/data/entities/Transaction';
import { CostCenter } from '@/data/entities/CostCenter';
import { Budget } from '@/data/entities/Budget';
import { getCompany } from './companies';
import { Between, In } from 'typeorm';

export interface CostAnalysisFilters {
    type: 'EXPENSE_ONLY' | 'BUDGET_COMPARISON';
    dateFrom?: string;
    dateTo?: string;
    budgetId?: string;
    costCenterIds?: string[];
    branchIds?: string[];
}

export interface CostAnalysisSummary {
    totalExpenses: number;
    totalBudgeted: number;
    globalVariance: number;
    utilizationPercent: number;
    title: string;
    periodLabel: string;
}

export interface CostCenterAnalysisItem {
    costCenterId: string;
    costCenterName: string;
    costCenterCode: string;
    expenses: number;
    budgeted: number;
    variance: number;
    utilizationPercent: number;
}

export interface CostAnalysisResult {
    summary: CostAnalysisSummary;
    byCostCenter: CostCenterAnalysisItem[];
}

export async function getCostAnalysisReport(filters: CostAnalysisFilters): Promise<CostAnalysisResult> {
    const company = await getCompany();
    if (!company) throw new Error('Compañía no encontrada');

    const ds = await getDb();
    const txRepo = ds.getRepository(Transaction);
    const ccRepo = ds.getRepository(CostCenter);
    const budgetRepo = ds.getRepository(Budget);

    let dateRange = { from: filters.dateFrom, to: filters.dateTo };
    let budgetToCompare: Budget | null = null;
    let costCenterIds = filters.costCenterIds || [];

    if (filters.type === 'BUDGET_COMPARISON' && filters.budgetId) {
        budgetToCompare = await budgetRepo.findOne({ 
            where: { id: filters.budgetId }
        });
        if (!budgetToCompare) throw new Error('Presupuesto no encontrado');
        
        dateRange.from = budgetToCompare.periodStart;
        dateRange.to = budgetToCompare.periodEnd;
        costCenterIds = [budgetToCompare.costCenterId];
    }

    const where: any = {
        branch: { companyId: company.id }
    };

    if (dateRange.from && dateRange.to) {
        where.createdAt = Between(new Date(dateRange.from), new Date(dateRange.to));
    }

    if (costCenterIds.length > 0) {
        where.costCenterId = In(costCenterIds);
    }

    if (filters.branchIds && filters.branchIds.length > 0) {
        where.branchId = In(filters.branchIds);
    }

    const expenseTypes = [
        TransactionType.PURCHASE,
        TransactionType.OPERATING_EXPENSE,
        TransactionType.PAYMENT_OUT,
        TransactionType.ADJUSTMENT_OUT,
        TransactionType.CASH_SESSION_WITHDRAWAL,
        TransactionType.SALE_RETURN
    ];

    const transactions = await txRepo.find({
        where: {
            ...where,
            transactionType: In(expenseTypes)
        }
    });

    const analysisMap = new Map<string, CostCenterAnalysisItem>();
    
    const relevantCCs = await ccRepo.find({
        where: costCenterIds.length > 0 
            ? { id: In(costCenterIds), companyId: company.id }
            : { companyId: company.id }
    });

    relevantCCs.forEach(cc => {
        analysisMap.set(cc.id, {
            costCenterId: cc.id,
            costCenterName: cc.name,
            costCenterCode: cc.code,
            expenses: 0,
            budgeted: 0,
            variance: 0,
            utilizationPercent: 0
        });
    });

    transactions.forEach(tx => {
        if (!tx.costCenterId) return;
        const item = analysisMap.get(tx.costCenterId);
        if (item) {
            item.expenses += Number(tx.total);
        }
    });

    if (filters.type === 'BUDGET_COMPARISON' && budgetToCompare) {
        const item = analysisMap.get(budgetToCompare.costCenterId);
        if (item) item.budgeted = Number(budgetToCompare.budgetedAmount);
    } else if (filters.type === 'EXPENSE_ONLY') {
        const budgets = await budgetRepo.find({
            where: {
                companyId: company.id,
                ...(costCenterIds.length > 0 ? { costCenterId: In(costCenterIds) } : {})
            }
        });
        budgets.forEach(b => {
            const item = analysisMap.get(b.costCenterId);
            if (item) item.budgeted += Number(b.budgetedAmount);
        });
    }

    const items = Array.from(analysisMap.values()).map(item => {
        const variance = item.budgeted - item.expenses;
        const utilizationPercent = item.budgeted > 0 ? (item.expenses / item.budgeted) * 100 : 0;
        return { ...item, variance, utilizationPercent };
    });

    const totalExpenses = items.reduce((sum, item) => sum + item.expenses, 0);
    const totalBudgeted = items.reduce((sum, item) => sum + item.budgeted, 0);

    return {
        summary: {
            title: filters.type === 'BUDGET_COMPARISON' ? 'Comparativa de Presupuesto' : 'Reporte de Gastos',
            periodLabel: `${dateRange.from || 'Inicio'} al ${dateRange.to || 'Hoy'}`,
            totalExpenses,
            totalBudgeted,
            globalVariance: totalBudgeted - totalExpenses,
            utilizationPercent: totalBudgeted > 0 ? (totalExpenses / totalBudgeted) * 100 : 0
        },
        byCostCenter: items.sort((a, b) => b.expenses - a.expenses)
    };
}
