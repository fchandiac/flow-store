"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Dialog from "@/app/baseComponents/Dialog/Dialog";
import AutoComplete, { type Option as AutoCompleteOption } from "@/app/baseComponents/AutoComplete/AutoComplete";
import { TextField } from "@/app/baseComponents/TextField/TextField";
import Select from "@/app/baseComponents/Select/Select";
import { Button } from "@/app/baseComponents/Button/Button";
import Alert from "@/app/baseComponents/Alert/Alert";
import { createSupplier } from "@/app/actions/suppliers";
import { searchPersons } from "@/app/actions/persons";
import { SupplierType } from "@/data/entities/Supplier";
import { DocumentType, PersonType } from "@/data/entities/Person";
import { useAlert } from "@/app/globalstate/alert/useAlert";

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

interface CreateSupplierDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}

type PersonSearchResult = Awaited<ReturnType<typeof searchPersons>>[number];

interface PersonOption extends AutoCompleteOption {
  person?: PersonSearchResult;
  isCreateOption?: boolean;
  searchTerm?: string;
}

interface SupplierFormState {
  supplierType: SupplierType;
  alias: string;
  defaultPaymentTermDays: string;
  notes: string;
}

interface PersonFormState {
  personType: PersonType;
  documentType: DocumentType;
  firstName: string;
  lastName: string;
  businessName: string;
  documentNumber: string;
  email: string;
  phone: string;
  address: string;
}

const createInitialSupplierForm = (): SupplierFormState => ({
  supplierType: SupplierType.LOCAL,
  alias: "",
  defaultPaymentTermDays: "30",
  notes: "",
});

const createInitialPersonForm = (): PersonFormState => ({
  personType: PersonType.COMPANY,
  documentType: DocumentType.RUT,
  firstName: "",
  lastName: "",
  businessName: "",
  documentNumber: "",
  email: "",
  phone: "",
  address: "",
});

const buildPersonLabel = (person: PersonSearchResult): string => {
  const primaryName = person.businessName?.trim()
    || [person.firstName, person.lastName].filter(Boolean).join(" ").trim()
    || "Persona sin nombre";
  const documentLabel = person.documentNumber
    ? `${person.documentType ?? "Documento"} ${person.documentNumber}`
    : "Sin documento";
  const typeLabel = person.type === PersonType.COMPANY ? "Empresa" : "Persona natural";
  return `${primaryName} · ${documentLabel} (${typeLabel})`;
};

const buildCreateOption = (term: string): PersonOption => ({
  id: "__create__",
  label: "Crear nueva persona",
  isCreateOption: true,
  searchTerm: term,
});

export const CreateSupplierDialog = ({ open, onClose, onSuccess }: CreateSupplierDialogProps) => {
  const { error } = useAlert();
  const [supplierForm, setSupplierForm] = useState<SupplierFormState>(() => createInitialSupplierForm());
  const [personForm, setPersonForm] = useState<PersonFormState>(() => createInitialPersonForm());
  const [personOptions, setPersonOptions] = useState<PersonOption[]>([]);
  const [selectedPersonOption, setSelectedPersonOption] = useState<PersonOption | null>(null);
  const [personSearchTerm, setPersonSearchTerm] = useState("");
  const [isCreatingNewPerson, setIsCreatingNewPerson] = useState(false);
  const [isSearchingPersons, setIsSearchingPersons] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [autocompleteLocked, setAutocompleteLocked] = useState(false);

  const documentTypeOptions = useMemo(
    () => (personForm.personType === PersonType.COMPANY ? companyDocumentTypeOptions : naturalDocumentTypeOptions),
    [personForm.personType]
  );

  const documentLabel = useMemo(() => {
    if (personForm.personType === PersonType.COMPANY) {
      return "RUT";
    }
    return personForm.documentType === DocumentType.RUN ? "RUN" : "Documento";
  }, [personForm.personType, personForm.documentType]);

  const selectedPerson = selectedPersonOption?.person ?? null;

  const resetState = () => {
    setSupplierForm(createInitialSupplierForm());
    setPersonForm(createInitialPersonForm());
    setPersonOptions([]);
    setSelectedPersonOption(null);
    setPersonSearchTerm("");
    setIsCreatingNewPerson(false);
    setIsSearchingPersons(false);
    setErrors([]);
    setSubmitting(false);
    setAutocompleteLocked(false);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    resetState();
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [open]);

  const handleSupplierFieldChange = (field: keyof SupplierFormState, value: string) => {
    setSupplierForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePersonFieldChange = (field: keyof PersonFormState, value: string) => {
    setPersonForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePersonTypeChange = (value: PersonType) => {
    setPersonForm((prev) => ({
      ...prev,
      personType: value,
      documentType: value === PersonType.COMPANY ? DocumentType.RUT : prev.documentType === DocumentType.RUT ? DocumentType.RUN : prev.documentType,
      businessName: value === PersonType.COMPANY ? prev.businessName : "",
    }));
  };

  const handleDocumentTypeChange = (value: DocumentType) => {
    setPersonForm((prev) => ({ ...prev, documentType: value }));
  };

  const handlePersonSearchInput = (value: string) => {
    if (autocompleteLocked) {
      return;
    }
    setPersonSearchTerm(value);

    if (!value) {
      setPersonOptions([]);
      setSelectedPersonOption(null);
    }
  };

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (isCreatingNewPerson) {
      setIsSearchingPersons(false);
      return;
    }

    const trimmed = personSearchTerm.trim();

    if (!trimmed) {
      setPersonOptions([]);
      setIsSearchingPersons(false);
      return;
    }

    if (trimmed.length < 2) {
      setPersonOptions([buildCreateOption(trimmed)]);
      setIsSearchingPersons(false);
      return;
    }

    setIsSearchingPersons(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const persons = await searchPersons({ term: trimmed, limit: 10 });
        const mapped: PersonOption[] = persons.map((person) => ({
          id: person.id,
          label: buildPersonLabel(person),
          person,
        }));

        mapped.push(buildCreateOption(trimmed));
        setPersonOptions(mapped);
      } catch (err) {
        console.error("Error searching persons", err);
        setPersonOptions([buildCreateOption(trimmed)]);
      } finally {
        setIsSearchingPersons(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [personSearchTerm, isCreatingNewPerson]);

  const handlePersonSelection = (option: PersonOption | null) => {
    if (!option) {
      if (autocompleteLocked) {
        return;
      }
      setSelectedPersonOption(null);
      setIsCreatingNewPerson(false);
      setPersonForm(createInitialPersonForm());
      return;
    }

    if (option.isCreateOption) {
      setSelectedPersonOption(null);
      setIsCreatingNewPerson(true);
      setAutocompleteLocked(true);
      setPersonOptions([]);
      setPersonSearchTerm("");
      setPersonForm((prev) => ({
        ...createInitialPersonForm(),
        personType: prev.personType,
        documentType: prev.personType === PersonType.COMPANY
          ? DocumentType.RUT
          : prev.documentType === DocumentType.RUT
            ? DocumentType.RUN
            : prev.documentType,
      }));
      return;
    }

    setSelectedPersonOption(option);
    setIsCreatingNewPerson(false);
  };

  const validate = () => {
    const validationErrors: string[] = [];

    if (!selectedPersonOption && !isCreatingNewPerson) {
      validationErrors.push("Selecciona una persona o crea una nueva");
    }

    if (isCreatingNewPerson) {
      if (!personForm.firstName.trim()) {
        validationErrors.push("Ingresa el nombre del contacto");
      }
      if (personForm.personType === PersonType.COMPANY && !personForm.businessName.trim()) {
        validationErrors.push("Ingresa la razón social de la empresa");
      }
      if (personForm.personType === PersonType.NATURAL && !personForm.lastName.trim()) {
        validationErrors.push("Ingresa el apellido de la persona");
      }
      if (!personForm.documentNumber.trim()) {
        validationErrors.push("Ingresa el documento de la persona o empresa");
      }
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

    const payload: Parameters<typeof createSupplier>[0] = {
      alias: supplierForm.alias.trim() || undefined,
      supplierType: supplierForm.supplierType,
      defaultPaymentTermDays: parseInt(supplierForm.defaultPaymentTermDays, 10) || 0,
      notes: supplierForm.notes.trim() || undefined,
    };

    if (isCreatingNewPerson) {
      payload.person = {
        type: personForm.personType,
        firstName: personForm.firstName.trim(),
        lastName: personForm.lastName.trim() || undefined,
        businessName: personForm.personType === PersonType.COMPANY ? personForm.businessName.trim() || undefined : undefined,
        documentType: personForm.personType === PersonType.COMPANY ? DocumentType.RUT : personForm.documentType,
        documentNumber: personForm.documentNumber.trim() || undefined,
        email: personForm.email.trim() || undefined,
        phone: personForm.phone.trim() || undefined,
        address: personForm.address.trim() || undefined,
      };
    } else if (selectedPersonOption?.person) {
      payload.personId = selectedPersonOption.person.id;
    }

    try {
      const result = await createSupplier(payload);

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

        <div className="space-y-4">
          <h3 className="text-sm font-medium text-neutral-700 border-b pb-2">Persona / Empresa</h3>
          {!autocompleteLocked && (
            <>
              <AutoComplete<PersonOption>
                label="Persona/Empresa"
                placeholder="Persona/Empresa"
                options={personOptions}
                value={selectedPersonOption}
                onChange={handlePersonSelection}
                onInputChange={handlePersonSearchInput}
                filterOption={(option, inputValue) => {
                  if ((option as PersonOption).isCreateOption) {
                    return true;
                  }
                  return option.label.toLowerCase().includes(inputValue.toLowerCase());
                }}
                data-test-id="create-supplier-person-autocomplete"
              />

              {isSearchingPersons && (
                <p className="text-xs text-neutral-500">Buscando personas…</p>
              )}
            </>
          )}

          {!isCreatingNewPerson && selectedPerson && (
            <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4 text-sm space-y-1">
              <p className="font-medium text-neutral-800">{buildPersonLabel(selectedPerson)}</p>
              {selectedPerson.email && <p className="text-neutral-600">Correo: {selectedPerson.email}</p>}
              {selectedPerson.phone && <p className="text-neutral-600">Teléfono: {selectedPerson.phone}</p>}
              {selectedPerson.address && <p className="text-neutral-600">Dirección: {selectedPerson.address}</p>}
            </div>
          )}

          {isCreatingNewPerson && (
            <div className="space-y-4">
              <Select
                label="Tipo de persona"
                options={personTypeOptions}
                value={personForm.personType}
                onChange={(value) => {
                  if (typeof value === "string") {
                    handlePersonTypeChange(value as PersonType);
                  }
                }}
                data-test-id="create-supplier-person-type"
              />

              {personForm.personType === PersonType.COMPANY ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextField
                    label="Razón social"
                    value={personForm.businessName}
                    onChange={(e) => handlePersonFieldChange("businessName", e.target.value)}
                    required
                    data-test-id="create-supplier-business-name"
                  />
                  <TextField
                    label="Nombre de contacto"
                    value={personForm.firstName}
                    onChange={(e) => handlePersonFieldChange("firstName", e.target.value)}
                    required
                    data-test-id="create-supplier-contact-name"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextField
                    label="Nombre"
                    value={personForm.firstName}
                    onChange={(e) => handlePersonFieldChange("firstName", e.target.value)}
                    required
                    data-test-id="create-supplier-first-name"
                  />
                  <TextField
                    label="Apellido"
                    value={personForm.lastName}
                    onChange={(e) => handlePersonFieldChange("lastName", e.target.value)}
                    required
                    data-test-id="create-supplier-last-name"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Tipo de documento"
                  options={documentTypeOptions}
                  value={personForm.documentType}
                  onChange={(value) => {
                    if (typeof value === "string") {
                      handleDocumentTypeChange(value as DocumentType);
                    }
                  }}
                  disabled={personForm.personType === PersonType.COMPANY}
                  data-test-id="create-supplier-person-document-type"
                />
                <TextField
                  label={documentLabel}
                  type="dni"
                  value={personForm.documentNumber}
                  onChange={(e) => handlePersonFieldChange("documentNumber", e.target.value)}
                  required
                  data-test-id="create-supplier-person-document"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextField
                  label="Email"
                  type="email"
                  value={personForm.email}
                  onChange={(e) => handlePersonFieldChange("email", e.target.value)}
                  data-test-id="create-supplier-person-email"
                />
                <TextField
                  label="Teléfono"
                  value={personForm.phone}
                  onChange={(e) => handlePersonFieldChange("phone", e.target.value)}
                  data-test-id="create-supplier-person-phone"
                />
              </div>

              <TextField
                label="Dirección"
                value={personForm.address}
                onChange={(e) => handlePersonFieldChange("address", e.target.value)}
                data-test-id="create-supplier-person-address"
              />
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium text-neutral-700 border-b pb-2">Detalles del proveedor</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Tipo de proveedor"
              options={supplierTypeOptions}
              value={supplierForm.supplierType}
              onChange={(value) => handleSupplierFieldChange("supplierType", value as SupplierFormState["supplierType"])}
              data-test-id="create-supplier-type"
            />
            <TextField
              label="Alias del proveedor"
              value={supplierForm.alias}
              onChange={(e) => handleSupplierFieldChange("alias", e.target.value)}
              data-test-id="create-supplier-alias"
            />
            <TextField
              label="Plazo de pago predeterminado (días)"
              type="number"
              value={supplierForm.defaultPaymentTermDays}
              onChange={(e) => handleSupplierFieldChange("defaultPaymentTermDays", e.target.value)}
              data-test-id="create-supplier-payment-days"
            />
          </div>

          <TextField
            label="Notas"
            value={supplierForm.notes}
            onChange={(e) => handleSupplierFieldChange("notes", e.target.value)}
            rows={3}
            data-test-id="create-supplier-notes"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              resetState();
              onClose();
            }}
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
