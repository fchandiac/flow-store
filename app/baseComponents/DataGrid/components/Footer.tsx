'use client'
import React from 'react';
import Pagination from './Pagination';
import { useScreenSize } from '../utils/columnStyles';
import Select, { Option } from '@/app/baseComponents/Select/Select';
import { useSearchParams, useRouter } from 'next/navigation';

interface FooterProps {
  total?: number;
  totalGeneral?: number;
}

const Footer: React.FC<FooterProps> = ({ total = 0, totalGeneral }) => {
  const { isMobile } = useScreenSize();

  const searchParams = useSearchParams();
  const router = useRouter();
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');

  const updateSearchParams = (newParams: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([key, value]) => {
      params.set(key, value);
    });
    router.push(`?${params.toString()}`);
  };

  const handleLimitChange = (newLimit: number) => {
    updateSearchParams({ limit: newLimit.toString(), page: '1' });
  };

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

  if (isMobile) {
    return (
      <div className="flex flex-col p-4 space-y-4 min-h-[120px] border-t border-t-gray-300" data-test-id="data-grid-footer">
        {/* Fila superior: Paginación */}
        <div className="flex justify-center">
          <Pagination total={total} totalGeneral={totalGeneral} mobileMode={true} />
        </div>
        {/* Fila inferior: Selector de filas y recuento */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-xs text-foreground">Filas por página:</div>
            <Select
              options={limitOptions}
              placeholder=""
              value={limit}
              onChange={(newLimit) => newLimit && handleLimitChange(Number(newLimit))}
            />
          </div>
          <div className="text-xs text-muted-foreground">
            {totalGeneral && totalGeneral !== total ? `Filtrados: ${total} de ${totalGeneral}` : `Total: ${total}`}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-0 border-t border-t-gray-300" data-test-id="data-grid-footer">
      <Pagination
        total={total}
        totalGeneral={totalGeneral}
      />
    </div>
  );
};

export default Footer;
