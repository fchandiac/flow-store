"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import DataGrid, { type DataGridColumn } from "@/app/baseComponents/DataGrid/DataGrid";
import Badge from "@/app/baseComponents/Badge/Badge";
import IconButton from "@/app/baseComponents/IconButton/IconButton";
import { getSuppliers } from "@/app/actions/suppliers";
import { SupplierType } from "@/data/entities/Supplier";
import { useAlert } from "@/app/state/hooks/useAlert";
import { CreateSupplierDialog } from "./CreateSupplierDialog";
import { UpdateSupplierDialog } from "./UpdateSupplierDialog";
import { DeleteSupplierDialog } from "./DeleteSupplierDialog";
import type { SupplierWithPerson } from "./types";

const currencyFormatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const supplierTypeLabels: Record<SupplierType, string> = {
  [SupplierType.MANUFACTURER]: "Fabricante",
  [SupplierType.DISTRIBUTOR]: "Distribuidor",
  [SupplierType.WHOLESALER]: "Mayorista",
  [SupplierType.LOCAL]: "Local",
};

export interface SupplierRow extends SupplierWithPerson {
  displayName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
}

export const SuppliersDataGrid = () => {
  const searchParams = useSearchParams();
  const { success, error } = useAlert();

  const [rows, setRows] = useState<SupplierRow[]>([]);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierRow | null>(null);

  const search = searchParams.get("search") || "";

  const loadSuppliers = useCallback(async () => {
    try {
      const data = await getSuppliers(search ? { search } : undefined);
      const mapped: SupplierRow[] = data.map((supplier) => {
        const nameParts = [supplier.person?.firstName, supplier.person?.lastName]
          .filter(Boolean)
          .join(" ");
        const displayName = supplier.person?.businessName || nameParts || supplier.code || "Proveedor";
        const contactName = nameParts || supplier.person?.businessName || "-";
        return {
          ...supplier,
          displayName,
          contactName,
          contactEmail: supplier.person?.email || "",
          contactPhone: supplier.person?.phone || "",
        };
      });
      setRows(mapped);
    } catch (err) {
      console.error("Error loading suppliers:", err);
      error("No se pudieron cargar los proveedores");
    }
  }, [search, error]);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const handleOpenCreate = useCallback(() => {
    setCreateDialogOpen(true);
  }, []);

  const handleOpenUpdate = useCallback((supplier: SupplierRow) => {
    setSelectedSupplier(supplier);
    setUpdateDialogOpen(true);
  }, []);

  const handleOpenDelete = useCallback((supplier: SupplierRow) => {
    setSelectedSupplier(supplier);
    setDeleteDialogOpen(true);
  }, []);

  const handleSuccess = useCallback(
    async (message: string) => {
      await loadSuppliers();
      success(message);
    },
    [success, loadSuppliers]
  );

  const columns: DataGridColumn[] = useMemo(() => {
    const ActionsCell = ({ row }: { row: SupplierRow }) => (
      <div className="flex items-center gap-1">
        <IconButton
          icon="edit"
          variant="basicSecondary"
          size="xs"
          onClick={() => handleOpenUpdate(row)}
          title="Editar proveedor"
        />
        <IconButton
          icon="delete"
          variant="basicSecondary"
          size="xs"
          onClick={() => handleOpenDelete(row)}
          title="Eliminar proveedor"
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
        headerName: "Proveedor",
        flex: 2,
        minWidth: 200,
        renderCell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{row.displayName}</span>
            {row.contactName && (
              <span className="text-xs text-muted-foreground">Contacto: {row.contactName}</span>
            )}
          </div>
        ),
      },
      {
        field: "supplierType",
        headerName: "Tipo",
        width: 140,
        renderCell: ({ value }) => supplierTypeLabels[value as SupplierType] || "-",
      },
      {
        field: "contactEmail",
        headerName: "Email",
        flex: 1,
        minWidth: 180,
        renderCell: ({ value }) => value || "-",
      },
      {
        field: "contactPhone",
        headerName: "Teléfono",
        width: 140,
        renderCell: ({ value }) => value || "-",
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
          <Badge variant={value ? "success" : "error"}>
            {value ? "Activo" : "Inactivo"}
          </Badge>
        ),
      },
      {
        field: "actions",
        headerName: "",
        width: 100,
        align: "center",
        sortable: false,
        filterable: false,
        renderCell: ({ row }) => <ActionsCell row={row as SupplierRow} />,
      },
    ];
  }, [handleOpenDelete, handleOpenUpdate]);

  return (
    <>
      <DataGrid
        title="Proveedores"
        columns={columns}
        rows={rows}
        totalRows={rows.length}
        onAddClick={handleOpenCreate}
        data-test-id="suppliers-grid"
        height="75vh"
      />

      <CreateSupplierDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSuccess={() => handleSuccess("Proveedor creado correctamente")}
      />

      <UpdateSupplierDialog
        open={updateDialogOpen}
        supplier={selectedSupplier}
        onClose={() => {
          setUpdateDialogOpen(false);
          setSelectedSupplier(null);
        }}
        onSuccess={() => handleSuccess("Proveedor actualizado correctamente")}
      />

      <DeleteSupplierDialog
        open={deleteDialogOpen}
        supplier={selectedSupplier}
        onClose={() => {
          setDeleteDialogOpen(false);
          setSelectedSupplier(null);
        }}
        onSuccess={() => handleSuccess("Proveedor eliminado correctamente")}
      />
    </>
  );
};

export default SuppliersDataGrid;
