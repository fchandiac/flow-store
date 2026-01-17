'use client';

import { useCallback, useEffect, useState } from 'react';
import moment from 'moment';
import DataGrid, { type DataGridColumn } from '@/app/baseComponents/DataGrid/DataGrid';
import Badge, { type BadgeVariant } from '@/app/baseComponents/Badge/Badge';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import { getReceptions, type ReceptionListItem } from '@/app/actions/receptions';
import { TransactionStatus, TransactionType } from '@/data/entities/Transaction';
import CancelReceptionDialog from './CancelReceptionDialog';
import ReceptionDetailsDialog from './ReceptionDetailsDialog';

const currencyFormatter = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

const statusLabels: Record<TransactionStatus, string> = {
    [TransactionStatus.DRAFT]: 'Borrador',
    [TransactionStatus.CONFIRMED]: 'Confirmada',
    [TransactionStatus.PARTIALLY_RECEIVED]: 'Parcialmente Recibida',
    [TransactionStatus.RECEIVED]: 'Recibida',
    [TransactionStatus.CANCELLED]: 'Cancelada',
};

const statusColors: Record<TransactionStatus, BadgeVariant> = {
    [TransactionStatus.DRAFT]: 'warning',
    [TransactionStatus.CONFIRMED]: 'success',
    [TransactionStatus.PARTIALLY_RECEIVED]: 'info',
    [TransactionStatus.RECEIVED]: 'success',
    [TransactionStatus.CANCELLED]: 'error',
};

const movementLabels: Partial<Record<TransactionType, string>> = {
    [TransactionType.PURCHASE]: 'Recepción',
    [TransactionType.PURCHASE_RETURN]: 'Anulación',
};

const movementColors: Partial<Record<TransactionType, BadgeVariant>> = {
    [TransactionType.PURCHASE]: 'info',
    [TransactionType.PURCHASE_RETURN]: 'error',
};

export default function ReceptionsDataGrid() {
    const [data, setData] = useState<ReceptionListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<Record<string, any>>({});
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [selectedReception, setSelectedReception] = useState<ReceptionListItem | null>(null);
    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
    const [detailsReception, setDetailsReception] = useState<ReceptionListItem | null>(null);

    const loadReceptions = useCallback(async () => {
        setLoading(true);
        try {
            const result = await getReceptions({
                search: filters.search,
                supplierId: filters.supplierId,
                storageId: filters.storageId,
                limit: filters.limit ?? 25,
            });
            setData(result);
        } catch (error) {
            console.error('Error loading receptions:', error);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        loadReceptions();
    }, [loadReceptions]);

    useEffect(() => {
        if (!detailsReception) {
            return;
        }
        const updated = data.find((item) => item.id === detailsReception.id);
        if (updated && updated !== detailsReception) {
            setDetailsReception(updated);
        }
    }, [data, detailsReception]);

    const handleOpenCancel = useCallback((reception: ReceptionListItem) => {
        if (reception.transactionType !== TransactionType.PURCHASE) {
            return;
        }
        setSelectedReception(reception);
        setCancelDialogOpen(true);
    }, []);

    const handleCloseCancel = useCallback(() => {
        setCancelDialogOpen(false);
        setSelectedReception(null);
    }, []);

    const handleReceptionCancelled = useCallback(async () => {
        await loadReceptions();
    }, [loadReceptions]);

    const handleOpenDetails = useCallback((reception: ReceptionListItem) => {
        setDetailsReception(reception);
        setDetailsDialogOpen(true);
    }, []);

    const handleCloseDetails = useCallback(() => {
        setDetailsDialogOpen(false);
        setDetailsReception(null);
    }, []);

    const columns: DataGridColumn[] = [
        {
            field: 'transactionType',
            headerName: 'Movimiento',
            flex: 0.8,
            renderCell: (params) => {
                const type = params.row.transactionType as TransactionType;
                const variant = movementColors[type] ?? 'secondary';
                return (
                    <Badge variant={variant}>
                        {movementLabels[type] ?? 'Movimiento'}
                    </Badge>
                );
            },
        },
        {
            field: 'documentNumber',
            headerName: 'Folio',
            flex: 0.8,
            renderCell: (params) => (
                <div className="flex flex-col">
                    <div className="font-mono text-sm font-medium">
                        {params.row.documentNumber}
                    </div>
                    {params.row.transactionType === TransactionType.PURCHASE_RETURN && params.row.cancelsDocumentNumber ? (
                        <div className="text-xs text-gray-500">
                            Anula {params.row.cancelsDocumentNumber}
                        </div>
                    ) : null}
                    {params.row.transactionType === TransactionType.PURCHASE && params.row.cancelledByDocumentNumber ? (
                        <div className="text-xs text-gray-500">
                            Anulada por {params.row.cancelledByDocumentNumber}
                        </div>
                    ) : null}
                </div>
            ),
        },
        {
            field: 'createdAt',
            headerName: 'Fecha',
            flex: 1,
            renderCell: (params) => (
                <div className="text-sm text-gray-600">
                    {moment(params.row.createdAt).format('DD-MM-YYYY HH:mm')}
                </div>
            ),
        },
        {
            field: 'supplierName',
            headerName: 'Proveedor',
            flex: 1.4,
            renderCell: (params) => (
                <div className="text-sm font-medium text-gray-900">
                    {params.row.supplierName ?? 'Sin proveedor'}
                </div>
            ),
        },
        {
            field: 'storageName',
            headerName: 'Almacén',
            flex: 1,
            renderCell: (params) => (
                <div className="text-sm text-gray-600">{params.row.storageName ?? 'Sin almacén'}</div>
            ),
        },
        {
            field: 'purchaseOrderNumber',
            headerName: 'Orden de Compra',
            flex: 0.9,
            renderCell: (params) =>
                params.row.purchaseOrderNumber ? (
                    <div className="font-mono text-sm text-blue-600">{params.row.purchaseOrderNumber}</div>
                ) : (
                    <Badge variant="secondary">
                        Directa
                    </Badge>
                ),
        },
        {
            field: 'lineCount',
            headerName: 'Productos',
            flex: 0.6,
            align: 'center',
            renderCell: (params) => <div className="text-sm font-medium">{params.row.lineCount}</div>,
        },
        {
            field: 'total',
            headerName: 'Total',
            flex: 0.8,
            align: 'right',
            renderCell: (params) => (
                <div className="text-sm font-semibold text-gray-900">
                    {currencyFormatter.format(params.row.total)}
                </div>
            ),
        },
        {
            field: 'status',
            headerName: 'Estado',
            flex: 0.7,
            renderCell: (params) => {
                const status = params.row.status as TransactionStatus;
                return (
                    <Badge variant={statusColors[status] ?? 'secondary'}>
                        {statusLabels[status] ?? status}
                    </Badge>
                );
            },
        },
        // {
        //     field: 'hasDiscrepancies',
        //     headerName: 'Discrepancias',
        //     flex: 0.8,
        //     renderCell: (params) =>
        //         params.row.hasDiscrepancies ? (
        //             <Badge variant="warning">
        //                 Con diferencias
        //             </Badge>
        //         ) : (
        //             <Badge variant="success">
        //                 Sin diferencias
        //             </Badge>
        //         ),
        // },
        // {
        //     field: 'userName',
        //     headerName: 'Usuario',
        //     flex: 0.8,
        //     renderCell: (params) => <div className="text-sm text-gray-600">{params.row.userName ?? '-'}</div>,
        // },
        {
            field: 'actions',
            headerName: '',
            flex: 0.5,
            align: 'right',
            sortable: false,
            renderCell: (params) => {
                const status = params.row.status as TransactionStatus;
                const type = params.row.transactionType as TransactionType;
                const disabled = status === TransactionStatus.CANCELLED || type !== TransactionType.PURCHASE;
                return (
                    <div className="flex items-center justify-end gap-1">
                        <IconButton
                            icon="more_horiz"
                            variant="ghost"
                            size="sm"
                            ariaLabel="Ver detalles"
                            title="Ver detalles"
                            onClick={() => handleOpenDetails(params.row)}
                        />
                        <IconButton
                            icon="delete"
                            variant="ghost"
                            size="sm"
                            ariaLabel={disabled ? 'Sin acciones disponibles' : 'Anular recepción'}
                            title={disabled ? 'Sin acciones disponibles' : 'Anular recepción'}
                            onClick={() => handleOpenCancel(params.row)}
                            disabled={disabled}
                        />
                    </div>
                );
            },
        },
    ];

    return (
        <div className="h-full flex flex-col bg-gray-50">
            <DataGrid
                columns={columns}
                rows={data}
                title="Recepciones"
                search=""
                totalRows={data.length}
            />
            <CancelReceptionDialog
                open={cancelDialogOpen}
                reception={selectedReception}
                onClose={handleCloseCancel}
                onCancelled={handleReceptionCancelled}
            />
            <ReceptionDetailsDialog
                open={detailsDialogOpen}
                reception={detailsReception}
                onClose={handleCloseDetails}
            />
        </div>
    );
}
