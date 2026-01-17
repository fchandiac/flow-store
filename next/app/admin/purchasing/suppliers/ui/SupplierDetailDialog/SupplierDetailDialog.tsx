import { useEffect, useMemo, useState } from "react";
import Dialog from "@/app/baseComponents/Dialog/Dialog";
import Badge from "@/app/baseComponents/Badge/Badge";
import { supplierTypeLabels } from "../constants";
import { SupplierSummarySection } from "./components/SupplierSummarySection";
import { SupplierBankAccountsSection } from "./components/SupplierBankAccountsSection";
import { SupplierPurchasesSection } from "./components/SupplierPurchasesSection";
import type { SupplierWithPerson } from "../types";
import { DocumentType } from "@/data/entities/Person";

interface SupplierDetailDialogProps {
  open: boolean;
  supplier: SupplierWithPerson | null;
  onClose: () => void;
  onSupplierUpdate?: (supplier: SupplierWithPerson) => void;
}

type SectionId = "summary" | "purchases" | "bankAccounts";

const sections: Array<{ id: SectionId; label: string; icon: string }> = [
  { id: "summary", label: "Resumen", icon: "badge" },
  { id: "purchases", label: "Compras", icon: "shopping_cart" },
  { id: "bankAccounts", label: "Cuentas bancarias", icon: "account_balance" },
];

const documentTypeLabels: Record<DocumentType, string> = {
  [DocumentType.RUN]: "RUN",
  [DocumentType.RUT]: "RUT",
  [DocumentType.PASSPORT]: "Pasaporte",
  [DocumentType.OTHER]: "Otro",
};

export const SupplierDetailDialog: React.FC<SupplierDetailDialogProps> = ({ open, supplier, onClose, onSupplierUpdate }) => {
  const [activeSection, setActiveSection] = useState<SectionId>("summary");

  useEffect(() => {
    if (open) {
      setActiveSection("summary");
    }
  }, [open]);

  const displayName = useMemo(() => {
    if (!supplier) {
      return "Proveedor";
    }

    const alias = supplier.alias?.trim();
    const businessName = supplier.person?.businessName;
    const fullName = [supplier.person?.firstName, supplier.person?.lastName].filter(Boolean).join(" ");

    return alias || businessName || fullName || "Proveedor";
  }, [supplier]);

  const documentInfo = useMemo(() => {
    if (!supplier?.person?.documentNumber) {
      return null;
    }

    const documentType = supplier.person.documentType;
    const typeLabel = documentType ? documentTypeLabels[documentType] ?? "Documento" : "Documento";
    return `${typeLabel}: ${supplier.person.documentNumber}`;
  }, [supplier]);

  if (!supplier) {
    return null;
  }

  const renderSection = () => {
    switch (activeSection) {
      case "bankAccounts":
        return (
          <SupplierBankAccountsSection
            supplier={supplier}
            onSupplierUpdate={onSupplierUpdate}
          />
        );
      case "purchases":
        return <SupplierPurchasesSection supplierId={supplier.id} />;
      case "summary":
      default:
        return <SupplierSummarySection supplier={supplier} />;
    }
  };

  return (
    <Dialog
      open={open && Boolean(supplier)}
      onClose={onClose}
      size="xxl"
      scroll="body"
      className="p-4"
      showCloseButton
      closeButtonText="Cerrar"
      title="Detalle del proveedor"
    >
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-neutral-200 pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900">{displayName}</h2>
            {documentInfo && <p className="mt-1 text-sm text-neutral-600">{documentInfo}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="info">{supplierTypeLabels[supplier.supplierType] ?? "-"}</Badge>
            <Badge variant={supplier.isActive ? "success" : "error"}>
              {supplier.isActive ? "Activo" : "Inactivo"}
            </Badge>
            <span className="text-sm text-neutral-500">
              Plazo de pago: <strong>{supplier.defaultPaymentTermDays} días</strong>
            </span>
          </div>
        </header>

        <div className="flex flex-col gap-6 lg:flex-row">
          <aside className="lg:w-64">
            <nav className="space-y-2">
              {sections.map((section) => {
                const isActive = section.id === activeSection;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSection(section.id)}
                    className={`group flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-all duration-200 ${
                      isActive
                        ? "border-primary-200 bg-primary-50 text-primary-700 shadow-sm"
                        : "border-transparent bg-white text-neutral-600 hover:-translate-y-px hover:border-primary-100 hover:bg-neutral-50 hover:text-primary-700 hover:shadow"
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-base transition-colors duration-200 ${
                        isActive ? "text-primary-600" : "text-neutral-400 group-hover:text-primary-500"
                      }`}
                    >
                      {section.icon}
                    </span>
                    <span>{section.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <main className="flex-1 overflow-hidden">{renderSection()}</main>
        </div>
      </div>
    </Dialog>
  );
};
