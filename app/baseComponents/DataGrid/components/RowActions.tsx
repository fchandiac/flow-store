'use client'
import React from 'react';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import type { DataGridColumn } from '../DataGrid';

interface RowActionsProps {
  row: any;
  column: DataGridColumn;
}

// Componente de ejemplo para acciones de fila
export const RowActions: React.FC<RowActionsProps> = ({ row, column }) => {
  const handleEdit = () => {
    console.log('Editar fila:', row);
    // Aquí puedes implementar la lógica de edición
    // Por ejemplo: abrir un modal, navegar a una página de edición, etc.
  };

  const handleDelete = () => {
    console.log('Eliminar fila:', row);
    // Aquí puedes implementar la lógica de eliminación
    // Por ejemplo: mostrar confirmación, llamar a una API, etc.
  };

  const handleView = () => {
    console.log('Ver detalles de fila:', row);
    // Aquí puedes implementar la lógica de vista de detalles
  };

  return (
    <div className="flex items-center gap-1 justify-center" data-test-id={`data-grid-row-actions-${row.id ?? row._id ?? row.key ?? row.index}`}>
      <IconButton
        icon="visibility"
        variant="text"
        size="xs"
        title="Ver detalles"
        onClick={handleView}
        className="text-blue-600 hover:text-blue-800"
      />
      <IconButton
        icon="edit"
        variant="text"
        size="xs"
        title="Editar"
        onClick={handleEdit}
        className="text-green-600 hover:text-green-800"
      />
      <IconButton
        icon="delete"
        variant="text"
        size="xs"
        title="Eliminar"
        onClick={handleDelete}
        className="text-red-600 hover:text-red-800"
      />
    </div>
  );
};

// Ejemplo de uso en configuración de columnas:
/*
const columns: DataGridColumn[] = [
  {
    field: 'id',
    headerName: 'ID',
    width: 80,
  },
  {
    field: 'name',
    headerName: 'Nombre',
    flex: 1,
  },
  {
    field: 'actions',
    headerName: 'Acciones',
    width: 120,
    align: 'center',
    sortable: false,
    actionComponent: RowActions, // ← Aquí se especifica el componente
  },
];
*/

export default RowActions;
