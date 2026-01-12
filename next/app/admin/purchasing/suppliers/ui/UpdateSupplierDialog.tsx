import { useEffect, useMemo, useState } from "react";
import Dialog from "@/app/baseComponents/Dialog/Dialog";
import { TextField } from "@/app/baseComponents/TextField/TextField";
import Select from "@/app/baseComponents/Select/Select";
import { Button } from "@/app/baseComponents/Button/Button";
import Alert from "@/app/baseComponents/Alert/Alert";
import { updateSupplier } from "@/app/actions/suppliers";
import { SupplierType } from "@/data/entities/Supplier";
import { DocumentType, PersonType } from "@/data/entities/Person";
import { useAlert } from "@/app/globalstate/alert/useAlert";
import type { SupplierWithPerson } from "./types";

const supplierTypeOptions = [
  { id: SupplierType.LOCAL, label: "Local" },
  { id: SupplierType.MANUFACTURER, label: "Fabricante" },
  { id: SupplierType.DISTRIBUTOR, label: "Distribuidor" },
  { id: SupplierType.WHOLESALER, label: "Mayorista" },
];

const personTypeOptions = [
  { id: PersonType.NATURAL, label: "Persona natural" },
  { id: PersonType.COMPANY, label: "Empresa" },
];

const naturalDocumentTypeOptions = [
  { id: DocumentType.RUN, label: "RUN" },
  { id: DocumentType.PASSPORT, label: "Pasaporte" },
  { id: DocumentType.OTHER, label: "Otro" },
];

const companyDocumentTypeOptions = [
  { id: DocumentType.RUT, label: "RUT" },
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
  personType: PersonType;
  documentType: DocumentType;
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

const parseDocumentType = (value: string | DocumentType | null | undefined): DocumentType | undefined => {
  if (!value) {
    return undefined;
  }

  const normalized = typeof value === "string" ? value.trim().toUpperCase() : value;
  return (Object.values(DocumentType) as string[]).includes(normalized as string)
    ? (normalized as DocumentType)
    : undefined;
};

const sanitizeDocumentType = (personType: PersonType, value: DocumentType | undefined): DocumentType => {
  const fallback = personType === PersonType.COMPANY ? DocumentType.RUT : DocumentType.RUN;
  if (!value) {
    return fallback;
  }
  if (personType === PersonType.COMPANY) {
    return DocumentType.RUT;
  }
  return value === DocumentType.RUT ? DocumentType.RUN : value;
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

    const personType = supplier.person?.type ?? PersonType.COMPANY;
    const documentType = sanitizeDocumentType(
      personType,
      parseDocumentType(supplier.person?.documentType)
    );

    return {
      businessName: supplier.person?.businessName ?? "",
      firstName: supplier.person?.firstName ?? "",
      lastName: supplier.person?.lastName ?? "",
      personType,
      documentType,
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
      setErrors([]);
    } else {
      setForm(null);
      setErrors([]);
      setSubmitting(false);
    }
  }, [open, initialForm]);

  const documentTypeOptions = useMemo(
    () => (form ? (form.personType === PersonType.COMPANY ? companyDocumentTypeOptions : naturalDocumentTypeOptions) : []),
    [form]
  );

  const documentLabel = useMemo(() => {
    if (!form) {
      return "Documento";
    }
    if (form.personType === PersonType.COMPANY) {
      return "RUT";
    }
    return form.documentType === DocumentType.RUN ? "RUN" : "Documento";
  }, [form]);

  const handleChange = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const validate = () => {
    if (!form) {
      return ["Formulario incompleto"];
    }

    const validationErrors: string[] = [];
    const isCompany = form.personType === PersonType.COMPANY;

    if (isCompany) {
      if (!form.businessName.trim()) {
        validationErrors.push("Ingresa la razón social de la empresa");
      }
      if (!form.firstName.trim()) {
        validationErrors.push("Ingresa el nombre del contacto");
      }
    } else {
      if (!form.firstName.trim()) {
        validationErrors.push("Ingresa el nombre de la persona");
      }
      if (!form.lastName.trim()) {
        validationErrors.push("Ingresa el apellido de la persona");
      }
    }

    if (!form.documentNumber.trim()) {
      validationErrors.push("Ingresa el documento de la persona o empresa");
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
      const isCompany = form.personType === PersonType.COMPANY;
      const parsedPaymentTerm = Number.parseInt(form.defaultPaymentTermDays, 10);
      const paymentTerm = Number.isNaN(parsedPaymentTerm) ? 0 : Math.max(parsedPaymentTerm, 0);

      const result = await updateSupplier(supplierId, {
        firstName: form.firstName.trim() || undefined,
        lastName: form.lastName.trim() || undefined,
        businessName: isCompany ? form.businessName.trim() || undefined : undefined,
        documentType: isCompany ? DocumentType.RUT : form.documentType,
        documentNumber: form.documentNumber.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        supplierType: form.supplierType,
        alias: form.alias.trim() || undefined,
        defaultPaymentTermDays: paymentTerm,
        notes: form.notes.trim() || undefined,
      });

      if (!result.success) {
        throw new Error(result.error || "Error al actualizar el proveedor");
      }

      await onSuccess();
      onClose();
    } catch (err) {
      console.error("Error updating supplier:", err);
      error("No se pudo actualizar el proveedor. Inténtalo nuevamente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Actualizar proveedor" size="lg">
      {form && (
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

          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-neutral-700 border-b pb-2">Persona / Empresa</h3>

              <Select
                label="Tipo de persona"
                options={personTypeOptions}
                value={form.personType}
                onChange={() => null}
                disabled
                data-test-id="update-supplier-person-type"
              />

              {form.personType === PersonType.COMPANY ? (
                <div className="space-y-4">
                  <TextField
                    label="Razón social"
                    value={form.businessName}
                    onChange={(e) => handleChange("businessName", e.target.value)}
                    required
                    data-test-id="update-supplier-business-name"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TextField
                      label="Nombre de contacto"
                      value={form.firstName}
                      onChange={(e) => handleChange("firstName", e.target.value)}
                      required
                      data-test-id="update-supplier-first-name"
                    />
                    <TextField
                      label="Apellido de contacto"
                      value={form.lastName}
                      onChange={(e) => handleChange("lastName", e.target.value)}
                      data-test-id="update-supplier-last-name"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextField
                    label="Nombre"
                    value={form.firstName}
                    onChange={(e) => handleChange("firstName", e.target.value)}
                    required
                    data-test-id="update-supplier-first-name"
                  />
                  <TextField
                    label="Apellido"
                    value={form.lastName}
                    onChange={(e) => handleChange("lastName", e.target.value)}
                    required
                    data-test-id="update-supplier-last-name"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Tipo de documento"
                  options={documentTypeOptions}
                  value={form.documentType}
                  onChange={(value) => {
                    if (typeof value === "string" && form.personType !== PersonType.COMPANY) {
                      handleChange("documentType", value as DocumentType);
                    }
                  }}
                  disabled={form.personType === PersonType.COMPANY}
                  data-test-id="update-supplier-document-type"
                />
                <TextField
                  label={documentLabel}
                  value={form.documentNumber}
                  onChange={(e) => handleChange("documentNumber", e.target.value)}
                  required
                  data-test-id="update-supplier-document-number"
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
              </div>

              <TextField
                label="Dirección"
                value={form.address}
                onChange={(e) => handleChange("address", e.target.value)}
                data-test-id="update-supplier-address"
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-neutral-700 border-b pb-2">Detalles del proveedor</h3>

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
                  label="Plazo de pago predeterminado (días)"
                  type="number"
                  min={0}
                  value={form.defaultPaymentTermDays}
                  onChange={(e) => handleChange("defaultPaymentTermDays", e.target.value)}
                  data-test-id="update-supplier-payment-days"
                />
              </div>

              <TextField
                label="Notas"
                value={form.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                rows={3}
                data-test-id="update-supplier-notes"
              />
            </div>
          </div>

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
