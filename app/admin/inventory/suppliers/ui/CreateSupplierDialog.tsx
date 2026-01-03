"use client";

import { useState, useEffect } from "react";
import Dialog from "@/app/baseComponents/Dialog/Dialog";
import { TextField } from "@/app/baseComponents/TextField/TextField";
import Select from "@/app/baseComponents/Select/Select";
import { Button } from "@/app/baseComponents/Button/Button";
import Alert from "@/app/baseComponents/Alert/Alert";
import { createSupplier } from "@/app/actions/suppliers";
import { SupplierType } from "@/data/entities/Supplier";
import { useAlert } from "@/app/state/hooks/useAlert";

const supplierTypeOptions = [
  { id: SupplierType.LOCAL, label: "Local" },
  { id: SupplierType.MANUFACTURER, label: "Fabricante" },
  { id: SupplierType.DISTRIBUTOR, label: "Distribuidor" },
  { id: SupplierType.WHOLESALER, label: "Mayorista" },
];

interface CreateSupplierDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}

interface FormState {
  code: string;
  businessName: string;
  firstName: string;
  lastName: string;
  documentType: string;
  documentNumber: string;
  email: string;
  phone: string;
  address: string;
  supplierType: SupplierType;
  creditLimit: string;
  defaultPaymentTermDays: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountType: string;
  notes: string;
}

const initialFormState: FormState = {
  code: "",
  businessName: "",
  firstName: "",
  lastName: "",
  documentType: "RUT",
  documentNumber: "",
  email: "",
  phone: "",
  address: "",
  supplierType: SupplierType.LOCAL,
  creditLimit: "0",
  defaultPaymentTermDays: "30",
  bankName: "",
  bankAccountNumber: "",
  bankAccountType: "",
  notes: "",
};

export const CreateSupplierDialog = ({ open, onClose, onSuccess }: CreateSupplierDialogProps) => {
  const { error } = useAlert();
  const [form, setForm] = useState<FormState>(initialFormState);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setForm(initialFormState);
      setErrors([]);
      setSubmitting(false);
    }
  }, [open]);

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validate = () => {
    const validationErrors: string[] = [];
    if (!form.code.trim()) {
      validationErrors.push("El código es obligatorio");
    }
    const primaryName = form.firstName.trim() || form.businessName.trim();
    if (!primaryName) {
      validationErrors.push("Ingresa el nombre del contacto o la razón social");
    }
    return validationErrors;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationErrors = validate();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    setErrors([]);

    try {
      const primaryName = form.firstName.trim() || form.businessName.trim();
      const result = await createSupplier({
        firstName: primaryName,
        lastName: form.lastName.trim() || undefined,
        businessName: form.businessName.trim() || undefined,
        documentType: form.documentType.trim() || undefined,
        documentNumber: form.documentNumber.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        code: form.code.trim(),
        supplierType: form.supplierType,
        creditLimit: parseFloat(form.creditLimit.replace(/[^0-9.-]+/g, "")) || 0,
        defaultPaymentTermDays: parseInt(form.defaultPaymentTermDays, 10) || 0,
        bankName: form.bankName.trim() || undefined,
        bankAccountNumber: form.bankAccountNumber.trim() || undefined,
        bankAccountType: form.bankAccountType.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });

      if (!result.success) {
        throw new Error(result.error || "Error al crear el proveedor");
      }

      await onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error("Error creating supplier:", err);
      error(err instanceof Error ? err.message : "Error al crear el proveedor");
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Crear Proveedor" size="lg">
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
          <TextField
            label="Código"
            value={form.code}
            onChange={(e) => handleChange("code", e.target.value)}
            required
            data-test-id="create-supplier-code"
          />
          <Select
            label="Tipo de proveedor"
            options={supplierTypeOptions}
            value={form.supplierType}
            onChange={(value) => handleChange("supplierType", value as SupplierType)}
            data-test-id="create-supplier-type"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField
            label="Razón social"
            value={form.businessName}
            onChange={(e) => handleChange("businessName", e.target.value)}
            data-test-id="create-supplier-business-name"
          />
          <TextField
            label="Nombre de contacto"
            value={form.firstName}
            onChange={(e) => handleChange("firstName", e.target.value)}
            data-test-id="create-supplier-first-name"
          />
          <TextField
            label="Apellido de contacto"
            value={form.lastName}
            onChange={(e) => handleChange("lastName", e.target.value)}
            data-test-id="create-supplier-last-name"
          />
          <TextField
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => handleChange("email", e.target.value)}
            data-test-id="create-supplier-email"
          />
          <TextField
            label="Teléfono"
            value={form.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            data-test-id="create-supplier-phone"
          />
          <TextField
            label="Dirección"
            value={form.address}
            onChange={(e) => handleChange("address", e.target.value)}
            data-test-id="create-supplier-address"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField
            label="Documento"
            value={form.documentNumber}
            onChange={(e) => handleChange("documentNumber", e.target.value)}
            data-test-id="create-supplier-document-number"
          />
          <TextField
            label="Tipo de cuenta bancaria"
            value={form.bankAccountType}
            onChange={(e) => handleChange("bankAccountType", e.target.value)}
            data-test-id="create-supplier-bank-account-type"
          />
          <TextField
            label="Banco"
            value={form.bankName}
            onChange={(e) => handleChange("bankName", e.target.value)}
            data-test-id="create-supplier-bank-name"
          />
          <TextField
            label="Número de cuenta"
            value={form.bankAccountNumber}
            onChange={(e) => handleChange("bankAccountNumber", e.target.value)}
            data-test-id="create-supplier-bank-account-number"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField
            label="Límite de crédito"
            type="currency"
            value={form.creditLimit}
            onChange={(e) => handleChange("creditLimit", e.target.value)}
            data-test-id="create-supplier-credit-limit"
          />
          <TextField
            label="Plazo de pago predeterminado (días)"
            type="number"
            value={form.defaultPaymentTermDays}
            onChange={(e) => handleChange("defaultPaymentTermDays", e.target.value)}
            data-test-id="create-supplier-payment-days"
          />
        </div>

        <TextField
          label="Notas"
          value={form.notes}
          onChange={(e) => handleChange("notes", e.target.value)}
          rows={3}
          data-test-id="create-supplier-notes"
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
            Crear proveedor
          </Button>
        </div>
      </form>
    </Dialog>
  );
};

export default CreateSupplierDialog;
