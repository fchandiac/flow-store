"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { EmployeeListItem } from "@/actions/employees";
import type { CostCenterSummary } from "@/actions/costCenters";
import type { OrganizationalUnitSummary } from "@/actions/organizationalUnits";
import EmployeesDataGrid from "./EmployeesDataGrid";
import CreateEmployeeDialog from "./CreateEmployeeDialog";

interface EmployeesViewProps {
    employees: EmployeeListItem[];
    costCenters: CostCenterSummary[];
    organizationalUnits: OrganizationalUnitSummary[];
}

export default function EmployeesView({ employees, costCenters, organizationalUnits }: EmployeesViewProps) {
    const router = useRouter();
    const [createDialogOpen, setCreateDialogOpen] = useState(false);

    const handleOpenCreate = useCallback(() => {
        setCreateDialogOpen(true);
    }, []);

    const handleCloseCreate = useCallback(() => {
        setCreateDialogOpen(false);
    }, []);

    const handleEmployeeCreated = useCallback(() => {
        setCreateDialogOpen(false);
        router.refresh();
    }, [router]);

    return (
        <>
            <EmployeesDataGrid
                employees={employees}
                onAddClick={handleOpenCreate}
            />

            <CreateEmployeeDialog
                open={createDialogOpen}
                onClose={handleCloseCreate}
                onSuccess={handleEmployeeCreated}
                costCenters={costCenters}
                organizationalUnits={organizationalUnits}
            />
        </>
    );
}
