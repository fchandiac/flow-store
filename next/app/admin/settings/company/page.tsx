import { getCompany } from '@/app/actions/companies';
import { CompanyForm } from './ui';
import Alert from '@/app/baseComponents/Alert/Alert';
import { listShareholders } from '@/actions/shareholders';

// Forzar renderizado dinámico para evitar problemas de TypeORM en build
export const dynamic = 'force-dynamic';

/**
 * Configuración de Empresa
 * Ruta: /admin/settings/company
 * Formulario único para editar datos de la empresa
 * 
 * Patrón UI:
 * - Form directo (sin dialog) usando Server Component
 * - No se permite eliminar la empresa
 */

export default async function CompanyPage() {
    const [company, shareholders] = await Promise.all([
        getCompany(),
        listShareholders(),
    ]);

    if (!company) {
        return (
            <div className="p-6">
                <h1 className="text-2xl font-bold mb-6">Configuración de Empresa</h1>
                <Alert variant="warning">
                    No hay empresa configurada. Ejecute el seed inicial para crear los datos base.
                </Alert>
            </div>
        );
    }

    // Serializar para pasar a componente cliente
    const serializedCompany = JSON.parse(JSON.stringify(company));

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Configuración de Empresa</h1>
            
            <CompanyForm
                company={serializedCompany}
                shareholders={shareholders}
                data-test-id="company-form"
            />
        </div>
    );
}
