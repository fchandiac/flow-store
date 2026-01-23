import { useEffect, useMemo, useState } from "react";
import Dialog from "@/app/baseComponents/Dialog/Dialog";
import Badge from "@/app/baseComponents/Badge/Badge";
import { CustomerSummarySection } from "./components/CustomerSummarySection";
import { CustomerPurchasesSection } from "./components/CustomerPurchasesSection";
import { CustomerPendingPaymentsSection } from "./components/CustomerPendingPaymentsSection";
import { CustomerPaymentsSection } from "./components/CustomerPaymentsSection";
import type { CustomerWithPerson } from "../types";
import { DocumentType } from "@/data/entities/Person";

interface CustomerDetailDialogProps {
  open: boolean;
  customer: CustomerWithPerson | null;
  onClose: () => void;
}

type SectionId = "summary" | "purchases" | "pendingPayments" | "payments";

const sections: Array<{ id: SectionId; label: string; icon: string }> = [
  { id: "summary", label: "Resumen", icon: "badge" },
  { id: "purchases", label: "Compras", icon: "shopping_cart" },
  { id: "pendingPayments", label: "Pagos pendientes", icon: "pending_actions" },
  { id: "payments", label: "Pagos realizados", icon: "payments" },
];

const documentTypeLabels: Record<DocumentType, string> = {
  [DocumentType.RUN]: "RUN",
  [DocumentType.RUT]: "RUT",
  [DocumentType.PASSPORT]: "Pasaporte",
  [DocumentType.OTHER]: "Otro",
};

export const CustomerDetailDialog: React.FC<CustomerDetailDialogProps> = ({ open, customer, onClose }) => {
  const [activeSection, setActiveSection] = useState<SectionId>("summary");

  useEffect(() => {
    if (open) {
      setActiveSection("summary");
    }
  }, [open]);

  const displayName = useMemo(() => {
    if (!customer) {
      return "Cliente";
    }

    const { person } = customer;
    const isNatural = person.type === "NATURAL";
    const fullName = [person.firstName, person.lastName].filter(Boolean).join(" ").trim();
    
    return isNatural ? fullName || person.businessName || person.firstName : person.businessName || fullName || person.firstName;
  }, [customer]);

  const documentInfo = useMemo(() => {
    if (!customer?.person?.documentNumber) {
      return null;
    }

    const documentType = customer.person.documentType;
    const typeLabel = documentType ? documentTypeLabels[documentType] ?? "Documento" : "Documento";
    return `${typeLabel}: ${customer.person.documentNumber}`;
  }, [customer]);

  if (!customer) {
    return null;
  }

  const renderSection = () => {
    switch (activeSection) {
      case "purchases":
        return <CustomerPurchasesSection customerId={customer.id} />;
      case "pendingPayments":
        return <CustomerPendingPaymentsSection customerId={customer.id} />;
      case "payments":
        return <CustomerPaymentsSection customerId={customer.id} />;
      case "summary":
      default:
        return <CustomerSummarySection customer={customer} />;
    }
  };

  return (
    <Dialog
      open={open && Boolean(customer)}
      onClose={onClose}
      size="xxl"
      scroll="body"
      className="p-4"
      showCloseButton
      closeButtonText="Cerrar"
      title="Detalle del cliente"
    >
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-neutral-200 pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900">{displayName}</h2>
            {documentInfo && <p className="mt-1 text-sm text-neutral-600">{documentInfo}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={customer.isActive ? "success" : "error"}>
              {customer.isActive ? "Activo" : "Inactivo"}
            </Badge>
            <span className="text-sm text-neutral-500">
              Día de pago: <strong>{customer.paymentDayOfMonth ? `Día ${customer.paymentDayOfMonth}` : "Sin definir"}</strong>
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
