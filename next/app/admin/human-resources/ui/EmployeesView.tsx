"use client";

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { EmployeeListItem } from '@/actions/employees';
import type { CostCenterSummary } from '@/actions/costCenters';
import type { OrganizationalUnitSummary } from '@/actions/organizationalUnits';
import EmployeesDataGrid from './EmployeesDataGrid';
import CreateEmployeeDialog from './CreateEmployeeDialog';
import EditEmployeeDialog from './EditEmployeeDialog';

interface EmployeesViewProps {
    employees: EmployeeListItem[];
    costCenters: CostCenterSummary[];
    organizationalUnits: OrganizationalUnitSummary[];
}

export default function EmployeesView({ employees, costCenters, organizationalUnits }: EmployeesViewProps) {
    const router = useRouter();
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

    const selectedEmployee = useMemo(() => {
        if (!selectedEmployeeId) {
            return null;
        }
        return employees.find((employee) => employee.id === selectedEmployeeId) ?? null;
    }, [employees, selectedEmployeeId]);

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

    const handleOpenEdit = useCallback((employee: EmployeeListItem) => {
        setSelectedEmployeeId(employee.id);
        setEditDialogOpen(true);
    }, []);

    const handleCloseEdit = useCallback(() => {
        setEditDialogOpen(false);
        setSelectedEmployeeId(null);
    }, []);

    const handleEmployeeUpdated = useCallback(() => {
        setEditDialogOpen(false);
        setSelectedEmployeeId(null);
        router.refresh();
    }, [router]);

    return (
        <>
            <EmployeesDataGrid
                employees={employees}
                onAddClick={handleOpenCreate}
                onEditEmployee={handleOpenEdit}
            />

            <CreateEmployeeDialog
                open={createDialogOpen}
                onClose={handleCloseCreate}
                onSuccess={handleEmployeeCreated}
                costCenters={costCenters}
                organizationalUnits={organizationalUnits}
            />

            <EditEmployeeDialog
                open={editDialogOpen}
                onClose={handleCloseEdit}
                onSuccess={handleEmployeeUpdated}
                employee={selectedEmployee}
                costCenters={costCenters}
                organizationalUnits={organizationalUnits}
            />
        </>
    );
}
