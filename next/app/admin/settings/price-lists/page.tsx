import { getPriceLists } from '@/app/actions/priceLists';
import { PriceListList } from './ui';

/**
 * Gestión de Listas de Precios
 * Ruta: /admin/settings/price-lists
 * CRUD de listas de precios con tarjetas
 * 
 * Patrón UI:
 * - Grid de PriceListCards con nombre, código, tipo, moneda, vigencia
 * - Búsqueda por nombre/código
 * - Dialogs para crear, editar y eliminar
 */

interface PriceListsPageProps {
    searchParams: Promise<{ search?: string }>;
}

export default async function PriceListsPage({ searchParams }: PriceListsPageProps) {
    const params = await searchParams;
    const search = params?.search || '';
    
    const priceLists = await getPriceLists(true); // includeInactive = true
    
    // Filtrar por búsqueda si existe
    const filteredPriceLists = search 
        ? priceLists.filter((pl: any) => 
            pl.name.toLowerCase().includes(search.toLowerCase()) ||
            (pl.code && pl.code.toLowerCase().includes(search.toLowerCase()))
        )
        : priceLists;

    // Serializar para pasar a componentes cliente
    const serializedPriceLists = JSON.parse(JSON.stringify(filteredPriceLists));

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Listas de Precios</h1>
            <PriceListList priceLists={serializedPriceLists} />
        </div>
    );
}
