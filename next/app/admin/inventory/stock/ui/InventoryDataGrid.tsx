// Definir HeaderFilterOptions para filtros de inventario
type HeaderFilterOptions = Pick<InventoryFiltersDTO, 'branches' | 'storages'>;
'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DataGrid, { type DataGridColumn } from '@/app/baseComponents/DataGrid/DataGrid';
import Badge from '@/app/baseComponents/Badge/Badge';
import DotProgress from '@/app/baseComponents/DotProgress/DotProgress';
import Select, { type Option as SelectOption } from '@/app/baseComponents/Select/Select';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import { Button } from '@/app/baseComponents/Button/Button';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import Alert from '@/app/baseComponents/Alert/Alert';
import { useAlert } from '@/app/globalstate/alert/useAlert';
import { translateTransactionType } from '@/lib/auditTranslations';
import {
    getInventoryFilters,
    getInventoryStock,
    adjustVariantStockLevel,
    transferVariantStock,
    type InventoryFiltersDTO,
    type InventoryRowDTO,
    type InventoryStorageBreakdown,
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

const formatAttributeValues = (attributes?: Record<string, string> | null) => {
    if (!attributes) return '';
    const values = Object.values(attributes).filter(Boolean);
    if (values.length === 0) return '';
    return values.join(' · ');
};

const formatQuantity = (value: number) => quantityFormatter.format(Number(value || 0));

const formatCurrency = (value: number) => currencyFormatter.format(Number(value || 0));

const parseNumberInput = (value: string) => {
    if (!value) return Number.NaN;
    const normalized = value.trim().replace(/\s+/g, '').replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const pad = (value: number) => value.toString().padStart(2, '0');

const formatDateTime = (iso?: string | null) => {
    if (!iso) return '-';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '-';
    const day = pad(date.getDate());
    const month = pad(date.getMonth() + 1);
    const year = date.getFullYear();
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${day}-${month}-${year} ${hours}:${minutes}`;
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
    const { success, error } = useAlert();

    const [rows, setRows] = useState<InventoryRowDTO[]>([]);
    const [filters, setFilters] = useState<HeaderFilterOptions>({ branches: [], storages: [] });
    const [loading, setLoading] = useState(false);
    const [dialogState, setDialogState] = useState<{ variant: InventoryRowDTO; storage: InventoryStorageBreakdown } | null>(null);
    const [dialogMode, setDialogMode] = useState<'transfer' | 'adjust'>('transfer');
    const [transferTargetId, setTransferTargetId] = useState<string | null>(null);
    const [transferQuantity, setTransferQuantity] = useState('');
    const [adjustQuantity, setAdjustQuantity] = useState('');
    const [note, setNote] = useState('');
    const [actionError, setActionError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleOpenDialog = useCallback(
        (variant: InventoryRowDTO, storage: InventoryStorageBreakdown, mode: 'transfer' | 'adjust') => {
            setDialogState({ variant, storage });
            setDialogMode(mode);
            setTransferTargetId(null);
            setTransferQuantity('');
            setAdjustQuantity(mode === 'adjust' ? String(storage.quantity ?? 0) : '');
            setNote('');
            setActionError(null);
            setIsSubmitting(false);
        },
        [],
    );

    const handleCloseDialog = useCallback(() => {
        setDialogState(null);
        setDialogMode('transfer');
        setTransferTargetId(null);
        setTransferQuantity('');
        setAdjustQuantity('');
        setNote('');
        setActionError(null);
    }, []);

    const transferTargetOptions = useMemo(() => {
        if (!dialogState || dialogMode !== 'transfer') {
            return [] as SelectOption[];
        }

        return filters.storages
            .filter((storage) => storage.id !== dialogState.storage.storageId)
            .map((storage) => ({
                id: storage.id,
                label: storage.branchName ? `${storage.name} · ${storage.branchName}` : storage.name,
            }));
    }, [dialogState, dialogMode, filters.storages]);

    const search = searchParams.get('search') ?? '';
    const branchId = searchParams.get('branchId') ?? '';
    const storageId = searchParams.get('storageId') ?? '';

    const branchOptions = useMemo(() => buildSelectOptions(filters.branches), [filters.branches]);

    const storageOptions = useMemo(() => {
        if (!branchId) {
            return filters.storages.map((storage: { id: string; name: string }) => ({ id: storage.id, label: storage.name }));
        }
        return filters.storages
            .filter((storage: { branchId?: string | null }) => String(storage.branchId ?? '') === branchId)
            .map((storage: { id: string; name: string }) => ({ id: storage.id, label: storage.name }));
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

    const handleDialogSubmit = useCallback(
        async (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            if (!dialogState) {
                return;
            }

            setIsSubmitting(true);
            setActionError(null);

            let shouldClose = false;
            let shouldReload = false;

            try {
                const trimmedNote = note.trim();
                const noteValue = trimmedNote.length > 0 ? trimmedNote : undefined;

                if (dialogMode === 'transfer') {
                    const parsedQuantity = parseNumberInput(transferQuantity);

                    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
                        setActionError('La cantidad a transferir debe ser mayor que cero.');
                        return;
                    }

                    if (!transferTargetId) {
                        setActionError('Selecciona un almacén de destino.');
                        return;
                    }

                    if (parsedQuantity - dialogState.storage.quantity > 1e-6) {
                        setActionError('No puedes transferir más stock del disponible en este almacén.');
                        return;
                    }

                    const result = await transferVariantStock({
                        variantId: dialogState.variant.id,
                        sourceStorageId: dialogState.storage.storageId,
                        targetStorageId: String(transferTargetId),
                        quantity: parsedQuantity,
                        note: noteValue,
                    });

                    if (!result.success) {
                        const message = result.error || 'No se pudo completar la transferencia de stock.';
                        setActionError(message);
                        error(message);
                        return;
                    }

                    const documentSuffix = result.documentNumbers?.length
                        ? ` Documentos: ${result.documentNumbers.join(', ')}.`
                        : '';

                    success(`Transferencia registrada correctamente.${documentSuffix}`.trim());
                    shouldClose = true;
                    shouldReload = true;
                } else {
                    const parsedTarget = parseNumberInput(adjustQuantity);

                    if (!Number.isFinite(parsedTarget) || parsedTarget < 0) {
                        setActionError('El nuevo stock debe ser un número mayor o igual a cero.');
                        return;
                    }

                    const result = await adjustVariantStockLevel({
                        variantId: dialogState.variant.id,
                        storageId: dialogState.storage.storageId,
                        currentQuantity: dialogState.storage.quantity,
                        targetQuantity: parsedTarget,
                        note: noteValue,
                    });

                    if (!result.success) {
                        const message = result.error || 'No se pudo registrar el ajuste de stock.';
                        setActionError(message);
                        error(message);
                        return;
                    }

                    const baseMessage = result.message ?? 'Ajuste de stock registrado correctamente.';
                    const documentSuffix = result.documentNumbers?.length
                        ? ` Documentos: ${result.documentNumbers.join(', ')}.`
                        : '';

                    success(`${baseMessage}${documentSuffix}`.trim());
                    shouldClose = true;
                    shouldReload = true;
                }

                if (shouldReload) {
                    await loadRows();
                }
            } catch (err) {
                console.error('Error ejecutando acción de inventario', err);
                const fallback = dialogMode === 'transfer'
                    ? 'Ocurrió un error al transferir stock.'
                    : 'Ocurrió un error al ajustar el stock.';
                setActionError(fallback);
                error(fallback);
            } finally {
                setIsSubmitting(false);
                if (shouldClose) {
                    handleCloseDialog();
                }
            }
        },
        [dialogState, dialogMode, transferQuantity, transferTargetId, adjustQuantity, note, loadRows, error, success, handleCloseDialog],
    );

    useEffect(() => {
        loadFilters();
    }, [loadFilters]);

    useEffect(() => {
        loadRows();
    }, [loadRows]);

    const headerActions = useMemo(() => (
        <div className="flex items-center gap-4">
            <div className="w-48">
                <Select
                    label="Sucursal"
                    options={branchOptions}
                    value={branchId || null}
                    onChange={handleBranchChange}
                    allowClear
                    variant="minimal"
                />
            </div>
            <div className="w-48">
                <Select
                    label="Almacén"
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
            headerName: 'Almacén principal',
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

    const renderExpandedRow = (row: InventoryRowDTO) => (
        <div className="space-y-6">
            <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Stock por almacén
                </div>
                {row.storageBreakdown.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {row.storageBreakdown.map((entry) => {
                            const hasTargetStorage = filters.storages.some((storage) => storage.id !== entry.storageId);
                            const canTransfer = entry.quantity > 1e-6;

                            return (
                                <div key={entry.storageId} className="border border-border rounded-md bg-background p-3 space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-foreground">{entry.storageName}</span>
                                            {entry.branchName && (
                                                <span className="text-xs text-muted-foreground">Sucursal: {entry.branchName}</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <IconButton
                                                icon="sync_alt"
                                                variant="basicSecondary"
                                                size="xs"
                                                disabled={!canTransfer}
                                                ariaLabel="Transferir stock a otro almacén"
                                                title={canTransfer ? (hasTargetStorage ? 'Transferir stock' : 'No hay almacenes de destino disponibles') : 'No hay stock disponible para transferir'}
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    if (canTransfer) {
                                                        handleOpenDialog(row, entry, 'transfer');
                                                    }
                                                }}
                                            />
                                            <IconButton
                                                icon="tune"
                                                variant="basicSecondary"
                                                size="xs"
                                                ariaLabel="Ajustar stock del almacén"
                                                title="Ajustar stock"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    handleOpenDialog(row, entry, 'adjust');
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Stock</span>
                                        <span className="font-semibold">{formatQuantity(entry.quantity)}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">Sin stock registrado en almacenes.</p>
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
                                            {translateTransactionType(movement.transactionType)} · {formatDateTime(movement.createdAt)}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {(() => {
                                                const sourceLabel = movement.direction === 'IN'
                                                    ? movement.targetStorageName
                                                    : movement.storageName;
                                                const destinationLabel = movement.direction === 'IN'
                                                    ? movement.storageName
                                                    : movement.targetStorageName;

                                                if (sourceLabel && destinationLabel) {
                                                    return `${sourceLabel} → ${destinationLabel}`;
                                                }

                                                return sourceLabel || destinationLabel || 'Sin almacén';
                                            })()}
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
    );

    const dialogVariant = dialogState?.variant;
    const dialogStorage = dialogState?.storage;
    const dialogTitle = dialogMode === 'transfer' ? 'Transferir stock' : 'Ajustar stock';
    const variantAttributes = dialogVariant ? formatAttributeValues(dialogVariant.attributeValues) : '';
    const currentQuantityLabel = dialogStorage ? formatQuantity(dialogStorage.quantity) : '0';
    const hasTransferTargets = dialogMode === 'transfer' ? transferTargetOptions.length > 0 : true;

    return (
        <>
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

            {dialogVariant && dialogStorage && (
                <Dialog
                    open={Boolean(dialogState)}
                    onClose={() => {
                        if (!isSubmitting) {
                            handleCloseDialog();
                        }
                    }}
                    title={dialogTitle}
                    size="md"
                    scroll="paper"
                    disableBackdropClick={isSubmitting}
                    persistent={isSubmitting}
                >
                    <form onSubmit={handleDialogSubmit} className="space-y-5">
                        <div className="rounded-md border border-border bg-muted/20 p-4 text-sm space-y-1">
                            <div className="font-medium text-foreground">{dialogVariant.productName}</div>
                            <div className="text-xs text-muted-foreground">SKU {dialogVariant.sku}</div>
                            {variantAttributes && (
                                <div className="text-xs text-muted-foreground">{variantAttributes}</div>
                            )}
                            <div className="text-xs text-muted-foreground">
                                Almacén: {dialogStorage.storageName}
                                {dialogStorage.branchName ? ` · ${dialogStorage.branchName}` : ''}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Stock actual: {currentQuantityLabel} {dialogVariant.unitOfMeasure}
                            </div>
                        </div>

                        {actionError && (
                            <Alert variant="error">{actionError}</Alert>
                        )}

                        {dialogMode === 'transfer' ? (
                            <div className="space-y-4">
                                <TextField
                                    label="Cantidad a transferir"
                                    value={transferQuantity}
                                    onChange={(event) => {
                                        if (actionError) {
                                            setActionError(null);
                                        }
                                        setTransferQuantity(event.target.value);
                                    }}
                                    required
                                    inputMode="decimal"
                                    type="number"
                                    min="0"
                                    step="0.001"
                                />
                                {!hasTransferTargets && (
                                    <Alert variant="info">
                                        No hay almacenes de destino activos disponibles para esta transferencia.
                                    </Alert>
                                )}
                                <Select
                                    label="Almacén destino"
                                    options={transferTargetOptions}
                                    value={transferTargetId}
                                    onChange={(value) => {
                                        if (actionError) {
                                            setActionError(null);
                                        }
                                        if (typeof value === 'string' || typeof value === 'number') {
                                            setTransferTargetId(String(value));
                                        } else {
                                            setTransferTargetId(null);
                                        }
                                    }}
                                    required
                                    disabled={!hasTransferTargets}
                                />
                            </div>
                        ) : (
                            <TextField
                                label="Nuevo stock en almacén"
                                value={adjustQuantity}
                                onChange={(event) => {
                                    if (actionError) {
                                        setActionError(null);
                                    }
                                    setAdjustQuantity(event.target.value);
                                }}
                                required
                                inputMode="decimal"
                                type="number"
                                min="0"
                                step="0.001"
                            />
                        )}

                        <TextField
                            label="Nota (opcional)"
                            value={note}
                            onChange={(event) => {
                                if (actionError) {
                                    setActionError(null);
                                }
                                setNote(event.target.value);
                            }}
                            type="textarea"
                            rows={3}
                        />

                        <div className="flex justify-end gap-3 pt-2">
                            <Button
                                variant="text"
                                type="button"
                                onClick={() => {
                                    if (!isSubmitting) {
                                        handleCloseDialog();
                                    }
                                }}
                                disabled={isSubmitting}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                loading={isSubmitting}
                                disabled={isSubmitting || !hasTransferTargets}
                            >
                                {dialogMode === 'transfer' ? 'Transferir' : 'Guardar ajuste'}
                            </Button>
                        </div>
                    </form>
                </Dialog>
            )}
        </>
    );
};

export default InventoryDataGrid;
