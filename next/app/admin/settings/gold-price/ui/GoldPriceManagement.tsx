'use client';

import { useState, useCallback, useEffect } from 'react';
import DataGrid from '@/baseComponents/DataGrid/DataGrid';
import IconButton from '@/baseComponents/IconButton/IconButton';
import { Button } from '@/baseComponents/Button/Button';
import { getGoldPrices, deleteGoldPrice, type GoldPriceDTO } from '@/actions/goldPrices';
import GoldPriceDialog from './GoldPriceDialog';
import { useAlert } from '@/globalstate/alert/useAlert';
import { formatDateTime } from '@/lib/dateTimeUtils';

export default function GoldPriceManagement() {
    const [prices, setPrices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingPrice, setEditingPrice] = useState<GoldPriceDTO | null>(null);
    const { success, error } = useAlert();

    const fetchPrices = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getGoldPrices();
            setPrices(data);
        } catch (err) {
            error('Error al cargar los precios del oro');
        } finally {
            setLoading(false);
        }
    }, [error]);

    useEffect(() => {
        fetchPrices();
    }, [fetchPrices]);

    const handleEdit = (price: any) => {
        setEditingPrice({
            id: price.id,
            date: price.date,
            valueCLP: Number(price.valueCLP),
            notes: price.notes,
        });
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de que deseas eliminar este registro?')) return;
        
        try {
            const result = await deleteGoldPrice(id);
            if (result.success) {
                success('Registro eliminado correctamente');
                fetchPrices();
            } else {
                error(result.error || 'Error al eliminar');
            }
        } catch (err) {
            error('Error inesperado');
        }
    };

    const columns = [
        {
            headerName: 'Fecha',
            field: 'date',
            flex: 1,
            renderCell: (params: any) => formatDateTime(params.row.date),
        },
        {
            headerName: 'Valor CLP',
            field: 'valueCLP',
            flex: 1,
            renderCell: (params: any) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(Number(params.row.valueCLP)),
        },
        {
            headerName: 'Notas',
            field: 'notes',
            flex: 2,
        },
        {
            headerName: 'Acciones',
            field: 'id',
            width: 120,
            renderCell: (params: any) => (
                <div className="flex gap-2">
                    <IconButton icon="edit" onClick={() => handleEdit(params.row)} title="Editar" />
                    <IconButton icon="delete" onClick={() => handleDelete(params.row.id)} title="Eliminar" variante="danger" />
                </div>
            ),
        }
    ];

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-foreground">Historial de Precios</h2>
                <Button 
                    onClick={() => {
                        setEditingPrice(null);
                        setIsDialogOpen(true);
                    }}
                >
                    <span className="material-symbols-outlined mr-2">add</span>
                    Nuevo Registro
                </Button>
            </div>

            <DataGrid
                columns={columns}
                rows={loading ? [] : prices}
                height="60vh"
            />

            {isDialogOpen && (
                <GoldPriceDialog
                    isOpen={isDialogOpen}
                    onClose={() => setIsDialogOpen(false)}
                    onSuccess={fetchPrices}
                    initialData={editingPrice}
                />
            )}
        </div>
    );
}
