'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import DataGrid, { DataGridColumn } from '@/app/baseComponents/DataGrid/DataGrid';
import Select, { Option } from '@/app/baseComponents/Select/Select';
import Badge from '@/app/baseComponents/Badge/Badge';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import { getProducts, ProductWithDefaultVariant } from '@/app/actions/products';
import { getCategories } from '@/app/actions/categories';
import { ProductType } from '@/data/entities/Product';
import { 
    CreateProductDialog, 
    UpdateProductDialog, 
    DeleteProductDialog,
    type ProductToEdit,
    type ProductToDelete 
} from './ui';

interface CategoryOption extends Option {
    id: string;
    label: string;
}

/**
 * Catálogo de Productos
 * Ruta: /admin/products
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
        async function loadCategories() {
            try {
                const cats = await getCategories({ isActive: true });
                setCategories(cats.map(c => ({ id: c.id, label: c.name })));
            } catch (err) {
                console.error('Error loading categories:', err);
            }
        }
        loadCategories();
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
                                {row.variantCount} variantes
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
            field: 'basePrice',
            headerName: 'Precio',
            width: 100,
            align: 'right',
            headerAlign: 'right',
            renderCell: ({ row }) => (
                row.basePrice !== undefined ? (
                    <span className="font-medium">${Number(row.basePrice).toLocaleString('es-CL')}</span>
                ) : (
                    <span className="text-muted-foreground text-xs">Ver variantes</span>
                )
            ),
        },
        {
            field: 'baseCost',
            headerName: 'Costo',
            width: 100,
            align: 'right',
            headerAlign: 'right',
            renderCell: ({ row }) => (
                row.baseCost !== undefined ? (
                    <span className="text-muted-foreground">${Number(row.baseCost).toLocaleString('es-CL')}</span>
                ) : (
                    <span className="text-muted-foreground text-xs">-</span>
                )
            ),
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
                        size="sm"
                        onClick={() => handleEdit(row)}
                        title="Editar"
                    />
                    <IconButton
                        icon="delete"
                        variant="basicSecondary"
                        size="sm"
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
            {/* Filtros */}
            <div className="flex flex-wrap items-center gap-4 mb-4">
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
            </div>

            {/* DataGrid - Lista de productos */}
            <div className="flex-1">
                <DataGrid
                    title="Productos"
                    columns={columns}
                    rows={products}
                    totalRows={totalRows}
                    onAddClick={() => setCreateDialogOpen(true)}
                    data-test-id="products-grid"
                    height="calc(100vh - 280px)"
                />
            </div>

            {/* Dialogs */}
            <CreateProductDialog
                open={createDialogOpen}
                onClose={() => setCreateDialogOpen(false)}
                onSuccess={loadProducts}
                categories={categories}
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
