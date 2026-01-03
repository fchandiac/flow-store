import { getStorages } from '@/app/actions/storages';
import { getBranches } from '@/app/actions/branches';
import Alert from '@/app/baseComponents/Alert/Alert';
import { StorageList } from './ui';
import type { StorageListItem, BranchOption } from './ui';

export const dynamic = 'force-dynamic';

interface StoragesPageProps {
    searchParams: Promise<{ search?: string }>;
}

export default async function StoragesPage({ searchParams }: StoragesPageProps) {
    const params = await searchParams;
    const search = params?.search?.toLowerCase().trim() || '';

    const [storages, branches] = await Promise.all([
        getStorages({ includeInactive: true }),
        getBranches({ includeInactive: true }),
    ]);

    const filteredStorages = search
        ? storages.filter((storage) => {
            const branchName = storage.branch?.name?.toLowerCase() || '';
            const code = storage.code?.toLowerCase() || '';
            return (
                storage.name.toLowerCase().includes(search) ||
                code.includes(search) ||
                branchName.includes(search)
            );
        })
        : storages;

    const serializedStorages: StorageListItem[] = filteredStorages.map((storage) => ({
        id: storage.id,
        name: storage.name,
        code: storage.code ?? null,
        category: storage.category as StorageListItem['category'],
        type: storage.type as StorageListItem['type'],
        branchId: storage.branchId ?? null,
        branchName: storage.branch?.name ?? null,
        capacity: storage.capacity ?? null,
        location: storage.location ?? null,
        isDefault: storage.isDefault,
        isActive: storage.isActive,
    }));

    const branchOptions: BranchOption[] = branches.map((branch) => ({
        id: branch.id,
        name: branch.name,
    }));

    return (
        <div className="p-6" data-test-id="storages-page">
            <div className="flex flex-col gap-2 mb-6">
                <h1 className="text-2xl font-bold">Almacenes</h1>
                <p className="text-sm text-neutral-600">
                    Administra las bodegas y almacenes disponibles para tus operaciones logísticas.
                </p>
            </div>

            {branchOptions.length === 0 && (
                <Alert variant="warning" className="mb-6">
                    No has configurado sucursales aún. Si necesitas crear bodegas en sucursal, agrega primero una sucursal.
                </Alert>
            )}

            <StorageList storages={serializedStorages} branches={branchOptions} />
        </div>
    );
}
