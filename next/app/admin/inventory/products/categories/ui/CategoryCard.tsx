'use client';

import React, { useState } from 'react';
import Badge from '@/app/baseComponents/Badge/Badge';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import DeleteCategoryDialog from './DeleteCategoryDialog';
import UpdateCategoryDialog from './UpdateCategoryDialog';

export interface CategoryType {
    id: string;
    parentId?: string;
    name: string;
    description?: string;
    sortOrder: number;
    imagePath?: string;
    isActive: boolean;
    parent?: CategoryType;
    childrenCount?: number;
    productsCount?: number;
}

interface CategoryCardProps {
    category: CategoryType;
    allCategories: CategoryType[];
    'data-test-id'?: string;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ 
    category, 
    allCategories,
    'data-test-id': dataTestId 
}) => {
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [openUpdateDialog, setOpenUpdateDialog] = useState(false);

    const parentCategory = category.parentId 
        ? allCategories.find(c => c.id === category.parentId)
        : null;

    return (
        <>
            <div 
                className="bg-white rounded-lg border border-neutral-200 p-4 hover:shadow-md transition-shadow"
                data-test-id={dataTestId}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-neutral-800 truncate">
                                {category.name}
                            </h3>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                        <IconButton
                            icon="edit"
                            variant="basicSecondary"
                            onClick={() => setOpenUpdateDialog(true)}
                            data-test-id={`edit-category-${category.id}`}
                        />
                        <IconButton
                            icon="delete"
                            variant="basicSecondary"
                            onClick={() => setOpenDeleteDialog(true)}
                            data-test-id={`delete-category-${category.id}`}
                        />
                    </div>
                </div>

                {category.description && (
                    <p className="text-sm text-neutral-600 mt-3 line-clamp-2">
                        {category.description}
                    </p>
                )}

                <div className="flex flex-wrap items-center gap-2 mt-3">
                    <Badge variant={category.isActive ? 'success-outlined' : 'secondary-outlined'}>
                        {category.isActive ? 'Activa' : 'Inactiva'}
                    </Badge>
                    {parentCategory && (
                        <Badge variant="secondary-outlined">
                            <span className="material-symbols-outlined mr-1" style={{ fontSize: '0.875rem' }}>
                                subdirectory_arrow_right
                            </span>
                            {parentCategory.name}
                        </Badge>
                    )}
                </div>

                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-neutral-100">
                    {category.childrenCount !== undefined && category.childrenCount > 0 && (
                        <div className="flex items-center gap-1 text-sm text-neutral-500">
                            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
                                folder
                            </span>
                            <span>{category.childrenCount} subcategoría{category.childrenCount !== 1 ? 's' : ''}</span>
                        </div>
                    )}
                    {category.productsCount !== undefined && category.productsCount > 0 && (
                        <div className="flex items-center gap-1 text-sm text-neutral-500">
                            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
                                inventory_2
                            </span>
                            <span>{category.productsCount} producto{category.productsCount !== 1 ? 's' : ''}</span>
                        </div>
                    )}
                    {(!category.childrenCount && !category.productsCount) && (
                        <div className="text-sm text-neutral-400">
                            Sin subcategorías ni productos
                        </div>
                    )}
                </div>
            </div>

            <UpdateCategoryDialog
                open={openUpdateDialog}
                onClose={() => setOpenUpdateDialog(false)}
                category={category}
                allCategories={allCategories}
                data-test-id={`update-category-dialog-${category.id}`}
            />

            <DeleteCategoryDialog
                open={openDeleteDialog}
                onClose={() => setOpenDeleteDialog(false)}
                category={category}
                data-test-id={`delete-category-dialog-${category.id}`}
            />
        </>
    );
};

export default CategoryCard;
