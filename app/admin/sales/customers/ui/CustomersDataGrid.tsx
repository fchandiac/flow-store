"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import DataGrid, { type DataGridColumn } from "@/app/baseComponents/DataGrid/DataGrid";
import Badge from "@/app/baseComponents/Badge/Badge";
import IconButton from "@/app/baseComponents/IconButton/IconButton";
import { useAlert } from "@/app/state/hooks/useAlert";
import { getCustomers } from "@/app/actions/customers";
import { CustomerType as CustomerTypeEnum } from "@/data/entities/Customer";
import { CreateCustomerDialog } from ".";
import UpdateCustomerDialog from "./UpdateCustomerDialog";
import DeleteCustomerDialog from "./DeleteCustomerDialog";
import type { CustomerWithPerson } from "./types";

const currencyFormatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const customerTypeLabels: Record<CustomerTypeEnum, string> = {
  [CustomerTypeEnum.RETAIL]: "Minorista",
  [CustomerTypeEnum.WHOLESALE]: "Mayorista",
  [CustomerTypeEnum.VIP]: "VIP",
};

const customerTypeVariants: Record<CustomerTypeEnum, "primary-outlined" | "secondary-outlined" | "success-outlined"> = {
  [CustomerTypeEnum.RETAIL]: "primary-outlined",
  [CustomerTypeEnum.WHOLESALE]: "secondary-outlined",
  [CustomerTypeEnum.VIP]: "success-outlined",
};

export interface CustomerRow extends CustomerWithPerson {
  displayName: string;
  contactEmail: string;
  contactPhone: string;
  documentLabel: string;
}

export const CustomersDataGrid = () => {
  const searchParams = useSearchParams();
  const { success, error } = useAlert();

  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [totalRows, setTotalRows] = useState<number>(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRow | null>(null);

  const search = searchParams.get("search") || "";

  const loadCustomers = useCallback(async () => {
    try {
      const result = await getCustomers({ search: search || undefined, limit: 200 });
      const mapped: CustomerRow[] = result.data.map((customer) => {
        const { person } = customer;
        const isNatural = person.type === "NATURAL";
        const fullName = [person.firstName, person.lastName].filter(Boolean).join(" ").trim();
        const displayName = isNatural ? fullName || person.businessName || person.firstName : person.businessName || fullName || person.firstName;

        return {
          ...customer,
          displayName,
          contactEmail: person.email || "",
          contactPhone: person.phone || "",
          documentLabel: person.documentNumber ? `${person.documentType || "RUT"}: ${person.documentNumber}` : "",
        };
      });
      setRows(mapped);
      setTotalRows(result.total);
    } catch (err) {
      console.error("Error loading customers:", err);
      error("No se pudieron cargar los clientes");
    }
  }, [search, error]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleOpenCreate = useCallback(() => {
    setCreateDialogOpen(true);
  }, []);

  const handleOpenUpdate = useCallback((customer: CustomerRow) => {
    setSelectedCustomer(customer);
    setUpdateDialogOpen(true);
  }, []);

  const handleOpenDelete = useCallback((customer: CustomerRow) => {
    setSelectedCustomer(customer);
    setDeleteDialogOpen(true);
  }, []);

  const handleSuccess = useCallback(
    async (message: string) => {
      await loadCustomers();
      success(message);
    },
    [loadCustomers, success]
  );

  const columns: DataGridColumn[] = useMemo(() => {
    const ActionsCell = ({ row }: { row: CustomerRow }) => (
      <div className="flex items-center gap-1">
        <IconButton
          icon="edit"
          variant="basicSecondary"
          size="xs"
          onClick={() => handleOpenUpdate(row)}
          title="Editar cliente"
        />
        <IconButton
          icon="delete"
          variant="basicSecondary"
          size="xs"
          onClick={() => handleOpenDelete(row)}
          title="Eliminar cliente"
        />
      </div>
    );

    return [
      {
        field: "code",
        headerName: "Código",
        width: 120,
        renderCell: ({ value }) => value || "-",
      },
      {
        field: "displayName",
        headerName: "Cliente",
        flex: 2,
        minWidth: 220,
        renderCell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{row.displayName}</span>
            {row.documentLabel && (
              <span className="text-xs text-muted-foreground">{row.documentLabel}</span>
            )}
          </div>
        ),
      },
      {
        field: "customerType",
        headerName: "Tipo",
        width: 140,
        renderCell: ({ value }) => (
          <Badge variant={customerTypeVariants[value as CustomerTypeEnum] ?? "primary-outlined"}>
            {customerTypeLabels[value as CustomerTypeEnum] ?? value}
          </Badge>
        ),
      },
      {
        field: "contactEmail",
        headerName: "Email",
        flex: 1,
        minWidth: 200,
        renderCell: ({ value }) => value || "-",
      },
      {
        field: "contactPhone",
        headerName: "Teléfono",
        width: 150,
        renderCell: ({ value }) => value || "-",
      },
      {
        field: "defaultPaymentTermDays",
        headerName: "Plazo (días)",
        width: 130,
        align: "center",
        headerAlign: "center",
        renderCell: ({ value }) => (value ? `${value}` : "0"),
      },
      {
        field: "creditLimit",
        headerName: "Crédito",
        width: 130,
        align: "right",
        headerAlign: "right",
        renderCell: ({ value }) => currencyFormatter.format(Number(value || 0)),
      },
      {
        field: "currentBalance",
        headerName: "Saldo",
        width: 130,
        align: "right",
        headerAlign: "right",
        renderCell: ({ value }) => currencyFormatter.format(Number(value || 0)),
      },
      {
        field: "isActive",
        headerName: "Estado",
        width: 110,
        align: "center",
        headerAlign: "center",
        renderCell: ({ value }) => (
          <Badge variant={value ? "success" : "error"}>{value ? "Activo" : "Inactivo"}</Badge>
        ),
      },
      {
        field: "actions",
        headerName: "",
        width: 100,
        align: "center",
        sortable: false,
        filterable: false,
        renderCell: ({ row }) => <ActionsCell row={row as CustomerRow} />,
      },
    ];
  }, [handleOpenDelete, handleOpenUpdate]);

  return (
    <>
      <DataGrid
        title="Clientes"
        columns={columns}
        rows={rows}
        totalRows={totalRows}
        onAddClick={handleOpenCreate}
        data-test-id="customers-grid"
        height="75vh"
      />

      <CreateCustomerDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSuccess={() => handleSuccess("Cliente creado correctamente")}
      />

      {selectedCustomer && (
        <UpdateCustomerDialog
          open={updateDialogOpen}
          customer={selectedCustomer}
          onClose={() => {
            setUpdateDialogOpen(false);
            setSelectedCustomer(null);
          }}
          onSuccess={() => handleSuccess("Cliente actualizado correctamente")}
        />
      )}

      {selectedCustomer && (
        <DeleteCustomerDialog
          open={deleteDialogOpen}
          customer={selectedCustomer}
          onClose={() => {
            setDeleteDialogOpen(false);
            setSelectedCustomer(null);
          }}
          onSuccess={() => handleSuccess("Cliente eliminado correctamente")}
        />
      )}
    </>
  );
};

export default CustomersDataGrid;
