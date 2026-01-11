"use client";

import Dialog from "@/app/baseComponents/Dialog/Dialog";
import { Button } from "@/app/baseComponents/Button/Button";
import Alert from "@/app/baseComponents/Alert/Alert";
import { deleteSupplier } from "@/app/actions/suppliers";
import { useAlert } from "@/app/globalstate/alert/useAlert";
import { useEffect, useState } from "react";
import type { SupplierWithPerson } from "./types";

interface DeleteSupplierDialogProps {
  open: boolean;
  supplier: SupplierWithPerson | null;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}

export const DeleteSupplierDialog = ({ open, supplier, onClose, onSuccess }: DeleteSupplierDialogProps) => {
  const { error } = useAlert();
  const [submitting, setSubmitting] = useState(false);
  const supplierName = supplier?.person?.businessName || supplier?.person?.firstName || "este proveedor";

  useEffect(() => {
    if (!open) {
      setSubmitting(false);
    }
  }, [open]);

  const handleDelete = async () => {
    if (!supplier) {
      return;
    }

    try {
      setSubmitting(true);
      const result = await deleteSupplier(supplier.id);
      if (!result.success) {
        throw new Error(result.error || "No se pudo eliminar el proveedor");
      }
      await onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error("Error deleting supplier:", err);
      error(err instanceof Error ? err.message : "No se pudo eliminar el proveedor");
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Eliminar proveedor" size="sm">
      {!supplier ? (
        <div className="py-8 text-center text-sm text-neutral-500">
          Selecciona un proveedor para eliminarlo.
        </div>
      ) : (
        <div className="space-y-6">
          <Alert variant="warning">
            Esta acción eliminará al proveedor <strong>{supplierName}</strong>. Luego no podrás recuperarlo.
          </Alert>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="!bg-red-600 hover:!bg-red-700"
              onClick={handleDelete}
              loading={submitting}
              disabled={submitting}
            >
              Eliminar
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
};

export default DeleteSupplierDialog;
