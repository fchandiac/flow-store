"use client";

import { useEffect, useState } from "react";
import IconButton from "@/app/baseComponents/IconButton/IconButton";
import type { PersonBankAccount } from "@/data/entities/Person";
import type { SupplierWithPerson } from "../../types";
import { AddBankAccountDialog } from "@/app/admin/purchasing/suppliers/ui/SupplierDetailDialog/components/AddBankAccountDialog";

interface SupplierBankAccountsSectionProps {
  supplier: SupplierWithPerson;
  onSupplierUpdate?: (supplier: SupplierWithPerson) => void;
}

const AccountCard = ({ account }: { account: PersonBankAccount }) => (
  <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm transition-shadow duration-200 hover:shadow-md">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-neutral-800">{account.bankName}</p>
        <p className="text-xs text-neutral-500">{account.accountType}</p>
      </div>
      {account.isPrimary && (
        <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-700">
          Principal
        </span>
      )}
    </div>

    <dl className="mt-4 space-y-2 text-sm text-neutral-700">
      <div>
        <dt className="text-xs uppercase tracking-wide text-neutral-500">Número de cuenta</dt>
        <dd className="mt-0.5 font-mono text-sm">{account.accountNumber}</dd>
      </div>
      {account.accountHolderName && (
        <div>
          <dt className="text-xs uppercase tracking-wide text-neutral-500">Titular</dt>
          <dd className="mt-0.5">{account.accountHolderName}</dd>
        </div>
      )}
      {account.notes && (
        <div>
          <dt className="text-xs uppercase tracking-wide text-neutral-500">Notas</dt>
          <dd className="mt-0.5 whitespace-pre-wrap text-sm text-neutral-700">{account.notes}</dd>
        </div>
      )}
    </dl>
  </div>
);

export const SupplierBankAccountsSection: React.FC<SupplierBankAccountsSectionProps> = ({ supplier, onSupplierUpdate }) => {
  const [accounts, setAccounts] = useState<PersonBankAccount[]>(() => {
    return (supplier.person?.bankAccounts as PersonBankAccount[] | null | undefined) ?? [];
  });
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    setAccounts((supplier.person?.bankAccounts as PersonBankAccount[] | null | undefined) ?? []);
  }, [supplier]);

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleBankAccountAdded = (updatedSupplier: SupplierWithPerson) => {
    setAccounts((updatedSupplier.person?.bankAccounts as PersonBankAccount[] | null | undefined) ?? []);
    onSupplierUpdate?.(updatedSupplier);
  };

  const hasAccounts = accounts.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="flex justify-end">
          <IconButton
            icon="add"
            variant="ghost"
            size="md"
            onClick={() => setDialogOpen(true)}
            ariaLabel="Agregar cuenta bancaria"
            title="Agregar cuenta bancaria"
          />
        </div>
        {hasAccounts ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {accounts.map((account, index) => (
              <AccountCard key={`${account.accountNumber}-${index}`} account={account} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-6 text-center text-sm text-neutral-600">
            No hay cuentas bancarias registradas para este proveedor.
          </div>
        )}
      </div>

      <AddBankAccountDialog
        open={dialogOpen}
        supplierId={supplier.id}
        onClose={handleCloseDialog}
        onSuccess={(updated: SupplierWithPerson) => {
          handleBankAccountAdded(updated);
          handleCloseDialog();
        }}
      />
    </div>
  );
};
