'use client';

import { useEffect, useMemo, useState } from 'react';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import Select, { Option } from '@/app/baseComponents/Select/Select';
import { Button } from '@/app/baseComponents/Button/Button';
import Switch from '@/app/baseComponents/Switch/Switch';
import { createProductMaster } from '@/app/actions/products';
import { getActiveUnits } from '@/app/actions/units';
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

interface UnitOption extends Option {
    id: string;
    label: string;
    symbol: string;
    dimension: string;
    conversionFactor: number;
    isBase: boolean;
    baseUnitId: string;
    name: string;
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
    baseUnitId: string;
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
    baseUnitId: '',
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
    const [units, setUnits] = useState<UnitOption[]>([]);
    const [loadingUnits, setLoadingUnits] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const resetForm = () => {
        setFormData(getInitialFormData());
    };

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

    useEffect(() => {
        if (!open) {
            return;
        }

        let cancelled = false;
        const loadUnits = async () => {
            setLoadingUnits(true);
            try {
                const activeUnits = await getActiveUnits();
                if (cancelled) {
                    return;
                }
                const mappedUnits: UnitOption[] = activeUnits.map((unit) => ({
                    id: unit.id,
                    label: `${unit.symbol} · ${unit.name}`,
                    symbol: unit.symbol,
                    dimension: unit.dimension,
                    conversionFactor: Number(unit.conversionFactor ?? 1),
                    isBase: Boolean(unit.isBase),
                    baseUnitId: unit.baseUnitId,
                    name: unit.name,
                }));
                setUnits(mappedUnits);
            } catch (err) {
                if (!cancelled) {
                    console.error('Error loading units', err);
                    setUnits([]);
                }
            } finally {
                if (!cancelled) {
                    setLoadingUnits(false);
                }
            }
        };

        loadUnits();

        return () => {
            cancelled = true;
        };
    }, [open]);

    const baseUnitSelectOptions = useMemo<Option[]>(() => {
        return units
            .filter((unit) => unit.isBase)
            .map((unit) => ({ id: unit.id, label: `${unit.symbol} · ${unit.name}` }));
    }, [units]);

    useEffect(() => {
        if (!open || units.length === 0) {
            return;
        }

        setFormData((prev) => {
            if (prev.baseUnitId) {
                return prev;
            }

            const defaultBase = units.find((unit) => unit.isBase && unit.dimension === 'count')
                ?? units.find((unit) => unit.isBase)
                ?? null;

            return defaultBase ? { ...prev, baseUnitId: defaultBase.id } : prev;
        });
    }, [open, units]);

    const handleSave = async () => {
        setSaving(true);
        setError(null);

        try {
            if (!formData.name.trim()) {
                setError('Debes ingresar un nombre de producto.');
                return;
            }

            if (!formData.baseUnitId) {
                setError('Debes seleccionar una unidad base.');
                return;
            }

            const baseUnit = units.find((unit) => unit.id === formData.baseUnitId);
            if (!baseUnit || !baseUnit.isBase) {
                setError('Debes seleccionar una unidad base válida.');
                return;
            }

            const result = await createProductMaster({
                name: formData.name,
                description: formData.description || undefined,
                brand: formData.brand || undefined,
                categoryId: formData.categoryId || undefined,
                productType: formData.productType,
                taxIds: formData.taxIds.length > 0 ? formData.taxIds : undefined,
                isActive: formData.isActive,
                baseUnitId: baseUnit.id,
            });

            if (result.success && result.product) {
                const { id, name } = result.product;
                resetForm();
                onSuccess();
                onClose();
                if (onProductCreated) {
                    onProductCreated(id, name);
                }
            } else {
                setError(result.error || 'Error al crear el producto');
            }
        } catch (err) {
            setError('Error al crear el producto');
        } finally {
            setSaving(false);
        }
    };
    const isValid = Boolean(formData.name.trim())
        && Boolean(formData.baseUnitId)
        && (!loadingUnits && baseUnitSelectOptions.length > 0);

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
                        <Select
                            label="Unidad base"
                            required
                            options={baseUnitSelectOptions}
                            value={formData.baseUnitId}
                            onChange={(val) => setFormData({ ...formData, baseUnitId: val ? String(val) : '' })}
                            placeholder={loadingUnits ? 'Cargando unidades...' : 'Selecciona unidad base'}
                            disabled={loadingUnits || baseUnitSelectOptions.length === 0}
                            data-test-id="select-base-unit"
                        />
                        {!loadingUnits && baseUnitSelectOptions.length === 0 && (
                            <div className="md:col-span-2 text-xs text-amber-600">
                                No hay unidades base activas disponibles. Configura al menos una unidad base en
                                Configuración → Unidades antes de crear productos.
                            </div>
                        )}
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
                <div className="rounded-md bg-muted/40 border border-border px-4 py-3 text-sm text-muted-foreground">
                    Registra solo la información del producto maestro. Las variantes (SKU, precios y stock) se
                    configurarán en un paso posterior.
                </div>

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
