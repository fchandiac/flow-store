'use client';

import { useMemo } from 'react';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import { Button } from '@/app/baseComponents/Button/Button';
import Badge, { type BadgeVariant } from '@/app/baseComponents/Badge/Badge';
import type { ReceptionListItem } from '@/app/actions/receptions';
import { TransactionStatus, TransactionType } from '@/data/entities/Transaction';
import { formatDateTime } from '@/lib/dateTimeUtils';

interface ReceptionDetailsDialogProps {
    open: boolean;
    reception: ReceptionListItem | null;
    onClose: () => void;
}

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

export function ReceptionDetailsDialog({ open, reception, onClose }: ReceptionDetailsDialogProps) {
    const formattedDate = useMemo(() => {
        if (!reception) {
            return '';
        }
        try {
            return formatDateTime(reception.createdAt);
        } catch (error) {
            return reception.createdAt;
        }
    }, [reception]);

    const movementLabel = useMemo(() => {
        if (!reception) {
            return '';
        }
        return movementLabels[reception.transactionType] ?? reception.transactionType;
    }, [reception]);

    const movementColor = useMemo<BadgeVariant>(() => {
        if (!reception) {
            return 'secondary';
        }
        return movementColors[reception.transactionType] ?? 'secondary';
    }, [reception]);

    const statusVariant = useMemo<BadgeVariant>(() => {
        if (!reception) {
            return 'secondary';
        }
        return statusColors[reception.status] ?? 'secondary';
    }, [reception]);

    return (
        <Dialog open={open} onClose={onClose} title="Detalle de transacción" size="md">
            {!reception ? (
                <div className="py-8 text-center text-sm text-neutral-500">
                    Selecciona una recepción para ver los detalles.
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <p className="text-xs uppercase text-muted-foreground">Movimiento</p>
                            <Badge variant={movementColor}>{movementLabel}</Badge>
                        </div>
                        <div>
                            <p className="text-xs uppercase text-muted-foreground">Estado</p>
                            <Badge variant={statusVariant}>{statusLabels[reception.status] ?? reception.status}</Badge>
                        </div>
                        <div>
                            <p className="text-xs uppercase text-muted-foreground">Folio</p>
                            <p className="font-mono text-sm font-semibold text-foreground">{reception.documentNumber}</p>
                        </div>
                        <div>
                            <p className="text-xs uppercase text-muted-foreground">Fecha</p>
                            <p className="text-sm text-foreground">{formattedDate}</p>
                        </div>
                        <div>
                            <p className="text-xs uppercase text-muted-foreground">Proveedor</p>
                            <p className="text-sm text-foreground">{reception.supplierName ?? 'Sin proveedor'}</p>
                        </div>
                        <div>
                            <p className="text-xs uppercase text-muted-foreground">Almacén</p>
                            <p className="text-sm text-foreground">{reception.storageName ?? 'Sin almacén'}</p>
                        </div>
                        <div>
                            <p className="text-xs uppercase text-muted-foreground">Usuario</p>
                            <p className="text-sm text-foreground">{reception.userName ?? '—'}</p>
                        </div>
                        <div>
                            <p className="text-xs uppercase text-muted-foreground">Productos registrados</p>
                            <p className="text-sm text-foreground">{reception.lineCount}</p>
                        </div>
                        <div>
                            <p className="text-xs uppercase text-muted-foreground">Subtotal</p>
                            <p className="text-sm font-semibold text-foreground">{currencyFormatter.format(reception.subtotal)}</p>
                        </div>
                        <div>
                            <p className="text-xs uppercase text-muted-foreground">Total</p>
                            <p className="text-sm font-semibold text-foreground">{currencyFormatter.format(reception.total)}</p>
                        </div>
                        <div className="md:col-span-2">
                            <p className="text-xs uppercase text-muted-foreground">Discrepancias</p>
                            <Badge variant={reception.hasDiscrepancies ? 'warning' : 'success'}>
                                {reception.hasDiscrepancies ? 'Con diferencias' : 'Sin diferencias'}
                            </Badge>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {reception.purchaseOrderNumber ? (
                            <div>
                                <p className="text-xs uppercase text-muted-foreground">Orden de compra</p>
                                <p className="font-mono text-sm text-blue-600">{reception.purchaseOrderNumber}</p>
                            </div>
                        ) : (
                            <div>
                                <p className="text-xs uppercase text-muted-foreground">Origen</p>
                                <p className="text-sm text-foreground">Recepción directa</p>
                            </div>
                        )}

                        {reception.cancelsDocumentNumber ? (
                            <div>
                                <p className="text-xs uppercase text-muted-foreground">Documento anulado</p>
                                <p className="font-mono text-sm text-foreground">{reception.cancelsDocumentNumber}</p>
                            </div>
                        ) : null}

                        {reception.cancelledByDocumentNumber ? (
                            <div>
                                <p className="text-xs uppercase text-muted-foreground">Anulada por</p>
                                <p className="font-mono text-sm text-foreground">{reception.cancelledByDocumentNumber}</p>
                            </div>
                        ) : null}

                        {reception.relatedDocumentNumber ? (
                            <div>
                                <p className="text-xs uppercase text-muted-foreground">Transacción relacionada</p>
                                <p className="font-mono text-sm text-foreground">{reception.relatedDocumentNumber}</p>
                            </div>
                        ) : null}

                        {reception.externalReference ? (
                            <div>
                                <p className="text-xs uppercase text-muted-foreground">Referencia externa</p>
                                <p className="text-sm text-foreground">{reception.externalReference}</p>
                            </div>
                        ) : null}

                        {reception.cancellationReason ? (
                            <div>
                                <p className="text-xs uppercase text-muted-foreground">Motivo de anulación</p>
                                <p className="text-sm text-foreground">{reception.cancellationReason}</p>
                            </div>
                        ) : null}
                    </div>

                    <div className="flex justify-end">
                        <Button type="button" variant="secondary" onClick={onClose}>
                            Cerrar
                        </Button>
                    </div>
                </div>
            )}
        </Dialog>
    );
}

export default ReceptionDetailsDialog;
