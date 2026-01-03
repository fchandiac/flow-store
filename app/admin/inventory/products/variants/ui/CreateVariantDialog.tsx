'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import Select from '@/app/baseComponents/Select/Select';
import { Button } from '@/app/baseComponents/Button/Button';
import Alert from '@/app/baseComponents/Alert/Alert';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import { useAlert } from '@/app/state/hooks/useAlert';
import { createVariant } from '@/app/actions/productVariants';
import { getAttributes } from '@/app/actions/attributes';

interface AttributeType {
    id: string;
    name: string;
    options: string[];
    isActive: boolean;
}

// Mini card para mostrar un atributo seleccionado
interface AttributeChipProps {
    attributeName: string;
    value: string;
    onRemove: () => void;
}

const AttributeChip: React.FC<AttributeChipProps> = ({ attributeName, value, onRemove }) => (
    <div className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
        <div>
            <span className="text-xs text-blue-600 block">{attributeName}</span>
            <span className="font-medium text-blue-800">{value}</span>
        </div>
        <button
            type="button"
            onClick={onRemove}
            className="p-1 hover:bg-blue-100 rounded-full transition-colors"
        >
            <span className="material-symbols-outlined text-blue-500" style={{ fontSize: '1rem' }}>
                close
            </span>
        </button>
    </div>
);

// Dialog para agregar un atributo
interface AddAttributeDialogProps {
    open: boolean;
    onClose: () => void;
    attributes: AttributeType[];
    selectedAttributeIds: string[];
    onAdd: (attributeId: string, value: string) => void;
}

const AddAttributeDialog: React.FC<AddAttributeDialogProps> = ({
    open,
    onClose,
    attributes,
    selectedAttributeIds,
    onAdd,
}) => {
    const [selectedAttribute, setSelectedAttribute] = useState<string>('');
    const [selectedValue, setSelectedValue] = useState<string>('');

    // Filtrar atributos que ya fueron seleccionados
    const availableAttributes = attributes.filter(
        attr => !selectedAttributeIds.includes(attr.id)
    );

    const currentAttribute = attributes.find(a => a.id === selectedAttribute);

    const handleAdd = () => {
        if (selectedAttribute && selectedValue) {
            onAdd(selectedAttribute, selectedValue);
            setSelectedAttribute('');
            setSelectedValue('');
            onClose();
        }
    };

    const handleClose = () => {
        setSelectedAttribute('');
        setSelectedValue('');
        onClose();
    };

    // Resetear valor cuando cambia el atributo
    useEffect(() => {
        setSelectedValue('');
    }, [selectedAttribute]);

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            title="Agregar Atributo"
            size="sm"
        >
            <div className="space-y-4">
                {availableAttributes.length === 0 ? (
                    <Alert variant="info">
                        Ya has agregado todos los atributos disponibles.
                    </Alert>
                ) : (
                    <>
                        <Select
                            label="Atributo"
                            value={selectedAttribute}
                            onChange={(id) => setSelectedAttribute(id?.toString() || '')}
                            options={availableAttributes.map(attr => ({
                                id: attr.id,
                                label: attr.name
                            }))}
                            placeholder="Seleccionar atributo"
                        />

                        {currentAttribute && (
                            <Select
                                label={`Valor de ${currentAttribute.name}`}
                                value={selectedValue}
                                onChange={(id) => setSelectedValue(id?.toString() || '')}
                                options={currentAttribute.options.map(opt => ({
                                    id: opt,
                                    label: opt
                                }))}
                                placeholder={`Seleccionar ${currentAttribute.name.toLowerCase()}`}
                            />
                        )}
                    </>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200">
                    <Button variant="outlined" onClick={handleClose}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleAdd}
                        disabled={!selectedAttribute || !selectedValue}
                    >
                        Agregar
                    </Button>
                </div>
            </div>
        </Dialog>
    );
};

interface CreateVariantDialogProps {
    open: boolean;
    onClose: () => void;
    productId: string;
    productName: string;
    'data-test-id'?: string;
}

const CreateVariantDialog: React.FC<CreateVariantDialogProps> = ({ 
    open, 
    onClose,
    productId,
    productName,
    'data-test-id': dataTestId 
}) => {
    const router = useRouter();
    const { success } = useAlert();
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);
    const [attributes, setAttributes] = useState<AttributeType[]>([]);
    const [showAddAttributeDialog, setShowAddAttributeDialog] = useState(false);

    const [formData, setFormData] = useState({
        sku: '',
        barcode: '',
        basePrice: '',
        baseCost: '',
        unitOfMeasure: 'UN',
    });

    // Estado para los valores de atributos seleccionados: { attributeId: "opción seleccionada" }
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

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleAddAttribute = (attributeId: string, value: string) => {
        setAttributeValues(prev => ({
            ...prev,
            [attributeId]: value
        }));
    };

    const handleRemoveAttribute = (attributeId: string) => {
        setAttributeValues(prev => {
            const newValues = { ...prev };
            delete newValues[attributeId];
            return newValues;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const validationErrors: string[] = [];
        if (!formData.sku.trim()) validationErrors.push('El SKU es requerido');
        if (!formData.basePrice || parseFloat(formData.basePrice) < 0) {
            validationErrors.push('El precio es requerido');
        }
        if (Object.keys(attributeValues).length === 0) {
            validationErrors.push('Debe agregar al menos un atributo para la variante');
        }
        
        if (validationErrors.length > 0) {
            setErrors(validationErrors);
            return;
        }

        setIsSubmitting(true);
        setErrors([]);

        try {
            const result = await createVariant({
                productId,
                sku: formData.sku.trim(),
                barcode: formData.barcode.trim() || undefined,
                basePrice: parseFloat(formData.basePrice) || 0,
                baseCost: parseFloat(formData.baseCost) || 0,
                unitOfMeasure: formData.unitOfMeasure || 'UN',
                attributeValues: Object.keys(attributeValues).length > 0 ? attributeValues : undefined,
            });

            if (result.success) {
                success('Variante creada correctamente');
                resetForm();
                setTimeout(() => {
                    onClose();
                    router.refresh();
                    setIsSubmitting(false);
                }, 300);
            } else {
                setErrors([result.error || 'Error al crear la variante']);
                setIsSubmitting(false);
            }
        } catch (err: any) {
            setErrors([err?.message || 'Error al crear la variante']);
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({
            sku: '',
            barcode: '',
            basePrice: '',
            baseCost: '',
            unitOfMeasure: 'UN',
        });
        setAttributeValues({});
    };

    const handleClose = () => {
        resetForm();
        setErrors([]);
        onClose();
    };

    // Generar preview del nombre de la variante
    const getVariantPreview = () => {
        const parts: string[] = [];
        for (const [attrId, value] of Object.entries(attributeValues)) {
            const attr = attributes.find(a => a.id === attrId);
            if (attr && value) {
                parts.push(`${attr.name}: ${value}`);
            }
        }
        return parts.length > 0 ? parts.join(', ') : 'Sin atributos';
    };

    const selectedAttributeIds = Object.keys(attributeValues);

    return (
        <>
            <Dialog 
                open={open} 
                onClose={handleClose} 
                title="Crear Variante"
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

                    {/* Info del producto */}
                    <div className="p-3 bg-neutral-50 rounded-lg">
                        <p className="text-sm text-neutral-500">Producto</p>
                        <p className="font-medium text-neutral-800">{productName}</p>
                    </div>

                    {/* Preview de la variante */}
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-600 mb-1">Vista previa de la variante:</p>
                        <p className="font-medium text-blue-800">{getVariantPreview()}</p>
                    </div>

                    {/* Atributos */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="font-medium text-neutral-700">Atributos de la Variante</h4>
                            {attributes.length > 0 && (
                                <Button
                                    type="button"
                                    variant="outlined"
                                    size="sm"
                                    onClick={() => setShowAddAttributeDialog(true)}
                                    disabled={selectedAttributeIds.length >= attributes.length}
                                >
                                    <span className="material-symbols-outlined mr-1" style={{ fontSize: '1.25rem' }}>
                                        add
                                    </span>
                                    Agregar Atributo
                                </Button>
                            )}
                        </div>
                        
                        {attributes.length === 0 ? (
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
                                <p className="font-medium mb-1">No hay atributos definidos</p>
                                <p>Debe crear atributos (Color, Talla, etc.) en Configuración → Atributos antes de crear variantes.</p>
                            </div>
                        ) : selectedAttributeIds.length === 0 ? (
                            <div className="p-4 bg-neutral-50 border border-neutral-200 border-dashed rounded-lg text-center">
                                <span className="material-symbols-outlined text-neutral-400 mb-2" style={{ fontSize: '2rem' }}>
                                    label
                                </span>
                                <p className="text-neutral-500 text-sm">
                                    No hay atributos agregados
                                </p>
                                <p className="text-neutral-400 text-xs mt-1">
                                    Usa el botón "Agregar Atributo" para definir las características de esta variante
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {selectedAttributeIds.map(attrId => {
                                    const attr = attributes.find(a => a.id === attrId);
                                    if (!attr) return null;
                                    return (
                                        <AttributeChip
                                            key={attrId}
                                            attributeName={attr.name}
                                            value={attributeValues[attrId]}
                                            onRemove={() => handleRemoveAttribute(attrId)}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Identificación */}
                    <div className="space-y-4">
                        <h4 className="font-medium text-neutral-700">Identificación</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <TextField
                                label="SKU"
                                value={formData.sku}
                                onChange={(e) => handleChange('sku', e.target.value)}
                                placeholder="Ej: ANI-ORO18-T12"
                                required
                                data-test-id="create-variant-sku"
                            />
                            <TextField
                                label="Código de Barras"
                                value={formData.barcode}
                                onChange={(e) => handleChange('barcode', e.target.value)}
                                data-test-id="create-variant-barcode"
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
                                data-test-id="create-variant-price"
                            />
                            <TextField
                                label="Costo"
                                type="currency"
                                value={formData.baseCost}
                                onChange={(e) => handleChange('baseCost', e.target.value)}
                                data-test-id="create-variant-cost"
                            />
                            <TextField
                                label="Unidad"
                                value={formData.unitOfMeasure}
                                onChange={(e) => handleChange('unitOfMeasure', e.target.value)}
                                placeholder="UN, KG, LT"
                                data-test-id="create-variant-unit"
                            />
                        </div>
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
                            disabled={isSubmitting || attributes.length === 0}
                        >
                            {isSubmitting ? 'Creando...' : 'Crear Variante'}
                        </Button>
                    </div>
                </form>
            </Dialog>

            {/* Dialog para agregar atributo */}
            <AddAttributeDialog
                open={showAddAttributeDialog}
                onClose={() => setShowAddAttributeDialog(false)}
                attributes={attributes}
                selectedAttributeIds={selectedAttributeIds}
                onAdd={handleAddAttribute}
            />
        </>
    );
};

export default CreateVariantDialog;
