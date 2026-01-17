'use client';

import { useState } from 'react';
import { Button } from '@/app/baseComponents/Button/Button';
import PointOfSaleCard, { PointOfSaleType } from './PointOfSaleCard';
import CreatePointOfSaleDialog from './CreatePointOfSaleDialog';

interface BranchType {
    id: string;
    name: string;
}

interface PointOfSaleListProps {
    pointsOfSale: PointOfSaleType[];
    branches: BranchType[];
    'data-test-id'?: string;
}

const PointOfSaleList: React.FC<PointOfSaleListProps> = ({ 
    pointsOfSale, 
    branches,
    'data-test-id': dataTestId 
}) => {
    const [openCreateDialog, setOpenCreateDialog] = useState(false);

    // Agrupar por sucursal
    const groupedByBranch = pointsOfSale.reduce((acc, pos) => {
        const branchName = pos.branch?.name || 'Sin Sucursal';
        if (!acc[branchName]) {
            acc[branchName] = [];
        }
        acc[branchName].push(pos);
        return acc;
    }, {} as Record<string, PointOfSaleType[]>);

    return (
        <div className="space-y-6" data-test-id={dataTestId}>
            <div className="flex justify-end">
                <Button
                    onClick={() => setOpenCreateDialog(true)}
                    data-test-id="create-point-of-sale-button"
                >
                    <span className="material-symbols-outlined mr-2" style={{ fontSize: '1.25rem' }}>
                        add
                    </span>
                    Nuevo Punto de Venta
                </Button>
            </div>

            {pointsOfSale.length === 0 ? (
                <div className="text-center py-12 bg-neutral-50 rounded-lg border border-neutral-200">
                    <span className="material-symbols-outlined text-neutral-400 mb-3" style={{ fontSize: '3rem' }}>
                        point_of_sale
                    </span>
                    <h3 className="text-lg font-medium text-neutral-600">No hay puntos de venta</h3>
                    <p className="text-neutral-500 mt-1">Crea el primer punto de venta para comenzar</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {Object.entries(groupedByBranch).map(([branchName, branchPOS]) => (
                        <div key={branchName}>
                            <h2 className="text-lg font-semibold text-neutral-700 mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>
                                    store
                                </span>
                                {branchName}
                                <span className="text-sm font-normal text-neutral-500">
                                    ({branchPOS.length} {branchPOS.length === 1 ? 'caja' : 'cajas'})
                                </span>
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {branchPOS.map((pos) => (
                                    <PointOfSaleCard
                                        key={pos.id}
                                        pointOfSale={pos}
                                        data-test-id={`point-of-sale-card-${pos.id}`}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <CreatePointOfSaleDialog
                open={openCreateDialog}
                onClose={() => setOpenCreateDialog(false)}
                branches={branches}
                data-test-id="create-point-of-sale-dialog"
            />
        </div>
    );
};

export default PointOfSaleList;
