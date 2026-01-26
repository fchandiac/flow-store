'use client';

import { useState } from 'react';
import Dialog from '@/baseComponents/Dialog/Dialog';
import { TextField } from '@/baseComponents/TextField/TextField';
import { Button } from '@/baseComponents/Button/Button';
import { saveGoldPrice, type GoldPriceDTO } from '@/actions/goldPrices';
import { useAlert } from '@/globalstate/alert/useAlert';

interface GoldPriceDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: GoldPriceDTO | null;
}

export default function GoldPriceDialog({ isOpen, onClose, onSuccess, initialData }: GoldPriceDialogProps) {
    const { success, error } = useAlert();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<GoldPriceDTO>(
        initialData || {
            date: new Date().toISOString(),
            valueCLP: 0,
            notes: '',
        }
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const dataToSave = { ...formData };
            if (!initialData) {
                dataToSave.date = new Date().toISOString();
            }
            const result = await saveGoldPrice(dataToSave);
            if (result.success) {
                success('Precio del oro guardado correctamente');
                onSuccess();
                onClose();
            } else {
                error(result.error || 'Error al guardar el precio');
            }
        } catch (err) {
            error('Ocurrió un error inesperado');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            open={isOpen}
            onClose={onClose}
            title={initialData ? 'Editar precio del oro' : 'Nuevo registro de precio de oro'}
            size="sm"
        >
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                <TextField
                    label="Valor Oro (CLP por gramo)"
                    type="currency"
                    name="valueCLP"
                    value={String(formData.valueCLP)}
                    onChange={(e) => setFormData({ ...formData, valueCLP: parseFloat(e.target.value) || 0 })}
                    required
                />
                <TextField
                    label="Notas"
                    name="notes"
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                />
                <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outlined" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button type="submit" loading={loading}>
                        Guardar
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
