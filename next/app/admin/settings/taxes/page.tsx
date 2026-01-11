import { getTaxes } from '@/app/actions/taxes';
import { getCompany } from '@/app/actions/companies';
import { TaxList } from './ui';
import Alert from '@/app/baseComponents/Alert/Alert';

export const dynamic = 'force-dynamic';

/**
 * Gestión de Impuestos
 * Ruta: /admin/settings/taxes
 * CRUD de impuestos con tarjetas
 * 
 * Patrón UI:
 * - Grid de TaxCards con nombre, código, tipo, tasa
 * - Búsqueda por nombre/código
 * - Dialogs para crear, editar y eliminar
 */

interface TaxesPageProps {
    searchParams: Promise<{ search?: string }>;
}

export default async function TaxesPage({ searchParams }: TaxesPageProps) {
    const params = await searchParams;
    const search = params?.search || '';
    
    const company = await getCompany();
    
    if (!company) {
        return (
            <div className="p-6">
                <h1 className="text-2xl font-bold mb-6">Impuestos</h1>
                <Alert variant="warning">
                    No hay empresa configurada. Configure primero la empresa.
                </Alert>
            </div>
        );
    }
    
    const taxes = await getTaxes(true); // includeInactive = true
    
    // Filtrar por búsqueda si existe
    const filteredTaxes = search 
        ? taxes.filter((t: any) => 
            t.name.toLowerCase().includes(search.toLowerCase()) ||
            t.code.toLowerCase().includes(search.toLowerCase())
        )
        : taxes;

    // Serializar para pasar a componentes cliente
    const serializedTaxes = JSON.parse(JSON.stringify(filteredTaxes));

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Impuestos</h1>
            <TaxList 
                taxes={serializedTaxes} 
                companyId={company.id}
            />
        </div>
    );
}
