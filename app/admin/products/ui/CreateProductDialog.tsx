'use client';

import { useState } from 'react';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import Select, { Option } from '@/app/baseComponents/Select/Select';
import { Button } from '@/app/baseComponents/Button/Button';
import Switch from '@/app/baseComponents/Switch/Switch';
import { createSimpleProduct, createProductWithVariants } from '@/app/actions/products';
import { ProductType } from '@/data/entities/Product';

interface CategoryOption extends Option {
    id: string;
    label: string;
}

interface CreateProductDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    categories: CategoryOption[];
}

const productTypeOptions: Option[] = [
    { id: ProductType.PHYSICAL, label: 'Producto físico' },
    { id: ProductType.SERVICE, label: 'Servicio' },
    { id: ProductType.DIGITAL, label: 'Digital' },
];

const initialFormData = {
    // Datos del producto maestro
    name: '',
    description: '',
    brand: '',
    categoryId: '',
    productType: ProductType.PHYSICAL,
    trackInventory: true,
    allowNegativeStock: false,
    isActive: true,
    // Datos de la variante (para producto simple)
    sku: '',
    barcode: '',
    basePrice: '0',
    baseCost: '0',
    unitOfMeasure: 'UN',
    minimumStock: '0',
    maximumStock: '0',
    reorderPoint: '0',
    // Control de variantes
    hasVariants: false,
};

export default function CreateProductDialog({ open, onClose, onSuccess, categories }: CreateProductDialogProps) {
    const [formData, setFormData] = useState(initialFormData);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const resetForm = () => {
        setFormData(initialFormData);
        setError(null);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);

        try {
            if (formData.hasVariants) {
                // Crear producto con variantes (solo datos maestros)
                // trackInventory/allowNegativeStock se definen por variante
                const result = await createProductWithVariants({
                    name: formData.name,
                    description: formData.description || undefined,
                    brand: formData.brand || undefined,
                    categoryId: formData.categoryId || undefined,
                    productType: formData.productType,
                });

                if (result.success) {
                    resetForm();
                    onSuccess();
                    onClose();
                } else {
                    setError(result.error || 'Error al crear el producto');
                }
            } else {
                // Crear producto simple (crea variante default automáticamente)
                const result = await createSimpleProduct({
                    name: formData.name,
                    description: formData.description || undefined,
                    brand: formData.brand || undefined,
                    categoryId: formData.categoryId || undefined,
                    productType: formData.productType,
                    // Datos de la variante default
                    sku: formData.sku,
                    barcode: formData.barcode || undefined,
                    basePrice: parseFloat(formData.basePrice) || 0,
                    baseCost: parseFloat(formData.baseCost) || 0,
                    unitOfMeasure: formData.unitOfMeasure,
                    trackInventory: formData.trackInventory,
                    allowNegativeStock: formData.allowNegativeStock,
                    minimumStock: parseInt(formData.minimumStock) || 0,
                    maximumStock: parseInt(formData.maximumStock) || 0,
                    reorderPoint: parseInt(formData.reorderPoint) || 0,
                });

                if (result.success) {
                    resetForm();
                    onSuccess();
                    onClose();
                } else {
                    setError(result.error || 'Error al crear el producto');
                }
            }
        } catch (err) {
            setError('Error al crear el producto');
        } finally {
            setSaving(false);
        }
    };

    // Validación: nombre siempre requerido, SKU solo si no tiene variantes
    const isValid = formData.name && (formData.hasVariants || formData.sku);

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            title="Nuevo Producto"
            size="lg"
            data-test-id="create-product-dialog"
        >
            <div className="space-y-6">
                {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        {error}
                    </div>
                )}

                {/* SWITCH DE VARIANTES */}
                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                    <Switch
                        label={formData.hasVariants 
                            ? "Producto con múltiples variantes (agregarás los SKU después)" 
                            : "Producto con múltiples variantes"
                        }
                        checked={formData.hasVariants}
                        onChange={(checked) => setFormData({ ...formData, hasVariants: checked })}
                        data-test-id="switch-has-variants"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                        {formData.hasVariants 
                            ? "Agregarás las variantes (SKU, precios) después de crear el producto" 
                            : "Se creará una variante única con los datos que ingreses"
                        }
                    </p>
                </div>

                {/* INFORMACIÓN GENERAL */}
                <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                        Información General
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <TextField
                                label="Nombre del producto"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ej: Coca-Cola 600ml"
                                data-test-id="input-name"
                            />
                        </div>
                        <TextField
                            label="Marca"
                            value={formData.brand}
                            onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                            placeholder="Ej: Coca-Cola"
                            data-test-id="input-brand"
                        />
                        <Select
                            label="Categoría"
                            options={categories}
                            value={formData.categoryId}
                            onChange={(val) => setFormData({ ...formData, categoryId: String(val || '') })}
                            data-test-id="select-category"
                        />
                        <Select
                            label="Tipo de producto"
                            options={productTypeOptions}
                            value={formData.productType}
                            onChange={(val) => setFormData({ ...formData, productType: val as ProductType })}
                            data-test-id="select-type"
                        />
                        <div className="md:col-span-2">
                            <TextField
                                label="Descripción"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Descripción del producto"
                                rows={2}
                                data-test-id="input-description"
                            />
                        </div>
                    </div>
                </div>

                {/* DATOS DE VARIANTE - Solo si NO tiene variantes múltiples */}
                {!formData.hasVariants && (
                    <>
                        {/* SKU Y CÓDIGO DE BARRAS */}
                        <div>
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                                Identificación
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <TextField
                                    label="SKU"
                                    required
                                    value={formData.sku}
                                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                    placeholder="Ej: CC600ML"
                                    data-test-id="input-sku"
                                />
                                <TextField
                                    label="Código de barras"
                                    value={formData.barcode}
                                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                                    placeholder="Ej: 7501055303045"
                                    data-test-id="input-barcode"
                                />
                            </div>
                        </div>

                        {/* PRECIOS */}
                        <div>
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                                Precios
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <TextField
                                    label="Precio de venta"
                                    type="currency"
                                    required
                                    value={formData.basePrice}
                                    onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                                    data-test-id="input-price"
                                />
                                <TextField
                                    label="Costo de compra"
                                    type="currency"
                                    value={formData.baseCost}
                                    onChange={(e) => setFormData({ ...formData, baseCost: e.target.value })}
                                    data-test-id="input-cost"
                                />
                            </div>
                        </div>
                    </>
                )}

                {/* CONFIGURACIÓN DE INVENTARIO - Solo para productos simples */}
                {!formData.hasVariants && (
                    <div>
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                            Configuración de Inventario
                        </h3>
                        <div className="space-y-4">
                            <Switch
                                label="Controlar inventario (desmarcar para servicios)"
                                checked={formData.trackInventory}
                                onChange={(checked) => setFormData({ ...formData, trackInventory: checked })}
                                data-test-id="switch-inventory"
                            />
                            {formData.trackInventory && (
                                <>
                                    <Switch
                                        label="Permitir stock negativo"
                                        checked={formData.allowNegativeStock}
                                        onChange={(checked) => setFormData({ ...formData, allowNegativeStock: checked })}
                                        data-test-id="switch-negative-stock"
                                    />
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                                        <TextField
                                            label="Unidad de medida"
                                            value={formData.unitOfMeasure}
                                            onChange={(e) => setFormData({ ...formData, unitOfMeasure: e.target.value })}
                                            placeholder="UN, KG, LT"
                                            data-test-id="input-unit"
                                        />
                                        <TextField
                                            label="Stock mínimo"
                                            type="number"
                                            value={formData.minimumStock}
                                            onChange={(e) => setFormData({ ...formData, minimumStock: e.target.value })}
                                            data-test-id="input-min-stock"
                                        />
                                        <TextField
                                            label="Punto de reorden"
                                            type="number"
                                            value={formData.reorderPoint}
                                            onChange={(e) => setFormData({ ...formData, reorderPoint: e.target.value })}
                                            data-test-id="input-reorder"
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Estado */}
                <div className="pt-2 border-t border-border">
                    <Switch
                        label="Producto activo"
                        checked={formData.isActive}
                        onChange={(checked) => setFormData({ ...formData, isActive: checked })}
                        data-test-id="switch-active"
                    />
                </div>

                {/* Info sobre variantes */}
                {formData.hasVariants && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
                        <strong>Siguiente paso:</strong> Después de crear el producto, podrás agregar las variantes 
                        (por ejemplo: tallas, colores) desde la sección de Variantes.
                    </div>
                )}

                {/* Acciones */}
                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                    <Button
                        variant="secondary"
                        onClick={handleClose}
                        disabled={saving}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={saving || !isValid}
                        data-test-id="btn-save"
                    >
                        {saving ? 'Guardando...' : 'Guardar Producto'}
                    </Button>
                </div>
            </div>
        </Dialog>
    );
}
