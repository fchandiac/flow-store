'use client'
import React from 'react';
import { useState } from 'react';
import { calculateColumnStyles } from '../utils/columnStyles';
import type { DataGridColumn } from '../DataGrid';

interface BodyProps {
  columns?: DataGridColumn[];
  rows?: any[];
  filterMode?: boolean;
  screenWidth?: number;
  expandable?: boolean;
  expandedRowIds?: Set<string | number>;
  onToggleExpand?: (rowId: string | number) => void;
  expandableRowContent?: (row: any) => React.ReactNode;
}

const Body: React.FC<BodyProps> = ({ 
  columns = [], 
  rows = [], 
  filterMode = false, 
  screenWidth = 1024,
  expandable = false,
  expandedRowIds = new Set(),
  onToggleExpand,
  expandableRowContent 
}) => {
  const [hoveredRowId, setHoveredRowId] = useState<string | number | null>(null);
  const visibleColumns = columns.filter((c) => !c.hide);

  // Usar utilidad centralizada para calcular estilos
  const computedStyles = calculateColumnStyles(columns, screenWidth);

  return (
    <div className="flex-1" data-test-id="data-grid-body">
      {/* Renderizar por filas para sincronizar alturas */}
      {rows.map((row, rowIndex) => {
        const rowId = row.id || rowIndex;
        const isExpanded = expandedRowIds.has(rowId);
        
        return (
          <React.Fragment key={rowId}>
            <div className="flex w-full items-stretch data-grid-row" data-test-id="data-grid-row">
              {/* Expand/Collapse button */}
              {expandable && (
                <div
                  className="w-10 min-w-[40px] px-1 py-2 border-b border-gray-200 flex items-center justify-center cursor-pointer"
                  style={{
                    backgroundColor: hoveredRowId === rowId ? 'var(--color-hover, #f5f5f5)' : 'transparent',
                  }}
                  onMouseEnter={() => setHoveredRowId(rowId)}
                  onMouseLeave={() => setHoveredRowId(null)}
                  onClick={() => onToggleExpand?.(rowId)}
                >
                  <span 
                    className={`material-icons text-gray-500 text-lg transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                  >
                    expand_more
                  </span>
                </div>
              )}
              {visibleColumns.map((column, colIndex) => {
                const value = row[column.field];
                const style = computedStyles[colIndex];
                const align = column.align || 'left';
                
                // Renderizar actionComponent si existe
                if (column.actionComponent) {
                  const ActionComponent = column.actionComponent;
                  return (
                    <div
                      key={`${column.field}-${rowId}`}
                      className={`px-3 py-2 border-b border-gray-200 text-xs flex items-center ${
                        align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'
                      }`}
                      style={{
                        ...style,
                        backgroundColor: hoveredRowId === rowId ? 'var(--color-hover, #f5f5f5)' : 'transparent',
                      }}
                      onMouseEnter={() => setHoveredRowId(rowId)}
                      onMouseLeave={() => setHoveredRowId(null)}
                    >
                      <ActionComponent row={row} column={column} />
                    </div>
                  );
                }
                
                // Usar renderCell personalizado si existe
                if (column.renderCell) {
                  return (
                    <div
                      key={`${column.field}-${rowId}`}
                      className={`px-3 py-2 border-b border-gray-200 text-xs flex items-center ${
                        align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'
                      }`}
                      style={{
                        ...style,
                        backgroundColor: hoveredRowId === rowId ? 'var(--color-hover, #f5f5f5)' : 'transparent',
                      }}
                      onMouseEnter={() => setHoveredRowId(rowId)}
                      onMouseLeave={() => setHoveredRowId(null)}
                    >
                      {column.renderCell({ row, value: row[column.field], column })}
                    </div>
                  );
                }
                
                return (
                  <div
                    key={`${column.field}-${rowId}`}
                    className={`px-3 py-2 border-b border-gray-200 text-xs flex items-center ${
                      align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'
                    }`}
                    style={{
                      ...style,
                      backgroundColor: hoveredRowId === rowId ? 'var(--color-hover, #f5f5f5)' : 'transparent',
                    }}
                    onMouseEnter={() => setHoveredRowId(rowId)}
                    onMouseLeave={() => setHoveredRowId(null)}
                  >
                    <span className="truncate">{value !== null && value !== undefined ? String(value) : '-'}</span>
                  </div>
                );
              })}
            </div>
            {/* Expanded content panel */}
            {expandable && isExpanded && expandableRowContent && (
              <div 
                className="w-full bg-gray-50 border-b border-gray-200 overflow-hidden"
                data-test-id="data-grid-expanded-row"
              >
                <div className="p-4">
                  {expandableRowContent(row)}
                </div>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default Body;