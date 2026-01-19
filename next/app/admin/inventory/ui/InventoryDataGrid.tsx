'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DataGrid, { type DataGridColumn } from '@/app/baseComponents/DataGrid/DataGrid';
import Badge from '@/app/baseComponents/Badge/Badge';
import DotProgress from '@/app/baseComponents/DotProgress/DotProgress';
import Select, { type Option as SelectOption } from '@/app/baseComponents/Select/Select';
import { useAlert } from '@/app/globalstate/alert/useAlert';
import {
    getInventoryFilters,
    getInventoryStock,
    type InventoryFiltersDTO,
    type InventoryRowDTO,
} from '@/app/actions/inventory';

const quantityFormatter = new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
});

const currencyFormatter = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

const dateTimeFormatter = new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'short',
    timeStyle: 'short',
});

type HeaderFilterOptions = Pick<InventoryFiltersDTO, 'branches' | 'storages'>;

const formatAttributeValues = (attributes?: Record<string, string> | null) => {
    if (!attributes) return '';
    const values = Object.values(attributes).filter(Boolean);
    if (values.length === 0) return '';
    return values.join(' · ');
};

const formatQuantity = (value: number) => quantityFormatter.format(Number(value || 0));

const formatCurrency = (value: number) => currencyFormatter.format(Number(value || 0));

const formatDateTime = (iso?: string | null) => {
    if (!iso) return '-';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '-';
    return dateTimeFormatter.format(date);
};

const buildSelectOptions = (items: { id: string; name: string }[]): SelectOption[] =>
    items.map((item) => ({ id: item.id, label: item.name }));

const deriveStatusVariant = (row: InventoryRowDTO) => {
    if (row.isBelowMinimum) {
        return { label: 'Bajo mínimo', variant: 'error' as const };
    }
    if (row.isBelowReorder) {
        return { label: 'Reordenar', variant: 'warning' as const };
    }
    return { label: 'Saludable', variant: 'success' as const };
};

const InventoryDataGrid = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { error } = useAlert();

    const [rows, setRows] = useState<InventoryRowDTO[]>([]);
    const [filters, setFilters] = useState<HeaderFilterOptions>({ branches: [], storages: [] });
    const [loading, setLoading] = useState(false);

    const search = searchParams.get('search') ?? '';
    const branchId = searchParams.get('branchId') ?? '';
    const storageId = searchParams.get('storageId') ?? '';

    const branchOptions = useMemo(() => buildSelectOptions(filters.branches), [filters.branches]);

    const storageOptions = useMemo(() => {
        if (!branchId) {
            return filters.storages.map((storage) => ({ id: storage.id, label: storage.name }));
        }
        return filters.storages
            .filter((storage) => storage.branchId === branchId)
            .map((storage) => ({ id: storage.id, label: storage.name }));
    }, [filters.storages, branchId]);

    const handleBranchChange = useCallback(
        (value: string | number | null) => {
            const params = new URLSearchParams(searchParams.toString());

            if (value) {
                params.set('branchId', String(value));
                const selectedStorage = filters.storages.find((storage) => storage.id === storageId);
                if (selectedStorage && selectedStorage.branchId !== String(value)) {
                    params.delete('storageId');
                }
            } else {
                params.delete('branchId');
            }

            router.replace(`?${params.toString()}`, { scroll: false });
        },
        [router, searchParams, filters.storages, storageId],
    );

    const handleStorageChange = useCallback(
        (value: string | number | null) => {
            const params = new URLSearchParams(searchParams.toString());
            if (value) {
                params.set('storageId', String(value));
            } else {
                params.delete('storageId');
            }
            router.replace(`?${params.toString()}`, { scroll: false });
        },
        [router, searchParams],
    );

    const loadFilters = useCallback(async () => {
        try {
            const data = await getInventoryFilters();
            setFilters({ branches: data.branches, storages: data.storages });
        } catch (err) {
            console.error('Error loading inventory filters', err);
            error('No fue posible cargar los filtros de inventario');
        }
    }, [error]);

    const loadRows = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getInventoryStock({
                search: search || undefined,
                branchId: branchId || undefined,
                storageId: storageId || undefined,
            });
            setRows(data);
        } catch (err) {
            console.error('Error loading inventory stock', err);
            error('No fue posible cargar el inventario');
        } finally {
            setLoading(false);
        }
    }, [search, branchId, storageId, error]);

    useEffect(() => {
        loadFilters();
    }, [loadFilters]);

    useEffect(() => {
        loadRows();
    }, [loadRows]);

    const headerActions = useMemo(() => (
        <div className="flex items-end gap-4">
            <div className="w-48 flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Sucursal
                </span>
                <Select
                    placeholder="Selecciona"
                    aria-label="Filtro por sucursal"
                    options={branchOptions}
                    value={branchId || null}
                    onChange={handleBranchChange}
                    allowClear
                    variant="minimal"
                />
            </div>
            <div className="w-48 flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Bodega
                </span>
                <Select
                    placeholder="Selecciona"
                    aria-label="Filtro por bodega"
                    options={storageOptions}
                    value={storageId || null}
                    onChange={handleStorageChange}
                    allowClear
                    variant="minimal"
                    disabled={!storageOptions.length}
                />
            </div>
            {loading && <DotProgress size={10} totalSteps={3} />}
        </div>
    ), [branchOptions, storageOptions, branchId, storageId, handleBranchChange, handleStorageChange, loading]);

    const columns: DataGridColumn[] = useMemo(() => [
        {
            field: 'productName',
            headerName: 'Producto',
            flex: 2,
            minWidth: 240,
            renderCell: ({ row }) => {
                const variantRow = row as InventoryRowDTO;
                const attributeText = formatAttributeValues(variantRow.attributeValues);
                return (
                    <div className="flex flex-col">
                        <span className="font-medium text-foreground">{variantRow.productName}</span>
                        <span className="text-xs text-muted-foreground">
                            SKU {variantRow.sku} · {variantRow.unitOfMeasure}
                        </span>
                        {attributeText && (
                            <span className="text-xs text-muted-foreground">{attributeText}</span>
                        )}
                    </div>
                );
            },
        },
        {
            field: 'totalStock',
            headerName: 'Stock',
            width: 110,
            align: 'left',
            headerAlign: 'left',
            renderCell: ({ value }) => <span className="font-semibold">{formatQuantity(Number(value || 0))}</span>,
        },
        {
            field: 'availableStock',
            headerName: 'Disponible',
            width: 120,
            align: 'left',
            headerAlign: 'left',
            renderCell: ({ value }) => formatQuantity(Number(value || 0)),
        },
        {
            field: 'minimumStock',
            headerName: 'Mínimo',
            width: 100,
            align: 'left',
            headerAlign: 'left',
            renderCell: ({ value }) => formatQuantity(Number(value || 0)),
        },
        {
            field: 'reorderPoint',
            headerName: 'Reorden',
            width: 110,
            align: 'left',
            headerAlign: 'left',
            renderCell: ({ value }) => formatQuantity(Number(value || 0)),
        },
        {
            field: 'inventoryValueCost',
            headerName: 'Valor costo',
            width: 130,
            align: 'left',
            headerAlign: 'left',
            renderCell: ({ value }) => formatCurrency(Number(value || 0)),
        },
        {
            field: 'primaryStorageName',
            headerName: 'Bodega principal',
            minWidth: 160,
            renderCell: ({ row }) => {
                const variantRow = row as InventoryRowDTO;
                if (!variantRow.primaryStorageName) return '-';
                return (
                    <div className="flex flex-col">
                        <span className="text-sm text-foreground">{variantRow.primaryStorageName}</span>
                        <span className="text-xs text-muted-foreground">{formatQuantity(variantRow.primaryStorageQuantity ?? 0)}</span>
                    </div>
                );
            },
        },
        {
            field: 'lastMovementAt',
            headerName: 'Último movimiento',
            minWidth: 160,
            renderCell: ({ row }) => {
                const variantRow = row as InventoryRowDTO;
                const label = formatDateTime(variantRow.lastMovementAt);
                if (label === '-') return label;
                const directionLabel = variantRow.lastMovementDirection === 'IN' ? 'Ingreso' : variantRow.lastMovementDirection === 'OUT' ? 'Salida' : '';
                return (
                    <div className="flex flex-col">
                        <span className="text-sm text-foreground">{label}</span>
                        {variantRow.lastMovementType && (
                            <span className="text-xs text-muted-foreground">{directionLabel || variantRow.lastMovementType}</span>
                        )}
                    </div>
                );
            },
        },
        {
            field: 'status',
            headerName: 'Estado',
            width: 120,
            align: 'left',
            headerAlign: 'left',
            sortable: false,
            renderCell: ({ row }) => {
                const variantRow = row as InventoryRowDTO;
                const status = deriveStatusVariant(variantRow);
                return <Badge variant={status.variant}>{status.label}</Badge>;
            },
        },
    ], []);

    const renderExpandedRow = useCallback((row: InventoryRowDTO) => (
        <div className="space-y-6">
            <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Stock por bodega
                </div>
                {row.storageBreakdown.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {row.storageBreakdown.map((entry) => (
                            <div key={entry.storageId} className="border border-border rounded-md bg-background p-3 flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-foreground">{entry.storageName}</span>
                                    {entry.branchName && (
                                        <span className="text-xs text-muted-foreground">Sucursal: {entry.branchName}</span>
                                    )}
                                </div>
                                <span className="text-sm font-semibold">{formatQuantity(entry.quantity)}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">Sin stock registrado en bodegas.</p>
                )}
            </div>

            <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Últimos movimientos
                </div>
                {row.movements.length > 0 ? (
                    <div className="space-y-2">
                        {row.movements.map((movement) => (
                            <div key={`${movement.transactionId}-${movement.createdAt}`} className="border border-border rounded-md bg-background p-3 flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-foreground">{movement.documentNumber}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {movement.transactionType} · {formatDateTime(movement.createdAt)}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {movement.storageName || 'Sin bodega'}
                                            {movement.targetStorageName ? ` → ${movement.targetStorageName}` : ''}
                                        </span>
                                        {movement.notes && (
                                            <span className="text-xs text-muted-foreground mt-1 truncate">{movement.notes}</span>
                                        )}
                                    </div>
                                </div>
                                <Badge variant={movement.direction === 'IN' ? 'success' : 'error'}>
                                    {movement.direction === 'IN' ? '+' : '-'}
                                    {formatQuantity(movement.quantity)}
                                </Badge>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">Sin movimientos registrados.</p>
                )}
            </div>
        </div>
    ), []);

    return (
        <DataGrid
            title="Inventario de variantes"
            columns={columns}
            rows={rows}
            totalRows={rows.length}
            height="80vh"
            expandable
            expandableRowContent={renderExpandedRow}
            headerActions={headerActions}
            data-test-id="inventory-grid"
        />
    );
};

export default InventoryDataGrid;
