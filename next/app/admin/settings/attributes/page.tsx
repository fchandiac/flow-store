import { getAttributes } from '@/app/actions/attributes';
import AttributeList from './ui/AttributeList';

/**
 * Atributos de Variantes
 * Ruta: /admin/settings/attributes
 * Gestión de atributos como Color, Talla, Peso, etc.
 */
export default async function AttributesPage() {
    const attributes = await getAttributes(true); // incluir inactivos

    return (
        <div className="p-6">
            <AttributeList attributes={attributes} />
        </div>
    );
}
