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
}

const Body: React.FC<BodyProps> = ({ columns = [], rows = [], filterMode = false, screenWidth = 1024 }) => {
  const [hoveredRowId, setHoveredRowId] = useState<string | number | null>(null);
  const visibleColumns = columns.filter((c) => !c.hide);

  // Usar utilidad centralizada para calcular estilos
  const computedStyles = calculateColumnStyles(columns, screenWidth);

  return (
    <div className="flex-1" data-test-id="data-grid-body">
      {/* Renderizar por filas para sincronizar alturas */}
      {rows.map((row, rowIndex) => (
        <div key={row.id || rowIndex} className="flex w-full items-stretch data-grid-row" data-test-id="data-grid-row">
          {visibleColumns.map((column, colIndex) => {
            const value = row[column.field];
            const style = computedStyles[colIndex];
            const align = column.align || 'left';
            
            // Renderizar actionComponent si existe
            if (column.actionComponent) {
              const ActionComponent = column.actionComponent;
              return (
                <div
                  key={`${column.field}-${row.id || rowIndex}`}
                  className={`px-3 py-2 border-b border-gray-200 text-xs flex items-center ${
                    align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'
                  }`}
                  style={{
                    ...style,
                    backgroundColor: hoveredRowId === (row.id || rowIndex) ? 'var(--color-hover, #f5f5f5)' : 'transparent',
                  }}
                  onMouseEnter={() => setHoveredRowId(row.id || rowIndex)}
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
                  key={`${column.field}-${row.id || rowIndex}`}
                  className={`px-3 py-2 border-b border-gray-200 text-xs flex items-center ${
                    align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'
                  }`}
                  style={{
                    ...style,
                    backgroundColor: hoveredRowId === (row.id || rowIndex) ? 'var(--color-hover, #f5f5f5)' : 'transparent',
                  }}
                  onMouseEnter={() => setHoveredRowId(row.id || rowIndex)}
                  onMouseLeave={() => setHoveredRowId(null)}
                >
                  {column.renderCell({ row, value: row[column.field], column })}
                </div>
              );
            }
            
            return (
              <div
                key={`${column.field}-${row.id || rowIndex}`}
                className={`px-3 py-2 border-b border-gray-200 text-xs flex items-center ${
                  align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'
                }`}
                style={{
                  ...style,
                  backgroundColor: hoveredRowId === (row.id || rowIndex) ? 'var(--color-hover, #f5f5f5)' : 'transparent',
                }}
                onMouseEnter={() => setHoveredRowId(row.id || rowIndex)}
                onMouseLeave={() => setHoveredRowId(null)}
              >
                <span className="truncate">{value !== null && value !== undefined ? String(value) : '-'}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default Body;