"use client";

import { useState, useEffect, useMemo } from "react";
import Dialog from "@/app/baseComponents/Dialog/Dialog";
import { TextField } from "@/app/baseComponents/TextField/TextField";
import Select from "@/app/baseComponents/Select/Select";
import { Button } from "@/app/baseComponents/Button/Button";
import Alert from "@/app/baseComponents/Alert/Alert";
import { updateSupplier } from "@/app/actions/suppliers";
import { SupplierType } from "@/data/entities/Supplier";
import { DocumentType } from "@/data/entities/Person";
import { useAlert } from "@/app/globalstate/alert/useAlert";
import type { SupplierWithPerson } from "./types";

const supplierTypeOptions = [
  { id: SupplierType.LOCAL, label: "Local" },
  { id: SupplierType.MANUFACTURER, label: "Fabricante" },
  { id: SupplierType.DISTRIBUTOR, label: "Distribuidor" },
  { id: SupplierType.WHOLESALER, label: "Mayorista" },
];

interface UpdateSupplierDialogProps {
  open: boolean;
  supplier: SupplierWithPerson | null;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}

interface FormState {
  businessName: string;
  firstName: string;
  lastName: string;
  documentType: string;
  documentNumber: string;
  email: string;
  phone: string;
  address: string;
  supplierType: SupplierType;
  alias: string;
  defaultPaymentTermDays: string;
  notes: string;
}

const toNumberString = (value: number | null | undefined, fallback = "0") => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }
  return value.toString();
};

const parseDocumentType = (value: string | null | undefined): DocumentType | undefined => {
  if (!value) return undefined;
  const normalized = value.trim().toUpperCase();
  return (Object.values(DocumentType) as string[]).includes(normalized)
    ? (normalized as DocumentType)
    : undefined;
};

export const UpdateSupplierDialog = ({
  open,
  supplier,
  onClose,
  onSuccess,
}: UpdateSupplierDialogProps) => {
  const { error } = useAlert();
  const [form, setForm] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const supplierId = supplier?.id ?? "";

  const initialForm: FormState | null = useMemo(() => {
    if (!supplier) {
      return null;
    }

    return {
      businessName: supplier.person?.businessName ?? "",
      firstName: supplier.person?.firstName ?? "",
      lastName: supplier.person?.lastName ?? "",
      documentType: supplier.person?.documentType ?? "RUT",
      documentNumber: supplier.person?.documentNumber ?? "",
      email: supplier.person?.email ?? "",
      phone: supplier.person?.phone ?? "",
      address: supplier.person?.address ?? "",
      supplierType: supplier.supplierType,
      alias: supplier.alias ?? "",
      defaultPaymentTermDays: toNumberString(supplier.defaultPaymentTermDays, "30"),
      notes: supplier.notes ?? "",
    };
  }, [supplier]);

  useEffect(() => {
    if (open) {
      setForm(initialForm);
    } else {
      setForm(null);
      setErrors([]);
      setSubmitting(false);
    }
  }, [open, initialForm]);

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const validate = () => {
    if (!form) return ["Formulario incompleto"];
    const validationErrors: string[] = [];
    const primaryName = form.firstName.trim() || form.businessName.trim();
    if (!primaryName) {
      validationErrors.push("Ingresa el nombre del contacto o la razón social");
    }
    return validationErrors;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form) {
      return;
    }

    const validationErrors = validate();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    setErrors([]);

    try {
      const primaryName = form.firstName.trim() || form.businessName.trim();
      const result = await updateSupplier(supplierId, {
        firstName: primaryName,
        lastName: form.lastName.trim() || undefined,
        businessName: form.businessName.trim() || undefined,
        documentType: parseDocumentType(form.documentType),
        documentNumber: form.documentNumber.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        supplierType: form.supplierType,
        alias: form.alias.trim() || undefined,
        defaultPaymentTermDays: parseInt(form.defaultPaymentTermDays, 10) || 0,
        notes: form.notes.trim() || undefined,
      });

      if (!result.success) {
        throw new Error(result.error || "Error al actualizar el proveedor");
      }

      await onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error("Error updating supplier:", err);
      error(err instanceof Error ? err.message : "Error al actualizar el proveedor");
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Editar Proveedor" size="lg">
      {!form ? (
        <div className="py-8 text-center text-sm text-neutral-500">
          Cargando proveedor…
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {errors.length > 0 && (
            <Alert variant="error">
              <ul className="list-disc list-inside space-y-1">
                {errors.map((errMsg) => (
                  <li key={errMsg}>{errMsg}</li>
                ))}
              </ul>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Tipo de proveedor"
              options={supplierTypeOptions}
              value={form.supplierType}
              onChange={(value) => handleChange("supplierType", value as SupplierType)}
              data-test-id="update-supplier-type"
            />
            <TextField
              label="Alias del proveedor"
              value={form.alias}
              onChange={(e) => handleChange("alias", e.target.value)}
              data-test-id="update-supplier-alias"
            />
            <TextField
              label="Razón social"
              value={form.businessName}
              onChange={(e) => handleChange("businessName", e.target.value)}
              data-test-id="update-supplier-business-name"
            />
            <TextField
              label="Nombre de contacto"
              value={form.firstName}
              onChange={(e) => handleChange("firstName", e.target.value)}
              data-test-id="update-supplier-first-name"
            />
            <TextField
              label="Apellido de contacto"
              value={form.lastName}
              onChange={(e) => handleChange("lastName", e.target.value)}
              data-test-id="update-supplier-last-name"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              data-test-id="update-supplier-email"
            />
            <TextField
              label="Teléfono"
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              data-test-id="update-supplier-phone"
            />
            <TextField
              label="Dirección"
              value={form.address}
              onChange={(e) => handleChange("address", e.target.value)}
              data-test-id="update-supplier-address"
            />
            <TextField
              label="Documento"
              value={form.documentNumber}
              onChange={(e) => handleChange("documentNumber", e.target.value)}
              data-test-id="update-supplier-document-number"
            />
          </div>

          <TextField
            label="Plazo de pago predeterminado (días)"
            type="number"
            value={form.defaultPaymentTermDays}
            onChange={(e) => handleChange("defaultPaymentTermDays", e.target.value)}
            data-test-id="update-supplier-payment-days"
          />

          <TextField
            label="Notas"
            value={form.notes}
            onChange={(e) => handleChange("notes", e.target.value)}
            rows={3}
            data-test-id="update-supplier-notes"
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={submitting} disabled={submitting}>
              Guardar cambios
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
};

export default UpdateSupplierDialog;
