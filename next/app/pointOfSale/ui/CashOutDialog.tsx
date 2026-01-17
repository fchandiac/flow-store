'use client';

import { useEffect, useMemo, useState } from 'react';
import Dialog from '@/baseComponents/Dialog/Dialog';
import { Button } from '@/baseComponents/Button/Button';
import { TextField } from '@/baseComponents/TextField/TextField';
import { usePointOfSale } from '../context/PointOfSaleContext';

export default function CashOutDialog() {
    const { isCashOutDialogOpen, closeCashOutDialog } = usePointOfSale();

    const [amountValue, setAmountValue] = useState('');
    const [comment, setComment] = useState('');

    useEffect(() => {
        if (!isCashOutDialogOpen) {
            return;
        }
        setAmountValue('');
        setComment('');
    }, [isCashOutDialogOpen]);

    const numericAmount = useMemo(() => {
        if (!amountValue) {
            return 0;
        }
        const parsed = Number(amountValue);
        return Number.isFinite(parsed) ? parsed : 0;
    }, [amountValue]);

    const canSubmit = numericAmount > 0 && comment.trim().length > 0;

    return (
        <Dialog
            open={isCashOutDialogOpen}
            onClose={closeCashOutDialog}
            title="Egreso de dinero"
            size="sm"
            hideActions
            maxHeight="75vh"
        >
            <div className="flex flex-col gap-6">
                <section className="flex flex-col gap-3">
                    <TextField
                        label="Monto a egresar"
                        type="currency"
                        value={amountValue}
                        onChange={(event) => setAmountValue(event.target.value)}
                        placeholder="Ej: 25000"
                        required
                        startIcon="payments"
                        data-test-id="cash-out-amount"
                    />
                </section>

                <section className="flex flex-col gap-2">
                    <TextField
                        label="Comentario"
                        placeholder="Detalla el motivo del egreso"
                        value={comment}
                        onChange={(event) => setComment(event.target.value)}
                        type="textarea"
                        rows={4}
                        required
                        data-test-id="cash-out-comment"
                    />
                </section>

                <footer className="flex flex-wrap justify-end gap-3 border-t border-border/50 pt-4">
                    <Button variant="outlined" size="sm" onClick={closeCashOutDialog}>
                        Cancelar
                    </Button>
                    <Button variant="primary" size="sm" disabled={!canSubmit}>
                        Registrar egreso
                    </Button>
                </footer>
            </div>
        </Dialog>
    );
}
