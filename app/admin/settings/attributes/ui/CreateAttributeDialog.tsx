'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import { Button } from '@/app/baseComponents/Button/Button';
import Badge from '@/app/baseComponents/Badge/Badge';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import Alert from '@/app/baseComponents/Alert/Alert';
import { useAlert } from '@/app/state/hooks/useAlert';
import { createAttribute } from '@/app/actions/attributes';

interface CreateAttributeDialogProps {
    open: boolean;
    onClose: () => void;
    'data-test-id'?: string;
}

const CreateAttributeDialog: React.FC<CreateAttributeDialogProps> = ({ 
    open, 
    onClose,
    'data-test-id': dataTestId 
}) => {
    const router = useRouter();
    const { success } = useAlert();
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
    });

    const [options, setOptions] = useState<string[]>([]);
    const [newOption, setNewOption] = useState('');

    const handleAddOption = () => {
        const trimmed = newOption.trim();
        if (trimmed && !options.includes(trimmed)) {
            setOptions([...options, trimmed]);
            setNewOption('');
        }
    };

    const handleRemoveOption = (index: number) => {
        setOptions(options.filter((_, i) => i !== index));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddOption();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const validationErrors: string[] = [];
        if (!formData.name.trim()) validationErrors.push('El nombre es requerido');
        if (options.length === 0) validationErrors.push('Debe agregar al menos una opción');
        
        if (validationErrors.length > 0) {
            setErrors(validationErrors);
            return;
        }

        setIsSubmitting(true);
        setErrors([]);

        try {
            const result = await createAttribute({
                name: formData.name.trim(),
                description: formData.description.trim() || undefined,
                options,
            });

            if (result.success) {
                success('Atributo creado correctamente');
                resetForm();
                setTimeout(() => {
                    onClose();
                    router.refresh();
                    setIsSubmitting(false);
                }, 300);
            } else {
                setErrors([result.error || 'Error al crear el atributo']);
                setIsSubmitting(false);
            }
        } catch (err: any) {
            setErrors([err?.message || 'Error al crear el atributo']);
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({ name: '', description: '' });
        setOptions([]);
        setNewOption('');
    };

    const handleClose = () => {
        resetForm();
        setErrors([]);
        onClose();
    };

    return (
        <Dialog 
            open={open} 
            onClose={handleClose} 
            title="Crear Atributo"
            size="md"
            data-test-id={dataTestId}
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {errors.length > 0 && (
                    <Alert variant="error">
                        <ul className="list-disc list-inside">
                            {errors.map((err, i) => <li key={i}>{err}</li>)}
                        </ul>
                    </Alert>
                )}

                <TextField
                    label="Nombre del atributo"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Color, Talla, Peso"
                    data-test-id="input-name"
                />

                <TextField
                    label="Descripción"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descripción opcional del atributo"
                    data-test-id="input-description"
                />

                <div>
                    <label className="block text-sm font-medium mb-2">
                        Opciones <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2 mb-3">
                        <TextField
                            label=""
                            value={newOption}
                            onChange={(e) => setNewOption(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Agregar opción y presionar Enter"
                            data-test-id="input-new-option"
                        />
                        <Button 
                            type="button" 
                            variant="secondary"
                            onClick={handleAddOption}
                            data-test-id="btn-add-option"
                        >
                            Agregar
                        </Button>
                    </div>
                    
                    {options.length > 0 ? (
                        <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg min-h-[60px]">
                            {options.map((option, index) => (
                                <Badge 
                                    key={index} 
                                    variant="secondary"
                                    className="flex items-center gap-1 pr-1"
                                >
                                    {option}
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveOption(index)}
                                        className="ml-1 hover:text-red-500"
                                    >
                                        ×
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
                            No hay opciones agregadas. Escriba una opción y presione Enter.
                        </p>
                    )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                    <Button 
                        type="button" 
                        variant="secondary" 
                        onClick={handleClose}
                        disabled={isSubmitting}
                    >
                        Cancelar
                    </Button>
                    <Button 
                        type="submit" 
                        disabled={isSubmitting}
                        data-test-id="btn-submit"
                    >
                        {isSubmitting ? 'Creando...' : 'Crear Atributo'}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
};

export default CreateAttributeDialog;
