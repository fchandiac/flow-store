'use client';

import { useState, useEffect } from 'react';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import Select, { Option } from '@/app/baseComponents/Select/Select';
import { Button } from '@/app/baseComponents/Button/Button';
import Switch from '@/app/baseComponents/Switch/Switch';
import { updateProduct } from '@/app/actions/products';
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
    isActive: boolean;
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
        isActive: true,
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
                isActive: product.isActive,
            });
            setError(null);
        } else {
            setFormData({
                name: '',
                description: '',
                brand: '',
                categoryId: '',
                productType: ProductType.PHYSICAL,
                isActive: true,
            });
        }
    }, [product]);

    const handleClose = () => {
        setError(null);
        onClose();
    };

    const handleSave = async () => {
        if (!product) return;

        if (!formData.name.trim()) {
            setError('Debe ingresar un nombre de producto');
            return;
        }

        setSaving(true);
        setError(null);

        try {
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

                <div className="rounded-md bg-muted/40 border border-border px-4 py-3 text-sm text-muted-foreground">
                    Las variantes (SKU, precios e inventario) se administran desde la vista de Variantes.
                </div>

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
                        disabled={saving || !formData.name.trim()}
                        data-test-id="btn-save"
                    >
                        {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                </div>
            </div>
        </Dialog>
    );
}
