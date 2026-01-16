"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/baseComponents/Button/Button";
import type { OrganizationalUnitSummary } from "@/actions/organizationalUnits";
import CreateOrganizationalUnitDialog from "./CreateOrganizationalUnitDialog";

interface BranchOption {
    id: string;
    name: string;
    isHeadquarters: boolean;
}

interface OrganizationalUnitsViewProps {
    units: OrganizationalUnitSummary[];
    branches: BranchOption[];
}

const buildBranchLabel = (branch: { name: string | null } | null | undefined): string => {
    if (!branch) {
        return 'Sin sucursal asignada';
    }
    return branch.name ?? 'Sucursal sin nombre';
};

export default function OrganizationalUnitsView({ units, branches }: OrganizationalUnitsViewProps) {
    const router = useRouter();
    const [dialogOpen, setDialogOpen] = useState(false);

    const handleOpenDialog = useCallback(() => {
        setDialogOpen(true);
    }, []);

    const handleCloseDialog = useCallback(() => {
        setDialogOpen(false);
    }, []);

    const handleUnitCreated = useCallback(async () => {
        setDialogOpen(false);
        router.refresh();
    }, [router]);

    const description = useMemo(
        () =>
            'Organiza tus equipos, áreas y sucursales desde una vista centralizada.',
        [],
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-foreground">Unidades organizativas</h2>
                    <p className="text-sm text-muted-foreground">{description}</p>
                </div>
                <Button onClick={handleOpenDialog} data-test-id="create-organizational-unit-button">
                    Nueva unidad
                </Button>
            </div>

            {units.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-center">
                    <p className="text-sm text-muted-foreground">Aun no has registrado unidades organizativas.</p>
                    <p className="text-xs text-muted-foreground">Usa el boton "Nueva unidad" para crear la primera.</p>
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {units.map((unit) => (
                        <article key={unit.id} className="flex h-full flex-col justify-between rounded-lg border border-border bg-card p-5 shadow-sm">
                            <div className="space-y-3">
                                <div>
                                    <h3 className="text-lg font-semibold text-foreground">{unit.name}</h3>
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{unit.code}</p>
                                </div>
                                {unit.description ? (
                                    <p className="text-sm text-muted-foreground">{unit.description}</p>
                                ) : (
                                    <p className="text-sm text-muted-foreground italic">Sin descripción</p>
                                )}
                            </div>
                            <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-sm text-muted-foreground">
                                <span>Sucursal:</span>
                                <span className="font-medium text-foreground">{buildBranchLabel(unit.branch)}</span>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            <CreateOrganizationalUnitDialog
                open={dialogOpen}
                onClose={handleCloseDialog}
                branches={branches}
                onSuccess={handleUnitCreated}
            />
        </div>
    );
}
