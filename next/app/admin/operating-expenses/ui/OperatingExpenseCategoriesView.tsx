'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Badge from '@/baseComponents/Badge/Badge';
import { Button } from '@/baseComponents/Button/Button';
import OperatingExpenseCategoryDialog from './OperatingExpenseCategoryDialog';
import type { ExpenseCategoryOption } from '@/actions/expenseCategories';
import type { CostCenterSummary } from '@/actions/costCenters';

interface OperatingExpenseCategoriesViewProps {
    categories: ExpenseCategoryOption[];
    costCenters: CostCenterSummary[];
}

interface GroupedCategories {
    groupName: string;
    categories: ExpenseCategoryOption[];
}

const formatDate = (iso: string) => {
    try {
        return new Date(iso).toLocaleDateString('es-CL', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    } catch (error) {
        return iso;
    }
};

export default function OperatingExpenseCategoriesView({ categories, costCenters }: OperatingExpenseCategoriesViewProps) {
    const router = useRouter();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [isRefreshing, startRefresh] = useTransition();

    const groupedCategories = useMemo<GroupedCategories[]>(() => {
        const map = new Map<string, ExpenseCategoryOption[]>();
        categories.forEach((category) => {
            const key = category.groupName?.trim() ?? 'Sin agrupación';
            if (!map.has(key)) {
                map.set(key, []);
            }
            map.get(key)!.push(category);
        });

        return Array.from(map.entries())
            .map(([groupName, items]) => ({
                groupName,
                categories: items.sort((a, b) => a.name.localeCompare(b.name, 'es')),
            }))
            .sort((a, b) => a.groupName.localeCompare(b.groupName, 'es'));
    }, [categories]);

    const groupNames = useMemo(() => {
        return Array.from(
            new Set(
                categories
                    .map((category) => category.groupName?.trim())
                    .filter((name): name is string => typeof name === 'string' && name.length > 0),
            ),
        ).sort((a, b) => a.localeCompare(b, 'es'));
    }, [categories]);

    const handleDialogSuccess = () => {
        startRefresh(async () => {
            await router.refresh();
        });
    };

    const emptyState = (
        <div className="mt-6 rounded-lg border border-dashed border-neutral-200 bg-neutral-50 p-6 text-sm text-neutral-500">
            Aún no se registran categorías de gasto. Crea la primera para organizar tus desembolsos operativos.
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-xl font-semibold">Categorías de gastos operativos</h2>
                    <p className="text-sm text-muted-foreground">
                        Organiza los gastos por tipo, asigna centros de costos por defecto y deja ejemplos para el equipo.
                    </p>
                </div>
                <Button onClick={() => setDialogOpen(true)} disabled={isRefreshing}>
                    Nueva categoría
                </Button>
            </div>

            {categories.length === 0 ? (
                emptyState
            ) : (
                <div className="space-y-8">
                    {groupedCategories.map((group) => (
                        <section key={group.groupName} className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
                                        {group.groupName}
                                    </h2>
                                    <Badge variant="secondary">{group.categories.length} categorías</Badge>
                                </div>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {group.categories.map((category) => (
                                    <article
                                        key={category.id}
                                        className="flex h-full flex-col rounded-lg border border-neutral-200 bg-white p-4 shadow-sm"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <h3 className="text-base font-semibold text-neutral-900">{category.name}</h3>
                                                <p className="text-xs uppercase tracking-wide text-neutral-400">{category.code}</p>
                                            </div>
                                            {category.groupName && <Badge variant="info">{category.groupName}</Badge>}
                                        </div>

                                        {category.description && (
                                            <p className="mt-3 text-sm text-neutral-600">{category.description}</p>
                                        )}

                                        <dl className="mt-4 space-y-2 text-sm text-neutral-600">
                                            {category.defaultCostCenter && (
                                                <div>
                                                    <dt className="font-medium text-neutral-500">Centro de costos por defecto</dt>
                                                    <dd>
                                                        {category.defaultCostCenter.name} ({category.defaultCostCenter.code})
                                                    </dd>
                                                </div>
                                            )}
                                            {category.examples.length > 0 && (
                                                <div>
                                                    <dt className="font-medium text-neutral-500">Ejemplos</dt>
                                                    <dd>
                                                        <ul className="list-disc pl-5 text-neutral-600">
                                                            {category.examples.map((example) => (
                                                                <li key={example}>{example}</li>
                                                            ))}
                                                        </ul>
                                                    </dd>
                                                </div>
                                            )}
                                        </dl>

                                        <p className="mt-auto pt-4 text-xs text-neutral-400">
                                            Última actualización: {formatDate(category.updatedAt)}
                                        </p>
                                    </article>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            )}

            <OperatingExpenseCategoryDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                onSuccess={(category) => {
                    handleDialogSuccess();
                    setDialogOpen(false);
                }}
                costCenters={costCenters}
                groupNames={groupNames}
            />
        </div>
    );
}
