'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import { Button } from '@/app/baseComponents/Button/Button';
import Alert from '@/app/baseComponents/Alert/Alert';
import Badge from '@/app/baseComponents/Badge/Badge';
import { useAlert } from '@/app/globalstate/alert/useAlert';
import { deleteVariant } from '@/app/actions/productVariants';
import { getAttributes } from '@/app/actions/attributes';
import { VariantType } from './VariantCard';

interface AttributeType {
    id: string;
    name: string;
    options: string[];
}

interface DeleteVariantDialogProps {
    open: boolean;
    onClose: () => void;
    variant: VariantType;
    onDeleted?: () => void;
    'data-test-id'?: string;
}

const DeleteVariantDialog: React.FC<DeleteVariantDialogProps> = ({ 
    open, 
    onClose,
    variant,
    onDeleted,
    'data-test-id': dataTestId 
}) => {
    const router = useRouter();
    const { success, error: showError } = useAlert();
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);
    const [attributes, setAttributes] = useState<AttributeType[]>([]);

    // Cargar atributos para mostrar nombres
    useEffect(() => {
        if (open) {
            loadAttributes();
        }
    }, [open]);

    const loadAttributes = async () => {
        const attrs = await getAttributes();
        setAttributes(attrs);
    };

    const attributeValues = variant.attributeValues || {};
    const attributeIds = Object.keys(attributeValues);

    // Obtener nombre legible del atributo
    const getAttributeName = (attrId: string) => {
        const attr = attributes.find(a => a.id === attrId);
        return attr?.name || attrId;
    };

    const handleDelete = async () => {
        setIsSubmitting(true);
        setErrors([]);

        try {
            const result = await deleteVariant(variant.id);

            if (result.success) {
                success('Variante eliminada correctamente');
                setTimeout(() => {
                    onClose();
                    onDeleted?.();
                    router.refresh();
                    setIsSubmitting(false);
                }, 300);
            } else {
                setErrors([result.error || 'Error al eliminar la variante']);
                setIsSubmitting(false);
            }
        } catch (err: any) {
            setErrors([err?.message || 'Error al eliminar la variante']);
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setErrors([]);
        onClose();
    };

    const displayName = variant.displayName || 'Variante sin atributos';

    return (
        <Dialog 
            open={open} 
            onClose={handleClose} 
            title="Eliminar Variante"
            data-test-id={dataTestId}
        >
            <div className="space-y-6">
                {errors.length > 0 && (
                    <Alert variant="error">
                        <ul className="list-disc list-inside">
                            {errors.map((err, i) => (
                                <li key={i}>{err}</li>
                            ))}
                        </ul>
                    </Alert>
                )}

                <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-red-600" style={{ fontSize: '1.5rem' }}>
                            warning
                        </span>
                    </div>
                    <div>
                        <p className="text-neutral-700">
                            ¿Estás seguro de que deseas eliminar la variante <strong>{displayName}</strong>?
                        </p>
                        <p className="text-sm text-neutral-500 mt-2">
                            Esta acción no se puede deshacer.
                        </p>
                    </div>
                </div>

                {/* Info de la variante */}
                <div className="p-4 bg-neutral-50 rounded-lg">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-white border border-neutral-200 flex items-center justify-center">
                            <span className="material-symbols-outlined text-neutral-500" style={{ fontSize: '1.25rem' }}>
                                style
                            </span>
                        </div>
                        <div className="flex-1">
                            <p className="font-medium text-neutral-800">{displayName}</p>
                            <p className="text-sm text-neutral-500">SKU: {variant.sku}</p>
                        </div>
                    </div>
                    {attributeIds.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-neutral-200">
                            {attributeIds.map(attrId => (
                                <Badge key={attrId} variant="info-outlined">
                                    {getAttributeName(attrId)}: {String(attributeValues[attrId])}
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200">
                    <Button
                        variant="outlined"
                        onClick={handleClose}
                        disabled={isSubmitting}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleDelete}
                        disabled={isSubmitting}
                        className="!bg-red-600 hover:!bg-red-700"
                    >
                        {isSubmitting ? 'Eliminando...' : 'Eliminar Variante'}
                    </Button>
                </div>
            </div>
        </Dialog>
    );
};

export default DeleteVariantDialog;
