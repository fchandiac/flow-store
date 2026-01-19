'use client';

import { useState } from 'react';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import CategoryCard, { CategoryType } from './CategoryCard';
import CreateCategoryDialog from './CreateCategoryDialog';

interface CategoryListProps {
    categories: CategoryType[];
    'data-test-id'?: string;
}

const CategoryList: React.FC<CategoryListProps> = ({ 
    categories, 
    'data-test-id': dataTestId 
}) => {
    const [openCreateDialog, setOpenCreateDialog] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredCategories = searchTerm
        ? categories.filter(c => {
            return (
                c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.description?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        })
        : categories;

    // Ordenar: primero las categorías raíz, luego por sortOrder
    const sortedCategories = [...filteredCategories].sort((a, b) => {
        // Primero por si tiene padre o no
        if (!a.parentId && b.parentId) return -1;
        if (a.parentId && !b.parentId) return 1;
        // Luego por sortOrder
        return a.sortOrder - b.sortOrder;
    });

    return (
        <div className="space-y-6" data-test-id={dataTestId}>
            <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
                <IconButton
                    icon="add"
                    variant="outlined"
                    aria-label="Agregar categoría"
                    onClick={() => setOpenCreateDialog(true)}
                    data-test-id="create-category-button"
                />
                <div className="w-full max-w-sm flex-1 min-w-[200px]">
                    <TextField
                        label="Buscar"
                        placeholder="Buscar categoría..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        startIcon="search"
                        data-test-id="category-search"
                    />
                </div>
            </div>

            {sortedCategories.length === 0 ? (
                <div className="text-center py-12 bg-neutral-50 rounded-lg border border-neutral-200">
                    <span className="material-symbols-outlined text-neutral-400 mb-3" style={{ fontSize: '3rem' }}>
                        folder_off
                    </span>
                    <p className="text-neutral-600 font-medium">
                        {searchTerm ? 'No se encontraron categorías' : 'No hay categorías'}
                    </p>
                    <p className="text-neutral-500 mt-1">
                        {searchTerm ? 'Intenta con otro término de búsqueda' : 'Crea la primera categoría para comenzar'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sortedCategories.map((category) => (
                        <CategoryCard
                            key={category.id}
                            category={category}
                            allCategories={categories}
                            data-test-id={`category-card-${category.id}`}
                        />
                    ))}
                </div>
            )}

            <CreateCategoryDialog
                open={openCreateDialog}
                onClose={() => setOpenCreateDialog(false)}
                allCategories={categories}
                data-test-id="create-category-dialog"
            />
        </div>
    );
};

export default CategoryList;
