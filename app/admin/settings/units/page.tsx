import { getUnitsForAdmin } from '@/app/actions/units';
import { UnitsList } from './ui';

export const dynamic = 'force-dynamic';

interface UnitsPageProps {
    searchParams: Promise<{
        search?: string;
        status?: string;
        dimension?: string;
    }>;
}

function normalizeStatus(value?: string): 'all' | 'active' | 'inactive' {
    if (value === 'active' || value === 'inactive') {
        return value;
    }
    return 'all';
}

export default async function UnitsPage({ searchParams }: UnitsPageProps) {
    const params = await searchParams;
    const search = params?.search ?? '';
    const rawStatus = params?.status ?? 'all';
    const rawDimension = params?.dimension ?? '';

    const status = normalizeStatus(rawStatus);
    const dimension = rawDimension.trim();

    const units = await getUnitsForAdmin({
        search: search || undefined,
        status,
        dimension: dimension || undefined,
    });

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Unidades de Medida</h1>
                <p className="text-sm text-muted-foreground">
                    Administra unidades base y derivadas utilizadas en productos y variantes.
                </p>
            </div>
            <UnitsList
                units={units}
                initialSearch={search}
                initialStatus={status}
                initialDimension={dimension}
            />
        </div>
    );
}
