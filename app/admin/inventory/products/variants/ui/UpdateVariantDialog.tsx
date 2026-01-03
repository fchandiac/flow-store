'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import Select from '@/app/baseComponents/Select/Select';
import Switch from '@/app/baseComponents/Switch/Switch';
import { Button } from '@/app/baseComponents/Button/Button';
import Alert from '@/app/baseComponents/Alert/Alert';
import { useAlert } from '@/app/state/hooks/useAlert';
import { updateVariant } from '@/app/actions/productVariants';
import { getAttributes } from '@/app/actions/attributes';
import { VariantType } from './VariantCard';

interface AttributeType {
    id: string;
    name: string;
    options: string[];
    isActive: boolean;
}

interface UpdateVariantDialogProps {
    open: boolean;
    onClose: () => void;
    variant: VariantType;
    'data-test-id'?: string;
}

const UpdateVariantDialog: React.FC<UpdateVariantDialogProps> = ({ 
    open, 
    onClose,
    variant,
    'data-test-id': dataTestId 
}) => {
    const router = useRouter();
    const { success } = useAlert();
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);
    const [attributes, setAttributes] = useState<AttributeType[]>([]);

    const [formData, setFormData] = useState({
        sku: '',
        barcode: '',
        basePrice: '',
        baseCost: '',
        unitOfMeasure: '',
        isActive: true,
    });

    // Estado para los valores de atributos seleccionados
    const [attributeValues, setAttributeValues] = useState<Record<string, string>>({});

    // Cargar atributos disponibles
    useEffect(() => {
        if (open) {
            loadAttributes();
        }
    }, [open]);

    const loadAttributes = async () => {
        const attrs = await getAttributes();
        setAttributes(attrs);
    };

    // Cargar datos del variant al abrir
    useEffect(() => {
        if (open && variant) {
            setFormData({
                sku: variant.sku,
                barcode: variant.barcode || '',
                basePrice: String(variant.basePrice || 0),
                baseCost: String(variant.baseCost || 0),
                unitOfMeasure: variant.unitOfMeasure || 'UN',
                isActive: variant.isActive,
            });
            
            // Cargar attributeValues existentes
            setAttributeValues(variant.attributeValues || {});
            
            setErrors([]);
        }
    }, [open, variant]);

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleAttributeChange = (attributeId: string, value: string) => {
        setAttributeValues(prev => {
            if (value) {
                return { ...prev, [attributeId]: value };
            } else {
                const newValues = { ...prev };
                delete newValues[attributeId];
                return newValues;
            }
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const validationErrors: string[] = [];
        if (!formData.sku.trim()) validationErrors.push('El SKU es requerido');
        if (!formData.basePrice || parseFloat(formData.basePrice) < 0) {
            validationErrors.push('El precio es requerido');
        }
        // No requerimos atributos para variante default
        if (!variant.isDefault && Object.keys(attributeValues).length === 0) {
            validationErrors.push('Debe seleccionar al menos un atributo para la variante');
        }
        
        if (validationErrors.length > 0) {
            setErrors(validationErrors);
            return;
        }

        setIsSubmitting(true);
        setErrors([]);

        try {
            const result = await updateVariant(variant.id, {
                sku: formData.sku.trim(),
                barcode: formData.barcode.trim() || undefined,
                basePrice: parseFloat(formData.basePrice) || 0,
                baseCost: parseFloat(formData.baseCost) || 0,
                unitOfMeasure: formData.unitOfMeasure || 'UN',
                attributeValues: Object.keys(attributeValues).length > 0 ? attributeValues : undefined,
                isActive: formData.isActive,
            });

            if (result.success) {
                success('Variante actualizada correctamente');
                setTimeout(() => {
                    onClose();
                    router.refresh();
                    setIsSubmitting(false);
                }, 300);
            } else {
                setErrors([result.error || 'Error al actualizar la variante']);
                setIsSubmitting(false);
            }
        } catch (err: any) {
            setErrors([err?.message || 'Error al actualizar la variante']);
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setErrors([]);
        onClose();
    };

    // Generar preview del nombre de la variante
    const getVariantPreview = () => {
        if (variant.isDefault) return 'Variante Principal (Default)';
        const parts: string[] = [];
        for (const [attrId, value] of Object.entries(attributeValues)) {
            const attr = attributes.find(a => a.id === attrId);
            if (attr && value) {
                parts.push(`${attr.name}: ${value}`);
            }
        }
        return parts.length > 0 ? parts.join(', ') : 'Sin atributos seleccionados';
    };

    return (
        <Dialog 
            open={open} 
            onClose={handleClose} 
            title="Editar Variante"
            size="lg"
            data-test-id={dataTestId}
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {errors.length > 0 && (
                    <Alert variant="error">
                        <ul className="list-disc list-inside">
                            {errors.map((err, i) => (
                                <li key={i}>{err}</li>
                            ))}
                        </ul>
                    </Alert>
                )}

                {variant.isDefault && (
                    <Alert variant="info">
                        Esta es la variante principal del producto. No puede ser eliminada.
                    </Alert>
                )}

                {/* Preview de la variante */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-600 mb-1">Vista previa de la variante:</p>
                    <p className="font-medium text-blue-800">{getVariantPreview()}</p>
                </div>

                {/* Atributos - Solo mostrar si no es variante default */}
                {!variant.isDefault && (
                    <div className="space-y-4">
                        <h4 className="font-medium text-neutral-700">Atributos de la Variante</h4>
                        
                        {attributes.length === 0 ? (
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
                                <p className="font-medium mb-1">No hay atributos definidos</p>
                                <p>Debe crear atributos (Color, Talla, etc.) en Configuración → Atributos.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {attributes.map(attr => (
                                    <Select
                                        key={attr.id}
                                        label={attr.name}
                                        value={attributeValues[attr.id] || ''}
                                        onChange={(id) => handleAttributeChange(attr.id, id?.toString() || '')}
                                        options={attr.options.map(opt => ({ id: opt, label: opt }))}
                                        placeholder={`Seleccionar ${attr.name.toLowerCase()}`}
                                        data-test-id={`attr-${attr.id}`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Identificación */}
                <div className="space-y-4">
                    <h4 className="font-medium text-neutral-700">Identificación</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <TextField
                            label="SKU"
                            value={formData.sku}
                            onChange={(e) => handleChange('sku', e.target.value)}
                            required
                            data-test-id="update-variant-sku"
                        />
                        <TextField
                            label="Código de Barras"
                            value={formData.barcode}
                            onChange={(e) => handleChange('barcode', e.target.value)}
                            data-test-id="update-variant-barcode"
                        />
                    </div>
                </div>

                {/* Precios */}
                <div className="space-y-4">
                    <h4 className="font-medium text-neutral-700">Precios</h4>
                    <div className="grid grid-cols-3 gap-4">
                        <TextField
                            label="Precio de Venta"
                            type="currency"
                            value={formData.basePrice}
                            onChange={(e) => handleChange('basePrice', e.target.value)}
                            required
                            data-test-id="update-variant-price"
                        />
                        <TextField
                            label="Costo"
                            type="currency"
                            value={formData.baseCost}
                            onChange={(e) => handleChange('baseCost', e.target.value)}
                            data-test-id="update-variant-cost"
                        />
                        <TextField
                            label="Unidad"
                            value={formData.unitOfMeasure}
                            onChange={(e) => handleChange('unitOfMeasure', e.target.value)}
                            placeholder="UN, KG, LT"
                            data-test-id="update-variant-unit"
                        />
                    </div>
                </div>

                {/* Estado */}
                <div className="pt-4 border-t border-neutral-200">
                    <Switch
                        label="Variante activa"
                        checked={formData.isActive}
                        onChange={(checked) => handleChange('isActive', checked)}
                        data-test-id="update-variant-active"
                    />
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
                        type="submit"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
};

export default UpdateVariantDialog;
