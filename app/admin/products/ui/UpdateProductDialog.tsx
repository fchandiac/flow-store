'use client';

import { useState, useEffect } from 'react';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import Select, { Option } from '@/app/baseComponents/Select/Select';
import { Button } from '@/app/baseComponents/Button/Button';
import Switch from '@/app/baseComponents/Switch/Switch';
import { updateProduct, updateSimpleProduct } from '@/app/actions/products';
import { ProductType } from '@/data/entities/Product';

interface CategoryOption extends Option {
    id: string;
    label: string;
}

export interface ProductToEdit {
    id: string;
    name: string;
    description?: string;
    brand?: string;
    categoryId?: string;
    productType: ProductType;
    hasVariants: boolean;
    isActive: boolean;
    // Datos de variante default (para productos simples)
    sku?: string;
    barcode?: string;
    basePrice?: number;
    baseCost?: number;
    unitOfMeasure?: string;
    trackInventory?: boolean;
    allowNegativeStock?: boolean;
}

interface UpdateProductDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    product: ProductToEdit | null;
    categories: CategoryOption[];
}

const productTypeOptions: Option[] = [
    { id: ProductType.PHYSICAL, label: 'Producto físico' },
    { id: ProductType.SERVICE, label: 'Servicio' },
    { id: ProductType.DIGITAL, label: 'Digital' },
];

export default function UpdateProductDialog({ open, onClose, onSuccess, product, categories }: UpdateProductDialogProps) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        brand: '',
        categoryId: '',
        productType: ProductType.PHYSICAL,
        trackInventory: true,
        allowNegativeStock: false,
        isActive: true,
        // Datos de variante
        sku: '',
        barcode: '',
        basePrice: '0',
        baseCost: '0',
        unitOfMeasure: 'UN',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load product data into form
    useEffect(() => {
        if (product) {
            setFormData({
                name: product.name,
                description: product.description || '',
                brand: product.brand || '',
                categoryId: product.categoryId || '',
                productType: product.productType,
                trackInventory: product.trackInventory ?? true,
                allowNegativeStock: product.allowNegativeStock ?? false,
                isActive: product.isActive,
                // Datos de variante
                sku: product.sku || '',
                barcode: product.barcode || '',
                basePrice: String(product.basePrice || 0),
                baseCost: String(product.baseCost || 0),
                unitOfMeasure: product.unitOfMeasure || 'UN',
            });
            setError(null);
        }
    }, [product]);

    const handleClose = () => {
        setError(null);
        onClose();
    };

    const handleSave = async () => {
        if (!product) return;
        
        setSaving(true);
        setError(null);

        try {
            if (product.hasVariants) {
                // Producto con variantes - solo actualizar datos maestros
                // trackInventory/allowNegativeStock se editan por variante
                const result = await updateProduct(product.id, {
                    name: formData.name,
                    description: formData.description || undefined,
                    brand: formData.brand || undefined,
                    categoryId: formData.categoryId || undefined,
                    productType: formData.productType,
                    isActive: formData.isActive,
                });

                if (result.success) {
                    onSuccess();
                    onClose();
                } else {
                    setError(result.error || 'Error al actualizar el producto');
                }
            } else {
                // Producto simple - actualizar producto + variante default
                const result = await updateSimpleProduct(
                    product.id,
                    {
                        name: formData.name,
                        description: formData.description || undefined,
                        brand: formData.brand || undefined,
                        categoryId: formData.categoryId || undefined,
                        productType: formData.productType,
                        isActive: formData.isActive,
                    },
                    {
                        sku: formData.sku,
                        barcode: formData.barcode || undefined,
                        basePrice: parseFloat(formData.basePrice) || 0,
                        baseCost: parseFloat(formData.baseCost) || 0,
                        unitOfMeasure: formData.unitOfMeasure,
                        trackInventory: formData.trackInventory,
                        allowNegativeStock: formData.allowNegativeStock,
                    }
                );

                if (result.success) {
                    onSuccess();
                    onClose();
                } else {
                    setError(result.error || 'Error al actualizar el producto');
                }
            }
        } catch (err) {
            setError('Error al actualizar el producto');
        } finally {
            setSaving(false);
        }
    };

    if (!product) return null;

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            title="Editar Producto"
            size="lg"
            data-test-id="update-product-dialog"
        >
            <div className="space-y-6">
                {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        {error}
                    </div>
                )}

                {/* Info de tipo de producto */}
                {product.hasVariants && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
                        Este producto tiene múltiples variantes. Los SKU y precios se editan desde la sección de Variantes.
                    </div>
                )}

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
                                data-test-id="input-name"
                            />
                        </div>
                        <TextField
                            label="Marca"
                            value={formData.brand}
                            onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
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
                                rows={2}
                                data-test-id="input-description"
                            />
                        </div>
                    </div>
                </div>

                {/* DATOS DE VARIANTE - Solo si NO tiene variantes múltiples */}
                {!product.hasVariants && (
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
                                    data-test-id="input-sku"
                                />
                                <TextField
                                    label="Código de barras"
                                    value={formData.barcode}
                                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
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
                {!product.hasVariants && (
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
                                <Switch
                                    label="Permitir stock negativo"
                                    checked={formData.allowNegativeStock}
                                    onChange={(checked) => setFormData({ ...formData, allowNegativeStock: checked })}
                                    data-test-id="switch-negative-stock"
                                />
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
                        disabled={saving || !formData.name || (!product.hasVariants && !formData.sku)}
                        data-test-id="btn-save"
                    >
                        {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                </div>
            </div>
        </Dialog>
    );
}
