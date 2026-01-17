'use client';

import { useMemo, useState, type ChangeEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import PointOfSaleCard, { PointOfSaleType } from './PointOfSaleCard';
import CreatePointOfSaleDialog from './CreatePointOfSaleDialog';

interface BranchType {
    id: string;
    name: string;
}

interface PointOfSaleListProps {
    pointsOfSale: PointOfSaleType[];
    branches: BranchType[];
    priceLists: { id: string; name: string }[];
    'data-test-id'?: string;
}

const PointOfSaleList: React.FC<PointOfSaleListProps> = ({ 
    pointsOfSale, 
    branches,
    priceLists,
    'data-test-id': dataTestId 
}) => {
    const [openCreateDialog, setOpenCreateDialog] = useState(false);
    const searchParams = useSearchParams();
    const router = useRouter();
    const [search, setSearch] = useState(searchParams.get('search') || '');

    const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearch(value);

        const params = typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search)
            : new URLSearchParams(searchParams.toString());

        if (value.trim()) {
            params.set('search', value);
        } else {
            params.delete('search');
        }

        const pathname = typeof window !== 'undefined' ? window.location.pathname : '/admin/sales/points-of-sale';
        const queryString = params.toString();
        router.replace(queryString ? `${pathname}?${queryString}` : pathname);
    };

    const normalizedSearch = search.trim().toLowerCase();

    const filteredPointsOfSale = useMemo(() => {
        if (!normalizedSearch) {
            return pointsOfSale;
        }

        return pointsOfSale.filter((pos) => {
            const branchName = pos.branch?.name?.toLowerCase() ?? '';
            const priceListName = pos.defaultPriceList?.name?.toLowerCase() ?? '';
            const device = pos.deviceId?.toLowerCase() ?? '';
            return (
                pos.name.toLowerCase().includes(normalizedSearch) ||
                branchName.includes(normalizedSearch) ||
                priceListName.includes(normalizedSearch) ||
                device.includes(normalizedSearch)
            );
        });
    }, [pointsOfSale, normalizedSearch]);

    const groupedByBranch = useMemo(() => {
        return filteredPointsOfSale.reduce((acc, pos) => {
        const branchName = pos.branch?.name || 'Sin Sucursal';
        if (!acc[branchName]) {
            acc[branchName] = [];
        }
        acc[branchName].push(pos);
            return acc;
        }, {} as Record<string, PointOfSaleType[]>);
    }, [filteredPointsOfSale]);

    const hasInitialData = pointsOfSale.length > 0;

    return (
        <div className="space-y-6" data-test-id={dataTestId}>
            <div className="flex items-center justify-between mb-6 gap-4" data-test-id="point-of-sale-list-header">
                <IconButton
                    icon="add"
                    variant="outlined"
                    aria-label="Agregar punto de venta"
                    onClick={() => setOpenCreateDialog(true)}
                    data-test-id="point-of-sale-add-button"
                />
                <div className="w-full max-w-sm" data-test-id="point-of-sale-search-container">
                    <TextField
                        label="Buscar"
                        value={search}
                        onChange={handleSearchChange}
                        startIcon="search"
                        placeholder="Buscar punto de venta..."
                        data-test-id="point-of-sale-search-input"
                    />
                </div>
            </div>

            {!hasInitialData ? (
                <div className="text-center py-12 bg-neutral-50 rounded-lg border border-neutral-200">
                    <span className="material-symbols-outlined text-neutral-400 mb-3" style={{ fontSize: '3rem' }}>
                        point_of_sale
                    </span>
                    <h3 className="text-lg font-medium text-neutral-600">No hay puntos de venta</h3>
                    <p className="text-neutral-500 mt-1">Crea el primer punto de venta para comenzar</p>
                </div>
            ) : filteredPointsOfSale.length === 0 ? (
                <div className="text-center py-12 bg-neutral-50 rounded-lg border border-neutral-200 text-neutral-500" data-test-id="point-of-sale-empty-search">
                    <span className="material-symbols-outlined text-neutral-400 mb-3" style={{ fontSize: '3rem' }}>
                        search
                    </span>
                    <h3 className="text-lg font-medium">No encontramos coincidencias</h3>
                    <p className="mt-1">Ajusta tu búsqueda o crea un nuevo punto de venta.</p>
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
                                        priceLists={priceLists}
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
                priceLists={priceLists}
                data-test-id="create-point-of-sale-dialog"
            />
        </div>
    );
};

export default PointOfSaleList;
