'use client'
import React from 'react';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import { useRouter, useSearchParams } from 'next/navigation';
import type { DataGridColumn } from '../DataGrid';
import { useAlert } from '@/app/globalstate/alert/useAlert';

interface ToolbarProps {
  filterMode?: boolean;
  onToggleFilterMode?: () => void;
  columns?: DataGridColumn[];
  title?: string;
  onExportExcel?: () => Promise<void>; // Callback para exportar a Excel
  showSortButton?: boolean;
  showFilterButton?: boolean;
  showExportButton?: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({
  filterMode = false,
  onToggleFilterMode,
  columns = [],
  title = '',
  onExportExcel,
  showSortButton = true,
  showFilterButton = true,
  showExportButton = true,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showAlert } = useAlert();

  // Determine active sortField from URL
  const activeSortField = searchParams.get('sortField');

  // First visible column field
  const firstVisible = columns.find((c) => !c.hide)?.field;

  const handleQuickSort = () => {
    if (!firstVisible) return;
    const params = new URLSearchParams(searchParams.toString());
    if (isSortActive) {
      // If already active, remove sorting params
      params.delete('sort');
      params.delete('sortField');
    } else {
      // Activate sort on first visible column
      params.set('sort', 'asc');
      params.set('sortField', firstVisible);
      params.set('page', '1');
    }
    router.replace(`?${params.toString()}`);
  };

  const handleExportExcel = async () => {
    if (onExportExcel) {
      try {
        await onExportExcel();
      } catch (error) {
        console.error('Error exporting to Excel:', error);
        showAlert({ message: 'Error al exportar a Excel', type: 'error', duration: 4000 });
      }
    } else {
      showAlert({ message: 'Exportación no disponible', type: 'warning', duration: 4000 });
    }
  };

  const isSortActive = activeSortField === firstVisible;

  return (
    <div className="flex justify-end items-center gap-4 py-2" data-test-id="data-grid-toolbar">
      {/* Quick sort button: sets sort=asc and sortField=first visible column */}
      {showSortButton && firstVisible ? (
        <IconButton
          variant="text"
          title="Ordenar por primer campo (asc)"
          onClick={handleQuickSort}
          icon="sort"
          className={isSortActive ? 'text-primary' : 'text-secondary'}
          style={{ fontSize: 20, width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
        />
      ) : null}

      {/* Material Symbols filter icon - cambia según filterMode */}
      {showFilterButton ? (
        <IconButton
          variant="text"
          title={filterMode ? 'Desactivar filtros' : 'Filtrar'}
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString());
            if (filterMode) {
              // Clear filters when deactivating
              params.delete('filters');
              params.delete('filtration');
              router.replace(`?${params.toString()}`);
            } else {
              // Activate filtration when enabling filter mode
              params.set('filtration', 'true');
              router.replace(`?${params.toString()}`);
            }
            onToggleFilterMode?.();
          }}
          icon={filterMode ? 'filter_alt_off' : 'filter_alt'}
          className="text-secondary"
          style={{ fontSize: 20, width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
        />
      ) : null}
      {/* Excel export icon - using Material Symbol for perfect alignment */}
      {showExportButton ? (
        <IconButton
          variant="text"
          title="Exportar a Excel"
          onClick={handleExportExcel}
          icon="file_download"
          className="text-secondary"
          style={{ fontSize: 20, width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
        />
      ) : null}
    </div>
  );
};

export default Toolbar;
