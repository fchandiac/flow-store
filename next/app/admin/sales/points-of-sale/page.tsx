'use server';

import { getPointsOfSale } from '@/app/actions/pointsOfSale';
import { getBranches } from '@/app/actions/branches';
import { PointOfSaleList } from './ui';
import { getPriceLists } from '@/app/actions/priceLists';

/**
 * Página de Administración de Puntos de Venta
 * 
 * CRUD de puntos de venta (cajas) para cada sucursal
 */
export default async function PointsOfSalePage() {
    const [pointsOfSale, branches, priceLists] = await Promise.all([
        getPointsOfSale({ includeInactive: true }),
        getBranches({ includeInactive: false }),
        getPriceLists(true),
    ]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-neutral-800">Puntos de Venta</h1>
                    <p className="text-neutral-500 mt-1">Administra las cajas de cada sucursal</p>
                </div>
            </div>

            <PointOfSaleList 
                pointsOfSale={JSON.parse(JSON.stringify(pointsOfSale))} 
                branches={JSON.parse(JSON.stringify(branches))}
                priceLists={JSON.parse(JSON.stringify(priceLists))}
            />
        </div>
    );
}
