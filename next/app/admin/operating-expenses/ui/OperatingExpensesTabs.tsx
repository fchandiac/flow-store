'use client';

import { useMemo, useState } from 'react';
import OperatingExpensesView, { type SupplierOption } from './OperatingExpensesView';
import OperatingExpenseCategoriesView from './OperatingExpenseCategoriesView';
import type { OperatingExpenseListItem } from '@/actions/operatingExpenses';
import type { ExpenseCategoryOption } from '@/actions/expenseCategories';
import type { CostCenterSummary } from '@/actions/costCenters';
import type { EmployeeListItem } from '@/actions/employees';
import type { PersonBankAccount } from '@/data/entities/Person';

interface OperatingExpensesTabsProps {
    expenses: OperatingExpenseListItem[];
    categories: ExpenseCategoryOption[];
    costCenters: CostCenterSummary[];
    employees: EmployeeListItem[];
    companyBankAccounts: PersonBankAccount[];
    suppliers: SupplierOption[];
}

type TabKey = 'expenses' | 'categories';

const TAB_ITEMS: Array<{ key: TabKey; label: string; description?: string }> = [
    {
        key: 'expenses',
        label: 'Historial de gastos',
        description: 'Revisa y registra gastos operativos asociados a categorías y centros de costos.',
    },
    {
        key: 'categories',
        label: 'Categorías de gastos',
        description: 'Administra las categorías disponibles, asigna centros de costos y documenta ejemplos de uso.',
    },
];

export default function OperatingExpensesTabs({ expenses, categories, costCenters, employees, companyBankAccounts, suppliers }: OperatingExpensesTabsProps) {
    const [activeTab, setActiveTab] = useState<TabKey>('expenses');

    const { title, description } = useMemo(() => {
        const current = TAB_ITEMS.find((tab) => tab.key === activeTab);
        return {
            title: current?.label ?? TAB_ITEMS[0].label,
            description: current?.description ?? TAB_ITEMS[0].description,
        };
    }, [activeTab]);

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
                {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
            </header>

            <div className="flex flex-wrap gap-2 border-b border-border">
                {TAB_ITEMS.map((tab) => {
                    const isActive = tab.key === activeTab;
                    return (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-4 pb-3 text-sm font-medium transition-colors border-b-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-t-md ${
                                isActive
                                    ? 'border-primary text-foreground'
                                    : 'border-transparent text-muted-foreground hover:text-foreground/80'
                            }`}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            <section>
                {activeTab === 'expenses' ? (
                    <OperatingExpensesView
                        expenses={expenses}
                        categories={categories}
                        costCenters={costCenters}
                        employees={employees}
                        companyBankAccounts={companyBankAccounts}
                        suppliers={suppliers}
                    />
                ) : (
                    <OperatingExpenseCategoriesView
                        categories={categories}
                        costCenters={costCenters}
                    />
                )}
            </section>
        </div>
    );
}
