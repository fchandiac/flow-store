'use client';

import { useEffect, useState } from 'react';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import Select, { Option } from '@/app/baseComponents/Select/Select';
import { Button } from '@/app/baseComponents/Button/Button';
import Switch from '@/app/baseComponents/Switch/Switch';
import { createProductMaster } from '@/app/actions/products';
import { ProductType } from '@/data/entities/Product';

interface CategoryOption extends Option {
    id: string;
    label: string;
}

interface TaxSummary {
    id: string;
    name: string;
    code: string;
    rate: number;
    isDefault?: boolean;
}

interface CreateProductDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    categories: CategoryOption[];
    taxes: TaxSummary[];
    onProductCreated?: (productId: string, productName: string) => void;
}

interface FormState {
    name: string;
    description: string;
    brand: string;
    categoryId: string;
    productType: ProductType;
    isActive: boolean;
    taxIds: string[];
    hasVariants: boolean;
}

const productTypeOptions: Option[] = [
    { id: ProductType.PHYSICAL, label: 'Producto físico' },
    { id: ProductType.SERVICE, label: 'Servicio' },
    { id: ProductType.DIGITAL, label: 'Digital' },
];

const getInitialFormData = (): FormState => ({
    name: '',
    description: '',
    brand: '',
    categoryId: '',
    productType: ProductType.PHYSICAL,
    isActive: true,
    taxIds: [],
    hasVariants: false,
});

export default function CreateProductDialog({
    open,
    onClose,
    onSuccess,
    categories,
    taxes,
    onProductCreated,
}: CreateProductDialogProps) {
    const [formData, setFormData] = useState<FormState>(getInitialFormData);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const resetForm = () => setFormData(getInitialFormData());

    const handleClose = () => {
        resetForm();
        setError(null);
        onClose();
    };

    useEffect(() => {
        if (!open) {
            resetForm();
            setSaving(false);
            setError(null);
            return;
        }

        setFormData((prev) => {
            if (prev.name.trim() || prev.taxIds.length > 0) {
                return prev;
            }

            const defaultTaxIds = taxes.filter((tax) => tax.isDefault).map((tax) => tax.id);
            return defaultTaxIds.length > 0 ? { ...prev, taxIds: defaultTaxIds } : prev;
        });
    }, [open, taxes]);

    const handleSave = async () => {
        setSaving(true);
        setError(null);

        try {
            const result = await createProductMaster({
                name: formData.name,
                description: formData.description || undefined,
                brand: formData.brand || undefined,
                categoryId: formData.categoryId || undefined,
                productType: formData.productType,
                taxIds: formData.taxIds.length > 0 ? formData.taxIds : undefined,
                hasVariants: formData.hasVariants,
                isActive: formData.isActive,
            });

            if (result.success && result.product) {
                const { id, name } = result.product;
                resetForm();
                onSuccess();
                onClose();
                if (onProductCreated) {
                    onProductCreated(id, name);
                }
            } else if (!result.success) {
                setError(result.error || 'Error al crear el producto');
            }
        } catch (err) {
            setError('Error al crear el producto');
        } finally {
            setSaving(false);
        }
    };

    const isValid = Boolean(formData.name.trim());

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
                                placeholder="Nombre del producto"
                                data-test-id="input-name"
                            />
                        </div>
                        <TextField
                            label="Marca"
                            value={formData.brand}
                            onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                            placeholder="Marca"
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
                                placeholder="Descripción"
                                rows={2}
                                data-test-id="input-description"
                            />
                        </div>
                    </div>
                </div>

                <Switch
                    label="Este producto tendrá variantes"
                    checked={formData.hasVariants}
                    onChange={(checked) => setFormData({ ...formData, hasVariants: checked })}
                    data-test-id="switch-has-variants"
                />

                <div className="pt-2 border-t border-border">
                    <Switch
                        label="Producto activo"
                        checked={formData.isActive}
                        onChange={(checked) => setFormData({ ...formData, isActive: checked })}
                        data-test-id="switch-active"
                    />
                </div>

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
