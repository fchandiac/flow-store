'use client'
import React, { useCallback, useRef, useState, useEffect } from 'react';
import type { DataGridColumn } from '../DataGrid';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import { useSearchParams, useRouter } from 'next/navigation';

interface ColHeaderProps {
  column: DataGridColumn;
  computedStyle?: Record<string, any>;
  filterMode?: boolean;
}

// Parse filters from URL format: "column1-value1,column2-value2"
function parseFiltersFromUrl(filtersParam: string): Record<string, string> {
  if (!filtersParam) return {};
  
  const filters: Record<string, string> = {};
  const filterPairs = filtersParam.split(',');
  
  filterPairs.forEach(pair => {
    const [column, ...valueParts] = pair.split('-');
    if (column && valueParts.length > 0) {
      filters[column] = decodeURIComponent(valueParts.join('-')); // Decode to handle special chars
    }
  });
  
  return filters;
}

export const ColHeader: React.FC<ColHeaderProps> = ({ column, computedStyle, filterMode = false }) => {
  const { headerName, headerAlign, align, width, flex, minWidth, maxWidth, field, filterable = true } = column;
  const searchParams = useSearchParams();
  const router = useRouter();
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Get current sort state from URL
  const currentSort = searchParams.get('sort');
  const currentSortField = searchParams.get('sortField');
  const isThisColumnSorted = currentSortField === field;
  
  // Show sort icon only if sort parameters exist in URL
  const shouldShowSortIcon = currentSort || currentSortField;

  // Get current filter value for this column from URL
  const filtersParam = searchParams.get('filters') || '';
  const currentFilters = parseFiltersFromUrl(filtersParam);
  const filterValueFromUrl = currentFilters[field] || '';

  // Local state for the input - initialize from URL
  const [localFilterValue, setLocalFilterValue] = useState(filterValueFromUrl);
  
  // Track if we're in the middle of typing (debounce pending)
  const isTypingRef = useRef(false);

  // Sync local state with URL only when URL changes externally (not from our own typing)
  useEffect(() => {
    if (!isTypingRef.current) {
      setLocalFilterValue(filterValueFromUrl);
    }
  }, [filterValueFromUrl]);

  // Handle filter change with debounce
  const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    setLocalFilterValue(value);
    isTypingRef.current = true;

    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new timer for 300ms debounce
    debounceTimer.current = setTimeout(() => {
      isTypingRef.current = false;
      
      const params = new URLSearchParams(searchParams.toString());
      // Update filters parameter
      const currentFilters = parseFiltersFromUrl(filtersParam);

      if (value.trim() === '') {
        // Remove this column's filter if input is empty
        delete currentFilters[field];
      } else {
        // Set/update this column's filter
        currentFilters[field] = value;
      }

      // Build new filters string
      const newFiltersString = Object.entries(currentFilters)
        .filter(([_, filterValue]) => filterValue.trim() !== '')
        .map(([column, filterValue]) => `${column}-${encodeURIComponent(filterValue)}`)
        .join(',');

      if (newFiltersString) {
        params.set('filters', newFiltersString);
        params.set('filtration', 'true');
      } else {
        params.delete('filters');
        // NO eliminar filtration aquí: solo la Toolbar puede quitar filtration
        params.set('filtration', 'true');
      }

      // Reset to page 1 when filtering
      params.set('page', '1');
      router.replace(`?${params.toString()}`);
    }, 300);
  }, [searchParams, router, field, filtersParam]);

  // Handle sort click - toggle between asc/desc if this column is active, or activate this column
  const handleSortClick = () => {
    if (!column.sortable) return;
    
    const params = new URLSearchParams(searchParams.toString());
    
    if (isThisColumnSorted) {
      // If this column is already sorted, toggle the direction
      const newDirection = currentSort === 'asc' ? 'desc' : 'asc';
      params.set('sort', newDirection);
      params.set('sortField', field);
    } else {
      // If this column is not sorted, activate it with ascending order
      params.set('sort', 'asc');
      params.set('sortField', field);
    }
    
    params.set('page', '1');
    router.replace(`?${params.toString()}`);
  };

  // Determine which icon to show and its color
  let iconName: string;
  let iconColor: string;
  
  if (isThisColumnSorted) {
    // If this column is sorted, show the appropriate direction icon in primary color
    iconName = currentSort === 'asc' ? 'arrow_upward_alt' : 'arrow_downward_alt';
    iconColor = 'text-primary';
  } else {
    // If not sorted, show upward arrow in secondary color
    iconName = 'arrow_upward_alt';
    iconColor = 'text-secondary';
  }

  // Prefer explicit headerAlign; if missing, fall back to column.align so header matches cells
  const actualHeaderAlign = headerAlign ?? align ?? 'left';

  const headerStyle = {
    ...(flex !== undefined ? { flex } : {}),
    ...(width !== undefined ? { width } : {}),
    ...(minWidth !== undefined ? { minWidth } : {}),
    ...(maxWidth !== undefined ? { maxWidth } : {}),
  };

  return (
    <div
      className={`px-3 border-b font-semibold text-xs text-gray-700 flex items-stretch ${actualHeaderAlign === 'center' ? 'text-center' : actualHeaderAlign === 'right' ? 'text-right' : 'text-left'}`}
      style={{
        backgroundColor: 'var(--color-background)',
        height: '56px',
        minHeight: '56px',
        maxHeight: '56px',
        ...headerStyle,
        ...(computedStyle || {})
      }}
      data-test-id={`data-grid-column-header-${field}`}
    >
        <div className="flex items-center w-full h-full relative">
        {shouldShowSortIcon && column.sortable && (
          <IconButton
            icon={iconName}
            variant="text"
            title={isThisColumnSorted ? 
              (currentSort === 'asc' ? 'Cambiar a descendente' : 'Cambiar a ascendente') : 
              'Ordenar por esta columna'
            }
            onClick={handleSortClick}
            className={iconColor}
            style={{ fontSize: 16, width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginRight: '4px' }}
            aria-hidden
          />
        )}
        {filterMode && filterable ? (
            <div className={`relative w-full flex-1 flex items-center ${actualHeaderAlign === 'center' ? 'justify-center' : actualHeaderAlign === 'right' ? 'justify-end' : 'justify-start'}`}>
              {localFilterValue && (
                <label
                  className={`absolute left-0 text-[10px] text-foreground bg-white px-0 pointer-events-none z-10 transition-all duration-200 w-full ${actualHeaderAlign === 'center' ? 'text-center' : actualHeaderAlign === 'right' ? 'text-right' : 'text-left'}`}
                  style={{lineHeight:1, top: '2px'}}>
                  {headerName}
                </label>
              )}
              <input
                type="text"
                value={localFilterValue}
                onChange={handleFilterChange}
                placeholder={headerName}
                className={`w-full text-xs h-[28px] bg-white outline-none p-0 ${localFilterValue ? 'text-secondary pt-3' : ''} ${actualHeaderAlign === 'center' ? 'text-center' : actualHeaderAlign === 'right' ? 'text-right' : 'text-left'}`}
                aria-label={headerName}
                style={{ minWidth: 0, border: 'none' }}
              />
            </div>
        ) : (
          <span className="break-words leading-tight flex-1 h-full flex items-center">{headerName}</span>
        )}
      </div>
    </div>
  );
};

export default ColHeader;