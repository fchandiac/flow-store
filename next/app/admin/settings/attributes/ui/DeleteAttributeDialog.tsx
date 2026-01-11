'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import { Button } from '@/app/baseComponents/Button/Button';
import Badge from '@/app/baseComponents/Badge/Badge';
import Alert from '@/app/baseComponents/Alert/Alert';
import { useAlert } from '@/app/globalstate/alert/useAlert';
import { deleteAttribute } from '@/app/actions/attributes';
import { AttributeType } from './AttributeCard';

interface DeleteAttributeDialogProps {
    open: boolean;
    onClose: () => void;
    attribute: AttributeType;
    'data-test-id'?: string;
}

const DeleteAttributeDialog: React.FC<DeleteAttributeDialogProps> = ({ 
    open, 
    onClose,
    attribute,
    'data-test-id': dataTestId 
}) => {
    const router = useRouter();
    const { success, error: showError } = useAlert();
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDelete = async () => {
        setIsSubmitting(true);
        setError(null);

        try {
            const result = await deleteAttribute(attribute.id);

            if (result.success) {
                success('Atributo eliminado correctamente');
                setTimeout(() => {
                    onClose();
                    router.refresh();
                    setIsSubmitting(false);
                }, 300);
            } else {
                setError(result.error || 'Error al eliminar el atributo');
                setIsSubmitting(false);
            }
        } catch (err: any) {
            setError(err?.message || 'Error al eliminar el atributo');
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog 
            open={open} 
            onClose={onClose} 
            title="Eliminar Atributo"
            size="sm"
            data-test-id={dataTestId}
        >
            <div className="space-y-4">
                {error && (
                    <Alert variant="error">{error}</Alert>
                )}

                <p className="text-muted-foreground">
                    ¿Está seguro que desea eliminar el atributo <strong>{attribute.name}</strong>?
                </p>

                <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium mb-2">Opciones que se eliminarán:</p>
                    <div className="flex flex-wrap gap-1">
                        {attribute.options.map((option, index) => (
                            <Badge key={index} variant="secondary">
                                {option}
                            </Badge>
                        ))}
                    </div>
                </div>

                <Alert variant="warning">
                    Esta acción no se puede deshacer. Las variantes que usen este atributo 
                    podrían verse afectadas.
                </Alert>

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                    <Button 
                        variant="secondary" 
                        onClick={onClose}
                        disabled={isSubmitting}
                    >
                        Cancelar
                    </Button>
                    <Button 
                        variant="primary"
                        onClick={handleDelete}
                        disabled={isSubmitting}
                        data-test-id="btn-confirm-delete"
                        className="!bg-red-600 hover:!bg-red-700"
                    >
                        {isSubmitting ? 'Eliminando...' : 'Eliminar'}
                    </Button>
                </div>
            </div>
        </Dialog>
    );
};

export default DeleteAttributeDialog;
