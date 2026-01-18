'use client';

import { useEffect, useMemo, useState } from 'react';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import { Button } from '@/app/baseComponents/Button/Button';
import Alert from '@/app/baseComponents/Alert/Alert';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import Badge, { type BadgeVariant } from '@/app/baseComponents/Badge/Badge';
import { cancelReception } from '@/app/actions/receptions';
import { useAlert } from '@/app/globalstate/alert/useAlert';
import type { ReceptionListItem } from '@/app/actions/receptions';
import { TransactionStatus } from '@/data/entities/Transaction';
import { formatDateTime } from '@/lib/dateTimeUtils';

interface CancelReceptionDialogProps {
    open: boolean;
    reception: ReceptionListItem | null;
    onClose: () => void;
    onCancelled: () => Promise<void> | void;
}

const currencyFormatter = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

export function CancelReceptionDialog({ open, reception, onClose, onCancelled }: CancelReceptionDialogProps) {
    const { success, error } = useAlert();
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!open) {
            setReason('');
            setSubmitting(false);
        }
    }, [open]);

    const formattedDate = useMemo(() => {
        if (!reception) {
            return '';
        }
        try {
            return formatDateTime(reception.createdAt);
        } catch (e) {
            return reception.createdAt;
        }
    }, [reception]);

    const statusVariant = useMemo<BadgeVariant>(() => {
        if (!reception) {
            return 'secondary';
        }
        switch (reception.status) {
            case TransactionStatus.CANCELLED:
                return 'error';
            case TransactionStatus.PARTIALLY_RECEIVED:
                return 'warning';
            case TransactionStatus.RECEIVED:
                return 'success';
            default:
                return 'info';
        }
    }, [reception]);

    const statusLabel = useMemo(() => {
        if (!reception) {
            return '';
        }
        switch (reception.status) {
            case TransactionStatus.CANCELLED:
                return 'Anulada';
            case TransactionStatus.PARTIALLY_RECEIVED:
                return 'Parcial';
            case TransactionStatus.RECEIVED:
                return 'Recibida';
            case TransactionStatus.CONFIRMED:
                return 'Confirmada';
            default:
                return reception.status;
        }
    }, [reception]);

    const handleCancelReception = async () => {
        if (!reception) {
            return;
        }
        const trimmedReason = reason.trim();
        if (trimmedReason.length < 5) {
            error('Describe el motivo de la anulación (al menos 5 caracteres).');
            return;
        }

        try {
            setSubmitting(true);
            const result = await cancelReception(reception.id, trimmedReason);
            if (!result.success) {
                throw new Error(result.error ?? 'No fue posible anular la recepción');
            }
            success('Recepción anulada correctamente');
            await onCancelled();
            onClose();
        } catch (err) {
            console.error('Error cancelling reception:', err);
            error(err instanceof Error ? err.message : 'No fue posible anular la recepción');
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} title="Anular recepción" size="md">
            {!reception ? (
                <div className="py-8 text-center text-sm text-neutral-500">
                    Selecciona una recepción para continuar.
                </div>
            ) : (
                <div className="space-y-6">
                    <Alert variant="warning">
                        Esta acción creará automáticamente una transacción inversa (<strong>devolución de compra</strong>)
                        para revertir el movimiento de inventario. Revisa los datos antes de confirmar.
                    </Alert>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <p className="text-xs uppercase text-muted-foreground">Folio</p>
                            <p className="font-mono text-sm font-semibold text-foreground">
                                {reception.documentNumber}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs uppercase text-muted-foreground">Fecha</p>
                            <p className="text-sm text-foreground">{formattedDate}</p>
                        </div>
                        <div>
                            <p className="text-xs uppercase text-muted-foreground">Proveedor</p>
                            <p className="text-sm text-foreground">
                                {reception.supplierName ?? 'Sin proveedor'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs uppercase text-muted-foreground">Almacén</p>
                            <p className="text-sm text-foreground">
                                {reception.storageName ?? 'Sin almacén'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs uppercase text-muted-foreground">Total</p>
                            <p className="text-sm font-semibold text-foreground">
                                {currencyFormatter.format(reception.total)}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs uppercase text-muted-foreground">Productos</p>
                            <p className="text-sm text-foreground">{reception.lineCount}</p>
                        </div>
                        <div className="md:col-span-2">
                            <p className="text-xs uppercase text-muted-foreground">Estado actual</p>
                            <Badge variant={statusVariant}>{statusLabel}</Badge>
                        </div>
                    </div>

                    <TextField
                        label="Motivo de la anulación"
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        placeholder="Ej. Recepción registrada por error"
                        type="textarea"
                        rows={3}
                    />

                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            className="!bg-red-600 hover:!bg-red-700"
                            onClick={handleCancelReception}
                            disabled={submitting}
                            loading={submitting}
                        >
                            Anular recepción
                        </Button>
                    </div>
                </div>
            )}
        </Dialog>
    );
}

export default CancelReceptionDialog;
