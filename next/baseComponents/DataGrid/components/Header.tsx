'use client'
import React, { useState, useCallback } from 'react';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import Toolbar from './Toolbar';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import { usePathname, useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { ColHeader } from './ColHeader';
import { calculateColumnStyles, useScreenSize } from '../utils/columnStyles';
import type { DataGridColumn } from '../DataGrid';
import Dialog from '@/app/baseComponents/Dialog/Dialog';

interface HeaderProps {
  title: string;
  filterMode?: boolean;
  onToggleFilterMode?: () => void;
  columns?: DataGridColumn[];
  createForm?: React.ReactNode;
  createFormTitle?: string;
  onAddClick?: () => void; // Callback para el botón + (abre diálogo externo)
  screenWidth?: number;
  onExportExcel?: () => Promise<void>;
  headerActions?: React.ReactNode; // Slot para componentes adicionales (ej: filtros externos)
  showSortButton?: boolean;
  showFilterButton?: boolean;
  showExportButton?: boolean;
  showSearch?: boolean;
  onSearchChange?: (value: string) => void;
}

const Header: React.FC<HeaderProps> = ({
  title,
  filterMode = false,
  onToggleFilterMode,
  columns = [],
  createForm,
  createFormTitle,
  onAddClick,
  screenWidth = 1024,
  onExportExcel,
  headerActions,
  showSortButton = true,
  showFilterButton = true,
  showExportButton = true,
  showSearch = true,
  onSearchChange,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');

  const searchValue = searchParams.get('search') || '';
  const filtration = searchParams.get('filtration') === 'true';

  // Debounce search updates to avoid excessive URL changes
  const debounceTimer = React.useRef<NodeJS.Timeout | null>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    setSearchInput(value);

    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new timer for 300ms debounce
    debounceTimer.current = setTimeout(() => {
      if (onSearchChange) {
        onSearchChange(value);
      } else {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
          params.set('search', value);
        } else {
          params.delete('search');
        }
        // Reset to page 1 when searching
        params.set('page', '1');
        router.replace(`?${params.toString()}`);
      }
    }, 300);
  }, [searchParams, router, onSearchChange]);

  // Calcular estilos computados para las columnas usando utilidad centralizada
  const computedStyles = calculateColumnStyles(columns, screenWidth);

  // border-b border-gray-300 bg-gray-100
  return (
    <div className="w-full" data-test-id="data-grid-header">
      {/* Primera fila: Add button + Title + (Toolbar + Search en desktop) */}
      <div className="flex items-center w-full px-4 pt-4 pb-2">
        {/* Add button - usa onAddClick si está definido, sino abre el modal interno */}
        {(createForm || onAddClick) && (
          <div className="flex items-center mr-4">
            <IconButton 
              icon="add" 
              variant="ghost" 
              size="md"
              onClick={onAddClick || (() => setIsCreateModalOpen(true))}
              data-test-id="add-button"
            />
          </div>
        )}
        
        {/* Title */}
        <div className="text-lg font-semibold text-gray-800 mr-6 whitespace-nowrap">
          {title}
        </div>

        {/* Header Actions Slot - componentes externos como filtros, centrados en el espacio disponible */}
        {headerActions && (
          <div className="hidden sm:flex flex-1 items-center justify-center gap-3" data-test-id="header-actions-slot">
            {headerActions}
          </div>
        )}

        {/* Spacer para empujar toolbar a la derecha (solo si no hay headerActions) */}
        {!headerActions && <div className="flex-1" />}
        
        {/* Toolbar y Search - solo visible en sm y superior */}
        <div className="hidden sm:flex items-center gap-4 ml-4">
          {/* Toolbar */}
          <div className="flex-shrink-0">
            <Toolbar
              filterMode={filterMode}
              onToggleFilterMode={onToggleFilterMode}
              columns={columns}
              title={title}
              onExportExcel={onExportExcel}
              showSortButton={showSortButton}
              showFilterButton={showFilterButton}
              showExportButton={showExportButton}
            />
          </div>
          {/* Search field */}
          {showSearch && (
            <div className="flex items-center">
              <TextField
                label=""
                value={searchInput}
                onChange={handleChange}
                placeholder="Buscar..."
                startIcon="search"
                className="w-full sm:w-64"
                data-test-id="data-grid-search-input"
              />
            </div>
          )}
        </div>
      </div>

      {/* Mobile Toolbar and Search */}
      
      {/* Segunda fila: Header Actions (móvil) - solo si hay headerActions */}
      {headerActions && (
        <div className="flex sm:hidden items-center justify-center gap-3 mt-3" data-test-id="header-actions-slot-mobile">
          {headerActions}
        </div>
      )}

      {/* Tercera fila: Toolbar + Search - solo visible en móvil (menor a sm) */}
      <div className="flex sm:hidden items-start justify-end gap-4 mt-3">
        {/* Toolbar */}
        <div>
          <Toolbar
            columns={columns}
            title={title}
            onExportExcel={onExportExcel}
            filterMode={filterMode}
            onToggleFilterMode={onToggleFilterMode}
            showSortButton={showSortButton}
            showFilterButton={showFilterButton}
            showExportButton={showExportButton}
          />
        </div>
        {/* Search field */}
        <div className="flex items-start flex-1 max-w-xs">
          <label htmlFor="datagrid-search-mobile" className="sr-only">Buscar</label>
          <TextField
            label="Buscar"
            placeholder="Buscar..."
            name="datagrid-search-mobile"
            value={searchInput}
            onChange={handleChange}
            startIcon={"search"}
            className="text-sm w-full"
          />
        </div>
      </div>
      
      {/* Create Modal */}
      {createForm && (
        <Dialog 
          open={isCreateModalOpen} 
          onClose={() => setIsCreateModalOpen(false)} 
          size="lg"
          scroll="body"
          hideActions={true}
          title={createFormTitle}
        >
          {/* Wrapper to pass onClose to createForm */}
          {React.isValidElement(createForm)
            ? React.cloneElement(createForm, {
                onClose: () => setIsCreateModalOpen(false),
              } as any)
            : createForm}
        </Dialog>
      )}
    </div>
  );
};

export default Header;
