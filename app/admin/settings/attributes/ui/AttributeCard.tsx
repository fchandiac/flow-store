'use client';

import React, { useState } from 'react';
import Badge from '@/app/baseComponents/Badge/Badge';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import DeleteAttributeDialog from './DeleteAttributeDialog';
import UpdateAttributeDialog from './UpdateAttributeDialog';

export interface AttributeType {
    id: string;
    name: string;
    description?: string;
    options: string[];
    displayOrder: number;
    isActive: boolean;
}

interface AttributeCardProps {
    attribute: AttributeType;
    'data-test-id'?: string;
}

const AttributeCard: React.FC<AttributeCardProps> = ({ 
    attribute, 
    'data-test-id': dataTestId 
}) => {
    const [showUpdateDialog, setShowUpdateDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    return (
        <>
            <div 
                className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
                data-test-id={dataTestId}
            >
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <h3 className="font-semibold text-lg">{attribute.name}</h3>
                        {attribute.description && (
                            <p className="text-sm text-muted-foreground">{attribute.description}</p>
                        )}
                    </div>
                    <div className="flex gap-1">
                        <IconButton
                            icon="edit"
                            onClick={() => setShowUpdateDialog(true)}
                            title="Editar"
                            data-test-id="btn-edit"
                        />
                        <IconButton
                            icon="delete"
                            onClick={() => setShowDeleteDialog(true)}
                            title="Eliminar"
                            data-test-id="btn-delete"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2 mb-3">
                    <Badge 
                        variant={attribute.isActive ? 'success' : 'secondary'}
                    >
                        {attribute.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                        {attribute.options.length} opciones
                    </span>
                </div>

                <div className="flex flex-wrap gap-1">
                    {attribute.options.slice(0, 8).map((option, index) => (
                        <Badge key={index} variant="secondary">
                            {option}
                        </Badge>
                    ))}
                    {attribute.options.length > 8 && (
                        <Badge variant="secondary">
                            +{attribute.options.length - 8} más
                        </Badge>
                    )}
                </div>
            </div>

            <UpdateAttributeDialog
                open={showUpdateDialog}
                onClose={() => setShowUpdateDialog(false)}
                attribute={attribute}
                data-test-id="update-attribute-dialog"
            />

            <DeleteAttributeDialog
                open={showDeleteDialog}
                onClose={() => setShowDeleteDialog(false)}
                attribute={attribute}
                data-test-id="delete-attribute-dialog"
            />
        </>
    );
};

export default AttributeCard;
