'use client'
import React from 'react';
import type { DataGridColumn } from '../DataGrid';

export interface ColumnStyle {
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  flex?: string;
}

/**
 * Hook personalizado para detectar tamaño de pantalla
 */
export function useScreenSize() {
  // Provide a SSR-safe initial state
  const getInitial = () => ({
    width: typeof window === 'undefined' ? 1024 : window.innerWidth,
    height: typeof window === 'undefined' ? 768 : window.innerHeight,
    isMobile: typeof window === 'undefined' ? false : window.innerWidth < 640,
    isTablet: typeof window === 'undefined' ? false : (window.innerWidth >= 640 && window.innerWidth < 1024),
    isDesktop: typeof window === 'undefined' ? true : window.innerWidth >= 1024,
  });

  const [screenSize, setScreenSize] = React.useState(getInitial);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      setScreenSize({
        width: window.innerWidth,
        height: window.innerHeight,
        isMobile: window.innerWidth < 640,
        isTablet: window.innerWidth >= 640 && window.innerWidth < 1024,
        isDesktop: window.innerWidth >= 1024,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return screenSize;
}

/**
 * Calcula el ancho mínimo inteligente basado en el tamaño de pantalla y el texto del header
 */
function getSmartMinWidth(
  baseMinWidth: number,
  screenWidth: number,
  totalColumns: number,
  headerText: string = ''
): number {
  // Calcular ancho mínimo basado en el texto del header
  // Estimación más precisa: caracteres anchos (W, M, etc.) ~10px, caracteres normales ~7px
  const wideChars = (headerText.match(/[WMwm]/g) || []).length;
  const normalChars = headerText.length - wideChars;
  const headerTextWidth = (wideChars * 10) + (normalChars * 7) + 32; // 32px para padding interno

  // Ancho mínimo nunca debe ser menor que el necesario para el header
  const headerBasedMinWidth = Math.max(60, headerTextWidth);

  // En móviles (< 640px):
  // - Calcula espacio disponible después de padding
  // - Distribuye equitativamente entre columnas
  // - Mínimo garantizado: 35px para legibilidad
  if (screenWidth < 640) { // Mobile
    // Calculamos cuánto espacio tenemos disponible después de padding
    const availableWidth = screenWidth - 32; // 16px padding left + 16px padding right
    const calculatedMinWidth = Math.max(35, Math.floor(availableWidth / totalColumns));

    // No reducimos por debajo del ancho necesario para el header
    return Math.max(headerBasedMinWidth, calculatedMinWidth);
  }

  // En tablets (640px - 1024px):
  // - Reduce minWidth en 20% para mejor adaptación
  // - Pero nunca por debajo del ancho del header
  if (screenWidth < 1024) { // Tablet
    return Math.max(headerBasedMinWidth, Math.max(40, baseMinWidth * 0.8));
  }

  // En desktop (> 1024px):
  // - Usa el ancho base definido, pero nunca menor que el necesario para el header
  return Math.max(headerBasedMinWidth, baseMinWidth);
}

/**
 * Utilidad centralizada para calcular estilos de columna de DataGrid
 * Garantiza consistencia entre headers, body y celdas
 * Adaptable al tamaño de pantalla para evitar superposición
 */
export function calculateColumnStyles(columns: DataGridColumn[], screenWidth: number = 1024): ColumnStyle[] {
  const visibleColumns = columns.filter((c) => !c.hide);
  const hasFlex = visibleColumns.some((c) => typeof c.flex === 'number');

  return visibleColumns.map((col, idx) => {
    const style: ColumnStyle = {};

    // Lógica de dimensionamiento
    if (typeof col.width === 'number') {
      style.width = col.width;
      style.flex = '0 0 auto';
    } else if (typeof col.flex === 'number') {
      style.flex = `${col.flex} 1 0`;
    } else {
      // Sistema de distribución automática
      if (hasFlex) {
        style.flex = '1 1 0';
      } else {
        // Última columna se expande, las demás tienen tamaño automático
        if (idx === visibleColumns.length - 1) {
          style.flex = '1 1 0';
        } else {
          style.flex = '0 0 auto';
        }
      }
    }

    // Ancho mínimo inteligente basado en pantalla y texto del header
    const baseMinWidth = typeof col.minWidth === 'number' ? col.minWidth : 50;
    style.minWidth = getSmartMinWidth(baseMinWidth, screenWidth, visibleColumns.length, col.headerName);

    // Ancho máximo si está definido
    if (typeof col.maxWidth === 'number') {
      style.maxWidth = col.maxWidth;
    }

    return style;
  });
}

/**
 * Constantes para estilos consistentes del DataGrid
 */
export const DataGridStyles = {
  // Contenedor principal
  container: 'rounded-md bg-background flex flex-col',

  // Contenedor scrollable
  scrollContainer: 'flex-1 overflow-auto',

  // Headers de columna
  headerRow: 'flex min-w-full',
  headerCell: 'px-3 py-2 text-sm font-medium text-gray-700 border-r border-gray-200 last:border-r-0',

  // Celdas del body (desde Cell.tsx)
  bodyCell: 'px-3 py-1 text-sm text-gray-900 border-b border-gray-200 border-r border-gray-200 bg-background whitespace-pre-line break-words min-h-[22px] flex-auto last:border-r-0',

  // Responsive breakpoints
  responsive: {
    minWidth: 'min-w-[280px] sm:min-w-[400px] md:min-w-[600px]',
    mobileScroll: 'sm:overflow-x-visible overflow-x-auto', // Scroll horizontal forzado en móviles
  }
} as const;