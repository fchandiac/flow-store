'use client';

import { useState } from 'react';
import { Button } from '@/app/baseComponents/Button/Button';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import AttributeCard, { AttributeType } from './AttributeCard';
import CreateAttributeDialog from './CreateAttributeDialog';

interface AttributeListProps {
    attributes: AttributeType[];
    'data-test-id'?: string;
}

const AttributeList: React.FC<AttributeListProps> = ({ 
    attributes, 
    'data-test-id': dataTestId 
}) => {
    const [search, setSearch] = useState('');
    const [showCreateDialog, setShowCreateDialog] = useState(false);

    const filteredAttributes = attributes.filter(attr =>
        attr.name.toLowerCase().includes(search.toLowerCase()) ||
        attr.options.some(opt => opt.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div data-test-id={dataTestId}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Atributos de Variantes</h1>
                    <p className="text-sm text-muted-foreground">
                        Define los atributos (Color, Talla, etc.) y sus opciones para las variantes de productos
                    </p>
                </div>
                <Button 
                    onClick={() => setShowCreateDialog(true)}
                    data-test-id="btn-create-attribute"
                >
                    Nuevo Atributo
                </Button>
            </div>

            <div className="mb-6">
                <TextField
                    label=""
                    placeholder="Buscar atributos..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    data-test-id="input-search"
                />
            </div>

            {filteredAttributes.length === 0 ? (
                <div className="text-center py-12 bg-muted/50 rounded-lg">
                    <p className="text-muted-foreground">
                        {search ? 'No se encontraron atributos' : 'No hay atributos creados'}
                    </p>
                    {!search && (
                        <Button 
                            variant="secondary" 
                            onClick={() => setShowCreateDialog(true)}
                            className="mt-4"
                        >
                            Crear primer atributo
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredAttributes.map((attribute) => (
                        <AttributeCard 
                            key={attribute.id} 
                            attribute={attribute}
                            data-test-id={`attribute-card-${attribute.id}`}
                        />
                    ))}
                </div>
            )}

            <CreateAttributeDialog
                open={showCreateDialog}
                onClose={() => setShowCreateDialog(false)}
                data-test-id="create-attribute-dialog"
            />
        </div>
    );
};

export default AttributeList;
