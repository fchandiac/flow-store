'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import DataGrid, { DataGridColumn } from '@/app/baseComponents/DataGrid/DataGrid';
import Select, { Option } from '@/app/baseComponents/Select/Select';
import Badge from '@/app/baseComponents/Badge/Badge';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import { Button } from '@/app/baseComponents/Button/Button';
import { getProducts, ProductWithDefaultVariant, VariantSummary } from '@/app/actions/products';
import { getCategories } from '@/app/actions/categories';
import { getTaxes } from '@/app/actions/taxes';
import { ProductType } from '@/data/entities/Product';
import { 
    CreateProductDialog, 
    UpdateProductDialog, 
    DeleteProductDialog,
    type ProductToEdit,
    type ProductToDelete 
} from './ui';
import {
    VariantCard,
    CreateVariantDialog,
    type VariantType
} from './variants/ui';

/**
 * Convierte VariantSummary a VariantType para usar los componentes existentes
 */
const toVariantType = (variant: VariantSummary, productId: string): VariantType => ({
    id: variant.id,
    productId,
    sku: variant.sku,
    barcode: variant.barcode,
    basePrice: variant.basePrice,
    baseCost: variant.baseCost,
    unitId: variant.unitId,
    unitOfMeasure: variant.unitOfMeasure,
    attributeValues: variant.attributeValues,
    displayName: variant.attributeValues && Object.keys(variant.attributeValues).length > 0
        ? Object.values(variant.attributeValues).join(', ')
        : 'Default',
    trackInventory: true,
    allowNegativeStock: false,
    isDefault: variant.isDefault,
    isActive: variant.isActive
});

/**
 * Panel expandible con UI completa de variantes (CRUD)
 */
const VariantsPanel = ({ 
    product, 
    onUpdate 
}: { 
    product: ProductWithDefaultVariant;
    onUpdate: () => void;
}) => {
    const [openCreateDialog, setOpenCreateDialog] = useState(false);

    if (!product.variants || product.variants.length === 0) {
        return (
            <div className="text-center py-6 text-neutral-500">
                <span className="material-symbols-outlined mb-2" style={{ fontSize: '2rem' }}>
                    style
                </span>
                <p>Este producto no tiene variantes</p>
                <p className="text-sm mt-1">Agrega variantes como tallas, colores o materiales</p>
                <Button
                    variant="outlined"
                    size="sm"
                    className="mt-4"
                    onClick={() => setOpenCreateDialog(true)}
                >
                    <span className="material-symbols-outlined mr-1" style={{ fontSize: '1rem' }}>
                        add
                    </span>
                    Agregar Variante
                </Button>
                <CreateVariantDialog
                    open={openCreateDialog}
                    onClose={() => {
                        setOpenCreateDialog(false);
                        onUpdate();
                    }}
                    productId={product.id}
                    productName={product.name}
                />
            </div>
        );
    }

    return (
        <>
            {/* Header con botón agregar */}
            <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-medium text-neutral-600">
                    Variantes del producto ({product.variants.length})
                </h4>
                <Button
                    variant="outlined"
                    size="sm"
                    onClick={() => setOpenCreateDialog(true)}
                >
                    <span className="material-symbols-outlined mr-1" style={{ fontSize: '1rem' }}>
                        add
                    </span>
                    Agregar Variante
                </Button>
            </div>

            {/* Grid de variantes */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {product.variants.map((variant) => (
                    <VariantCard
                        key={variant.id}
                        variant={toVariantType(variant, product.id)}
                        data-test-id={`variant-card-${variant.id}`}
                    />
                ))}
            </div>

            <CreateVariantDialog
                open={openCreateDialog}
                onClose={() => {
                    setOpenCreateDialog(false);
                    onUpdate();
                }}
                productId={product.id}
                productName={product.name}
            />
        </>
    );
};

interface CategoryOption extends Option {
    id: string;
    label: string;
}

/**
 * Catálogo de Productos
 * Ruta: /admin/inventory/products
 * CRUD de productos con DataGrid
 * 
 * Modelo actualizado:
 * - Product = datos maestros (nombre, marca, categoría)
 * - ProductVariant = SKU, precios, inventario
 * - Productos simples tienen una variante "default" creada automáticamente
 * - Productos con variantes muestran indicador de cantidad
 */
export default function ProductsPage() {
    const searchParams = useSearchParams();
    const router = useRouter();

    // State
    const [products, setProducts] = useState<ProductWithDefaultVariant[]>([]);
    const [categories, setCategories] = useState<CategoryOption[]>([]);
    const [taxes, setTaxes] = useState<Array<{ id: string; name: string; code: string; rate: number; isDefault: boolean }>>([]);
    const [totalRows, setTotalRows] = useState(0);
    const [loading, setLoading] = useState(true);
    
    // Dialog states
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [productToEdit, setProductToEdit] = useState<ProductToEdit | null>(null);
    const [productToDelete, setProductToDelete] = useState<ProductToDelete | null>(null);

    // URL params
    const search = searchParams.get('search') || '';
    const categoryFilter = searchParams.get('categoryId') || '';
    const statusFilter = searchParams.get('status') || '';

    // Load categories
    useEffect(() => {
        async function loadReferenceData() {
            try {
                const [cats, taxesResult] = await Promise.all([
                    getCategories({ isActive: true }),
                    getTaxes(),
                ]);

                setCategories(cats.map((c) => ({ id: c.id, label: c.name })));

                setTaxes(taxesResult.map((tax) => ({
                    id: tax.id,
                    name: tax.name,
                    code: tax.code,
                    rate: Number(tax.rate),
                    isDefault: Boolean(tax.isDefault),
                })));
            } catch (err) {
                console.error('Error loading reference data:', err);
            }
        }

        loadReferenceData();
    }, []);

    // Load products
    const loadProducts = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (search) params.search = search;
            if (categoryFilter) params.categoryId = categoryFilter;
            if (statusFilter === 'active') params.isActive = true;
            if (statusFilter === 'inactive') params.isActive = false;

            const data = await getProducts(params);
            setProducts(data);
            setTotalRows(data.length);
        } catch (err) {
            console.error('Error loading products:', err);
        } finally {
            setLoading(false);
        }
    }, [search, categoryFilter, statusFilter]);

    useEffect(() => {
        loadProducts();
    }, [loadProducts]);

    // Open edit dialog
    const handleEdit = (product: ProductWithDefaultVariant) => {
        setProductToEdit({
            id: product.id,
            name: product.name,
            description: product.description,
            brand: product.brand,
            categoryId: product.categoryId,
            productType: product.productType,
            trackInventory: product.trackInventory,
            allowNegativeStock: product.allowNegativeStock,
            hasVariants: product.hasVariants,
            isActive: product.isActive,
            // Datos de variante default
            sku: product.sku,
            barcode: product.barcode,
            basePrice: product.basePrice,
            baseCost: product.baseCost,
            unitId: product.unitId,
            unitOfMeasure: product.unitOfMeasure,
        });
        setUpdateDialogOpen(true);
    };

    // Open delete confirmation
    const handleDeleteClick = (product: ProductWithDefaultVariant) => {
        setProductToDelete({ id: product.id, name: product.name });
        setDeleteDialogOpen(true);
    };

    // Filter handlers
    const updateFilter = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        params.set('page', '1');
        router.replace(`?${params.toString()}`);
    };

    // DataGrid columns
    const columns: DataGridColumn[] = [
        {
            field: 'name',
            headerName: 'Producto',
            flex: 2,
            minWidth: 200,
            renderCell: ({ row }) => (
                <div className="flex flex-col py-1">
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{row.name}</span>
                        {row.hasVariants && (
                            <Badge variant="info">
                                {row.variantCount}
                            </Badge>
                        )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                        {row.sku || 'Sin SKU (agregar variantes)'}
                    </span>
                </div>
            ),
        },
        {
            field: 'brand',
            headerName: 'Marca',
            width: 120,
            renderCell: ({ value }) => (
                <span className="text-muted-foreground">{value || '-'}</span>
            ),
        },
        {
            field: 'categoryName',
            headerName: 'Categoría',
            flex: 1,
            minWidth: 120,
            renderCell: ({ value }) => value || '-',
        },
        {
            field: 'isActive',
            headerName: 'Estado',
            width: 100,
            align: 'center',
            headerAlign: 'center',
            renderCell: ({ value }) => (
                <Badge variant={value ? 'success' : 'error'}>
                    {value ? 'Activo' : 'Inactivo'}
                </Badge>
            ),
        },
        {
            field: 'actions',
            headerName: '',
            width: 100,
            align: 'center',
            sortable: false,
            filterable: false,
            renderCell: ({ row }) => (
                <div className="flex items-center gap-1">
                    <IconButton
                        icon="edit"
                        variant="basicSecondary"
                        size="xs"
                        onClick={() => handleEdit(row)}
                        title="Editar"
                    />
                    <IconButton
                        icon="delete"
                        variant="basicSecondary"
                        size="xs"
                        onClick={() => handleDeleteClick(row)}
                        title="Eliminar"
                    />
                </div>
            ),
        },
    ];

    // Status filter options
    const statusOptions: Option[] = [
        { id: '', label: 'Todos' },
        { id: 'active', label: 'Activos' },
        { id: 'inactive', label: 'Inactivos' },
    ];

    return (
        <div className="p-6 h-full flex flex-col">
            {/* DataGrid - Lista de productos */}
            <div className="flex-1">
                <DataGrid
                    title="Productos"
                    columns={columns}
                    rows={products}
                    totalRows={totalRows}
                    onAddClick={() => setCreateDialogOpen(true)}
                    data-test-id="products-grid"
                    height="80vh"
                    expandable={true}
                    expandableRowContent={(row: ProductWithDefaultVariant) => (
                        <VariantsPanel product={row} onUpdate={loadProducts} />
                    )}
                    headerActions={
                        <>
                            <div className="w-48">
                                <Select
                                    label="Categoría"
                                    options={[{ id: '', label: 'Todas' }, ...categories]}
                                    value={categoryFilter}
                                    onChange={(val) => updateFilter('categoryId', String(val || ''))}
                                    data-test-id="filter-category"
                                />
                            </div>
                            <div className="w-36">
                                <Select
                                    label="Estado"
                                    options={statusOptions}
                                    value={statusFilter}
                                    onChange={(val) => updateFilter('status', String(val || ''))}
                                    data-test-id="filter-status"
                                />
                            </div>
                        </>
                    }
                />
            </div>

            {/* Dialogs */}
            <CreateProductDialog
                open={createDialogOpen}
                onClose={() => setCreateDialogOpen(false)}
                onSuccess={loadProducts}
                categories={categories}
                taxes={taxes}
            />

            <UpdateProductDialog
                open={updateDialogOpen}
                onClose={() => {
                    setUpdateDialogOpen(false);
                    setProductToEdit(null);
                }}
                onSuccess={loadProducts}
                product={productToEdit}
                categories={categories}
            />

            <DeleteProductDialog
                open={deleteDialogOpen}
                onClose={() => {
                    setDeleteDialogOpen(false);
                    setProductToDelete(null);
                }}
                onSuccess={loadProducts}
                product={productToDelete}
            />
        </div>
    );
}
