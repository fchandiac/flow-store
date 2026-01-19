"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import DataGrid, { type DataGridColumn } from "@/app/baseComponents/DataGrid/DataGrid";
import Badge from "@/app/baseComponents/Badge/Badge";
import IconButton from "@/app/baseComponents/IconButton/IconButton";
import { getSuppliers } from "@/app/actions/suppliers";
import { SupplierType } from "@/data/entities/Supplier";
import { useAlert } from "@/app/globalstate/alert/useAlert";
import { CreateSupplierDialog } from "./CreateSupplierDialog";
import { UpdateSupplierDialog } from "./UpdateSupplierDialog";
import { DeleteSupplierDialog } from "./DeleteSupplierDialog";
import { SupplierDetailDialog } from "./SupplierDetailDialog";
import { supplierTypeLabels } from "./constants";
import type { SupplierWithPerson } from "./types";

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
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierRow | null>(null);

  const search = searchParams.get("search") || "";

  const mapSupplierToRow = useCallback((supplier: SupplierWithPerson): SupplierRow => {
    const nameParts = [supplier.person?.firstName, supplier.person?.lastName]
      .filter(Boolean)
      .join(" ");
    const displayName = supplier.alias?.trim() || supplier.person?.businessName || nameParts || "Proveedor";
    const contactName = nameParts || supplier.person?.businessName || "-";

    return {
      ...supplier,
      displayName,
      contactName,
      contactEmail: supplier.person?.email || "",
      contactPhone: supplier.person?.phone || "",
    };
  }, []);

  const loadSuppliers = useCallback(async () => {
    try {
      const data = await getSuppliers(search ? { search } : undefined);
      const mapped: SupplierRow[] = data.map(mapSupplierToRow);
      setRows(mapped);
    } catch (err) {
      console.error("Error loading suppliers:", err);
      error("No se pudieron cargar los proveedores");
    }
  }, [search, error, mapSupplierToRow]);

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

  const handleOpenDetail = useCallback((supplier: SupplierRow) => {
    setSelectedSupplier(supplier);
    setDetailDialogOpen(true);
  }, []);

  const handleSuccess = useCallback(
    async (message: string) => {
      await loadSuppliers();
      success(message);
    },
    [success, loadSuppliers]
  );

  const handleSupplierUpdated = useCallback(
    (updatedSupplier: SupplierWithPerson) => {
      const mapped = mapSupplierToRow(updatedSupplier);

      setRows((prevRows) => {
        const index = prevRows.findIndex((row) => row.id === mapped.id);
        if (index === -1) {
          return prevRows;
        }
        const nextRows = [...prevRows];
        nextRows[index] = mapped;
        return nextRows;
      });

      setSelectedSupplier((prev) => {
        if (!prev || prev.id !== mapped.id) {
          return prev;
        }
        return mapped;
      });
    },
    [mapSupplierToRow]
  );

  const SupplierActionsCell = ({ row }: { row: SupplierRow }) => (
    <div className="flex items-center gap-1">
      <IconButton
        icon="more_horiz"
        variant="basicSecondary"
        size="xs"
        onClick={(event) => {
          event.stopPropagation();
          handleOpenDetail(row);
        }}
        title="Ver detalle del proveedor"
      />
      <IconButton
        icon="edit"
        variant="basicSecondary"
        size="xs"
        onClick={(event) => {
          event.stopPropagation();
          handleOpenUpdate(row);
        }}
        title="Editar proveedor"
      />
      <IconButton
        icon="delete"
        variant="basicSecondary"
        size="xs"
        onClick={(event) => {
          event.stopPropagation();
          handleOpenDelete(row);
        }}
        title="Eliminar proveedor"
      />
    </div>
  );

  const columns: DataGridColumn[] = useMemo(() => {
    return [
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
        field: "isActive",
        headerName: "Estado",
        width: 110,
        align: "left",
        headerAlign: "left",
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
        align: "left",
        sortable: false,
        filterable: false,
        renderCell: ({ row }) => <SupplierActionsCell row={row as SupplierRow} />,
      },
    ];
  }, [handleOpenDelete, handleOpenDetail, handleOpenUpdate]);

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

      <SupplierDetailDialog
        open={detailDialogOpen}
        supplier={selectedSupplier}
        onClose={() => {
          setDetailDialogOpen(false);
          setSelectedSupplier(null);
        }}
        onSupplierUpdate={handleSupplierUpdated}
      />
    </>
  );
};

export default SuppliersDataGrid;
