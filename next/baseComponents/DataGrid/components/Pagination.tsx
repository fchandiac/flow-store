"use client"
import React from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import IconButton from '@/app/baseComponents/IconButton/IconButton'
import Select, { Option } from '@/app/baseComponents/Select/Select'

interface PaginationProps {
  total: number
  totalGeneral?: number
  mobileMode?: boolean // Nuevo prop para modo móvil
}

const Pagination: React.FC<PaginationProps> = ({ total, totalGeneral, mobileMode = false }) => {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  // Obtener valores de la URL
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '25')
  
  const totalPages = Math.max(1, Math.ceil(total / limit))

  // Funciones para actualizar la URL
  const updateSearchParams = (newParams: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(newParams).forEach(([key, value]) => {
      params.set(key, value)
    })
    router.push(`?${params.toString()}`)
  }

  const handleLimitChange = (newLimit: number) => {
    updateSearchParams({ limit: newLimit.toString(), page: '1' }) // Reset to page 1 when changing limit
  }

  const handlePageChange = (newPage: number) => {
    updateSearchParams({ page: newPage.toString() })
  }

  // Opciones fijas para el paginador
  const limitOptions: Option[] = [
    { id: 5, label: '5' },
    { id: 10, label: '10' },
    { id: 25, label: '25' },
    { id: 50, label: '50' },
    { id: 75, label: '75' },
    { id: 100, label: '100' },
    { id: 200, label: '200' },
    { id: 300, label: '300' },
    { id: 500, label: '500' }
  ];

  if (mobileMode) {
    return (
      <div className="flex items-center gap-2 text-xs text-foreground" data-test-id="data-grid-pagination">
        <IconButton icon="first_page" variant="text" className="p-1 text-secondary cursor-pointer" onClick={() => handlePageChange(1)} aria-label="Primera página" />
        <IconButton icon="chevron_left" variant="text" className="p-1 text-secondary cursor-pointer" onClick={() => handlePageChange(Math.max(1, page - 1))} aria-label="Anterior" />
        <div className="px-3 py-1 text-xs font-normal text-foreground w-16 text-center">
          {page} <span className="text-gray-400">/ {totalPages}</span>
        </div>
        <IconButton icon="chevron_right" variant="text" className="p-1 text-secondary cursor-pointer" onClick={() => handlePageChange(Math.min(totalPages, page + 1))} aria-label="Siguiente" />
        <IconButton icon="last_page" variant="text" className="p-1 text-secondary cursor-pointer" onClick={() => handlePageChange(totalPages)} aria-label="Última página" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-2" data-test-id="data-grid-pagination">
      {/* Izquierda: Filas por página */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="text-xs text-foreground font-normal whitespace-nowrap">Filas por página:</span>
        <Select
          options={limitOptions}
          placeholder=""
          value={limit}
          onChange={(newLimit) => newLimit && handleLimitChange(Number(newLimit))}
          variant="minimal"
        />
      </div>

      {/* Centro: Leyenda de total/filtrados */}
      <div className="flex-1 text-center">
        <div className="text-xs text-muted-foreground">
          {totalGeneral && totalGeneral !== total ? `Registros filtrados: ${total} de ${totalGeneral}` : `Total de registros: ${total}`}
        </div>
      </div>

      {/* Derecha: Información de paginación y botones */}
      <div className="flex items-center gap-2 text-xs text-foreground">
        <IconButton icon="first_page" variant="text" className="p-1 text-secondary cursor-pointer" onClick={() => handlePageChange(1)} aria-label="Primera página" />
        <IconButton icon="chevron_left" variant="text" className="p-1 text-secondary cursor-pointer" onClick={() => handlePageChange(Math.max(1, page - 1))} aria-label="Anterior" />
        <div className="px-3 py-1 text-xs font-normal text-foreground w-16 text-center">
          {page} <span className="text-gray-400">/ {totalPages}</span>
        </div>
        <IconButton icon="chevron_right" variant="text" className="p-1 text-secondary cursor-pointer" onClick={() => handlePageChange(Math.min(totalPages, page + 1))} aria-label="Siguiente" />
        <IconButton icon="last_page" variant="text" className="p-1 text-secondary cursor-pointer" onClick={() => handlePageChange(totalPages)} aria-label="Última página" />
      </div>
    </div>
  )
}

export default Pagination
