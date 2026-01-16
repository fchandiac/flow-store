'use client';

import { useMemo } from 'react';
import DataGrid, { type DataGridColumn } from '@/baseComponents/DataGrid/DataGrid';
import Badge from '@/baseComponents/Badge/Badge';
import type { EmployeeListItem } from '@/actions/employees';
import { EmployeeStatus, EmploymentType } from '@/data/entities/Employee';

interface EmployeesDataGridProps {
    employees: EmployeeListItem[];
    onAddClick: () => void;
}

interface EmployeeRow extends EmployeeListItem {
    displayName: string;
    documentLabel: string | null;
    branchName: string | null;
    organizationalUnitLabel: string | null;
    costCenterLabel: string | null;
    employmentTypeLabel: string;
    hireDateLabel: string;
    terminationDateLabel: string | null;
    baseSalaryLabel: string;
}

const EMPLOYMENT_TYPE_LABEL: Record<EmploymentType, string> = {
    [EmploymentType.FULL_TIME]: 'Tiempo completo',
    [EmploymentType.PART_TIME]: 'Medio tiempo',
    [EmploymentType.CONTRACTOR]: 'Contratista',
    [EmploymentType.TEMPORARY]: 'Temporal',
    [EmploymentType.INTERN]: 'Práctica / Interno',
};

const STATUS_CONFIG: Record<EmployeeStatus, { label: string; variant: 'success' | 'warning' | 'error' }> = {
    [EmployeeStatus.ACTIVE]: { label: 'Activo', variant: 'success' },
    [EmployeeStatus.SUSPENDED]: { label: 'Suspendido', variant: 'warning' },
    [EmployeeStatus.TERMINATED]: { label: 'Terminado', variant: 'error' },
};

const currencyFormatter = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
});

const formatDate = (value: string | null | undefined): string | null => {
    if (!value) {
        return null;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }
    return parsed.toLocaleDateString('es-CL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
};

const buildDisplayName = (employee: EmployeeListItem): string => {
    const { person } = employee;
    const naturalName = [person.firstName, person.lastName].filter(Boolean).join(' ').trim();
    return naturalName || person.businessName || 'Sin nombre';
};

const buildDocumentLabel = (employee: EmployeeListItem): string | null => {
    const { documentType, documentNumber } = employee.person;
    if (!documentNumber) {
        return null;
    }
    return `${documentType ?? ''} ${documentNumber}`.trim();
};

const mapEmployeesToRows = (employees: EmployeeListItem[]): EmployeeRow[] =>
    employees.map((employee) => ({
        ...employee,
        displayName: buildDisplayName(employee),
        documentLabel: buildDocumentLabel(employee),
        branchName: employee.branch?.name ?? null,
        organizationalUnitLabel: employee.organizationalUnit
            ? `${employee.organizationalUnit.name} (${employee.organizationalUnit.code})`
            : null,
        costCenterLabel: employee.costCenter ? `${employee.costCenter.name} (${employee.costCenter.code})` : null,
        employmentTypeLabel: EMPLOYMENT_TYPE_LABEL[employee.employmentType],
        hireDateLabel: formatDate(employee.hireDate) ?? '—',
        terminationDateLabel: formatDate(employee.terminationDate) ?? null,
        baseSalaryLabel: employee.baseSalary != null ? currencyFormatter.format(employee.baseSalary) : '—',
    }));

const buildColumns = (rows: EmployeeRow[]): DataGridColumn[] => {
    const hasTerminationDates = rows.some((row) => row.terminationDateLabel);

    const columns: DataGridColumn[] = [
        {
            field: 'displayName',
            headerName: 'Empleado',
            flex: 2,
            minWidth: 240,
            renderCell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="font-medium text-foreground">{row.displayName}</span>
                    {row.documentLabel && <span className="text-xs text-muted-foreground">{row.documentLabel}</span>}
                </div>
            ),
        },
        {
            field: 'branchName',
            headerName: 'Sucursal',
            flex: 1,
            minWidth: 160,
            renderCell: ({ row }) => row.branchName || '—',
        },
        {
            field: 'organizationalUnitLabel',
            headerName: 'Unidad organizativa',
            flex: 1,
            minWidth: 200,
            renderCell: ({ row }) => row.organizationalUnitLabel || '—',
        },
        {
            field: 'costCenterLabel',
            headerName: 'Centro de costo',
            flex: 1,
            minWidth: 180,
            renderCell: ({ row }) => row.costCenterLabel || '—',
        },
        {
            field: 'employmentTypeLabel',
            headerName: 'Tipo de contrato',
            width: 180,
            renderCell: ({ row }) => row.employmentTypeLabel,
        },
        {
            field: 'status',
            headerName: 'Estado',
            width: 140,
            align: 'center',
            headerAlign: 'center',
            renderCell: ({ value }) => {
                const config = STATUS_CONFIG[value as EmployeeStatus];
                return <Badge variant={config.variant}>{config.label}</Badge>;
            },
        },
        {
            field: 'hireDateLabel',
            headerName: 'Ingreso',
            width: 140,
            renderCell: ({ row }) => row.hireDateLabel,
        },
        {
            field: 'baseSalaryLabel',
            headerName: 'Salario base',
            width: 160,
            align: 'right',
            headerAlign: 'right',
            renderCell: ({ row }) => row.baseSalaryLabel,
        },
    ];

    if (hasTerminationDates) {
        columns.splice(6, 0, {
            field: 'terminationDateLabel',
            headerName: 'Término',
            width: 140,
            renderCell: ({ row }) => row.terminationDateLabel || '—',
        });
    }

    return columns;
};

export default function EmployeesDataGrid({ employees, onAddClick }: EmployeesDataGridProps) {
    const rows = useMemo(() => mapEmployeesToRows(employees), [employees]);
    const columns = useMemo(() => buildColumns(rows), [rows]);

    return (
        <DataGrid
            title="Empleados"
            columns={columns}
            rows={rows}
            totalRows={rows.length}
            onAddClick={onAddClick}
            height="75vh"
            data-test-id="employees-grid"
        />
    );
}
