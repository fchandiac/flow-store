"use client";

import { useEffect, useState } from "react";
import Dialog from "@/app/baseComponents/Dialog/Dialog";
import Select from "@/app/baseComponents/Select/Select";
import { TextField } from "@/app/baseComponents/TextField/TextField";
import { Button } from "@/app/baseComponents/Button/Button";
import Alert from "@/app/baseComponents/Alert/Alert";
import { addSupplierBankAccount } from "@/app/actions/suppliers";
import { useAlert } from "@/app/globalstate/alert/useAlert";
import type { SupplierWithPerson } from "../../types";
import { AccountTypeName, BankName } from "@/data/entities/Person";

interface AddBankAccountDialogProps {
  open: boolean;
  supplierId: string;
  onClose: () => void;
  onSuccess: (supplier: SupplierWithPerson) => void;
}

interface BankAccountFormState {
  bankName: BankName;
  accountType: AccountTypeName;
  accountNumber: string;
  accountHolderName: string;
  isPrimary: boolean;
  notes: string;
}

const bankOptions = Object.values(BankName).map((label) => ({
  id: label,
  label,
}));

const accountTypeOptions = Object.values(AccountTypeName).map((label) => ({
  id: label,
  label,
}));

const createInitialForm = (): BankAccountFormState => ({
  bankName: (bankOptions[0]?.id as BankName) ?? BankName.BANCO_CHILE,
  accountType: (accountTypeOptions[0]?.id as AccountTypeName) ?? AccountTypeName.CUENTA_CORRIENTE,
  accountNumber: "",
  accountHolderName: "",
  isPrimary: false,
  notes: "",
});

export const AddBankAccountDialog: React.FC<AddBankAccountDialogProps> = ({ open, supplierId, onClose, onSuccess }) => {
  const { success, error } = useAlert();
  const [formState, setFormState] = useState<BankAccountFormState>(() => createInitialForm());
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setFormState(createInitialForm());
      setErrors([]);
      setSubmitting(false);
    }
  }, [open]);

  const validate = () => {
    const validationErrors: string[] = [];
    if (!formState.bankName) {
      validationErrors.push("Selecciona el banco");
    }
    if (!formState.accountType) {
      validationErrors.push("Selecciona el tipo de cuenta");
    }
    if (!formState.accountNumber.trim()) {
      validationErrors.push("Ingresa el número de cuenta");
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
      const result = await addSupplierBankAccount(supplierId, {
        bankName: formState.bankName,
        accountType: formState.accountType,
        accountNumber: formState.accountNumber.trim(),
        accountHolderName: formState.accountHolderName.trim() || undefined,
        isPrimary: formState.isPrimary,
        notes: formState.notes.trim() || undefined,
      });

      if (!result.success || !result.supplier) {
        throw new Error(result.error || "No se pudo agregar la cuenta bancaria");
      }

      success("Cuenta bancaria agregada correctamente");
      onSuccess(result.supplier as SupplierWithPerson);
      setFormState(createInitialForm());
      setSubmitting(false);
      onClose();
    } catch (err) {
      console.error("Error adding bank account:", err);
      error(err instanceof Error ? err.message : "Error al agregar la cuenta bancaria");
      setSubmitting(false);
      return;
    }
  };

  return (
    <Dialog open={open} onClose={() => (!submitting ? onClose() : undefined)} title="Agregar cuenta bancaria" size="md" scroll="paper">
      <form onSubmit={handleSubmit} className="space-y-5">
        {errors.length > 0 && (
          <Alert variant="error">
            <ul className="list-disc list-inside space-y-1">
              {errors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Select
            label="Banco"
            options={bankOptions}
            value={formState.bankName}
            onChange={(value) => {
              if (typeof value === "string") {
                setFormState((prev) => ({ ...prev, bankName: value as BankName }));
              }
            }}
            required
          />
          <Select
            label="Tipo de cuenta"
            options={accountTypeOptions}
            value={formState.accountType}
            onChange={(value) => {
              if (typeof value === "string") {
                setFormState((prev) => ({ ...prev, accountType: value as AccountTypeName }));
              }
            }}
            required
          />
        </div>

        <TextField
          label="Número de cuenta"
          value={formState.accountNumber}
          onChange={(event) => setFormState((prev) => ({ ...prev, accountNumber: event.target.value }))}
          required
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TextField
            label="Titular (opcional)"
            value={formState.accountHolderName}
            onChange={(event) => setFormState((prev) => ({ ...prev, accountHolderName: event.target.value }))}
          />
          <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
            <input
              type="checkbox"
              className="h-5 w-5 rounded border border-neutral-300 text-primary-600 focus:ring-primary-500"
              checked={formState.isPrimary}
              onChange={(event) => setFormState((prev) => ({ ...prev, isPrimary: event.target.checked }))}
            />
            Marcar como principal
          </label>
        </div>

        <TextField
          label="Notas"
          value={formState.notes}
          onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))}
          type="textarea"
          rows={3}
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="text" type="button" onClick={() => (!submitting ? onClose() : undefined)}>
            Cancelar
          </Button>
          <Button type="submit" loading={submitting}>
            Guardar
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
