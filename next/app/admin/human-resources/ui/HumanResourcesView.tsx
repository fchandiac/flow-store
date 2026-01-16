"use client";

import { useState } from "react";
import type { EmployeeListItem } from "@/actions/employees";
import type { CostCenterSummary } from "@/actions/costCenters";
import type { OrganizationalUnitSummary } from "@/actions/organizationalUnits";
import EmployeesView from "./EmployeesView";
import OrganizationalUnitsView from "./OrganizationalUnitsView";

interface BranchOption {
    id: string;
    name: string;
    isHeadquarters: boolean;
}

interface HumanResourcesViewProps {
    employees: EmployeeListItem[];
    branches: BranchOption[];
    costCenters: CostCenterSummary[];
    organizationalUnits: OrganizationalUnitSummary[];
}

type TabId = "employees" | "units";

const tabs: Array<{ id: TabId; label: string }> = [
    { id: "employees", label: "Empleados" },
    { id: "units", label: "Unidades organizativas" },
];

export default function HumanResourcesView({ employees, branches, costCenters, organizationalUnits }: HumanResourcesViewProps) {
    const [activeTab, setActiveTab] = useState<TabId>("employees");

    return (
        <div className="space-y-6">
            <div className="border-b border-border">
                <div className="flex gap-2">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`rounded-t-md px-4 py-2 text-sm font-medium transition-colors ${
                                    isActive
                                        ? 'border border-b-0 border-border bg-card text-foreground'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                                aria-pressed={isActive}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {activeTab === "employees" ? (
                <EmployeesView
                    employees={employees}
                    costCenters={costCenters}
                    organizationalUnits={organizationalUnits}
                />
            ) : (
                <OrganizationalUnitsView units={organizationalUnits} branches={branches} />
            )}
        </div>
    );
}
