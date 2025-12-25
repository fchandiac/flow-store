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
}

const Header: React.FC<HeaderProps> = ({ title, filterMode = false, onToggleFilterMode, columns = [], createForm, createFormTitle, onAddClick, screenWidth = 1024, onExportExcel }) => {
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
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set('search', value);
      } else {
        params.delete('search');
      }
      // Reset to page 1 when searching
      params.set('page', '1');
      router.replace(`?${params.toString()}`);
    }, 300);
  }, [searchParams, router]);

  // Calcular estilos computados para las columnas usando utilidad centralizada
  const computedStyles = calculateColumnStyles(columns, screenWidth);

  // border-b border-gray-300 bg-gray-100
  return (
    <div className="w-full py-4 px-3" data-test-id="data-grid-header">
      {/* Primera fila: Add button + Title + (Toolbar + Search en desktop) */}
      <div className="flex items-center w-full">
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
        <div className="flex-1 text-lg font-semibold text-gray-800 mr-4">
          {title}
        </div>
        
        {/* Toolbar y Search - solo visible en sm y superior */}
        <div className="hidden sm:flex items-center gap-4">
          {/* Toolbar */}
          <div>
            <Toolbar filterMode={filterMode} onToggleFilterMode={onToggleFilterMode} columns={columns} title={title} onExportExcel={onExportExcel} />
          </div>
          {/* Search field */}
          <div className="flex items-center">
            <label htmlFor="datagrid-search" className="sr-only">Buscar</label>
            <div className="w-48">
              <TextField
                label="Buscar"
                placeholder="Buscar..."
                name="datagrid-search"
                value={searchInput}
                onChange={handleChange}
                startIcon={"search"}
                className="text-sm"
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Segunda fila: Toolbar + Search - solo visible en móvil (menor a sm) */}
      <div className="flex sm:hidden items-center justify-end gap-4 mt-3">
        {/* Toolbar */}
        <div>
          <Toolbar columns={columns} title={title} onExportExcel={onExportExcel} />
        </div>
        {/* Search field */}
        <div className="flex items-center flex-1 max-w-xs">
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
