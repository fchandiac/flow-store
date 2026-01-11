import { getBranches } from '@/app/actions/branches';
import { getCompany } from '@/app/actions/companies';
import { BranchList } from './ui';
import Alert from '@/app/baseComponents/Alert/Alert';

export const dynamic = 'force-dynamic';

/**
 * Gestión de Sucursales
 * Ruta: /admin/settings/branches
 * CRUD de sucursales con tarjetas
 * 
 * Patrón UI:
 * - Grid de BranchCards con nombre, código, dirección, teléfono
 * - Búsqueda por nombre/código
 * - Dialogs para crear, editar y eliminar
 */

interface BranchesPageProps {
    searchParams: Promise<{ search?: string }>;
}

export default async function BranchesPage({ searchParams }: BranchesPageProps) {
    const params = await searchParams;
    const search = params?.search || '';
    
    const company = await getCompany();
    
    if (!company) {
        return (
            <div className="p-6">
                <h1 className="text-2xl font-bold mb-6">Sucursales</h1>
                <Alert variant="warning">
                    No hay empresa configurada. Configure primero la empresa.
                </Alert>
            </div>
        );
    }
    
    const branches = await getBranches({ includeInactive: true });
    
    // Filtrar por búsqueda si existe
    const filteredBranches = search 
        ? branches.filter((b: any) => 
            b.name.toLowerCase().includes(search.toLowerCase()) ||
            (b.code && b.code.toLowerCase().includes(search.toLowerCase()))
        )
        : branches;

    // Serializar para pasar a componentes cliente
    const serializedBranches = JSON.parse(JSON.stringify(filteredBranches));

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Sucursales</h1>
            <BranchList branches={serializedBranches} />
        </div>
    );
}
