import type { ReactNode } from "react";
import Badge from "@/app/baseComponents/Badge/Badge";
import { DocumentType, PersonType } from "@/data/entities/Person";
import type { CustomerWithPerson } from "../../types";

const documentTypeLabels: Record<DocumentType, string> = {
  [DocumentType.RUN]: "RUN",
  [DocumentType.RUT]: "RUT",
  [DocumentType.PASSPORT]: "Pasaporte",
  [DocumentType.OTHER]: "Otro",
};

const currencyFormatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

interface CustomerSummarySectionProps {
  customer: CustomerWithPerson;
}

const InfoItem = ({ label, value }: { label: string; value: ReactNode }) => (
  <div>
    <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}</span>
    <div className="mt-1 text-sm text-neutral-800">{value || "-"}</div>
  </div>
);

export const CustomerSummarySection: React.FC<CustomerSummarySectionProps> = ({ customer }) => {
  const person = customer.person;
  const isCompany = person?.type === PersonType.COMPANY;

  const documentLabel = person?.documentType ? documentTypeLabels[person.documentType] : undefined;
  const contactName = [person?.firstName, person?.lastName].filter(Boolean).join(" ");

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-neutral-200 bg-neutral-50 p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-600">Información comercial</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <InfoItem
            label="Estado"
            value={<Badge variant={customer.isActive ? "success" : "error"}>{customer.isActive ? "Activo" : "Inactivo"}</Badge>}
          />
          <InfoItem label="Límite de crédito" value={currencyFormatter.format(customer.creditLimit || 0)} />
          <InfoItem label="Saldo actual" value={currencyFormatter.format(customer.currentBalance || 0)} />
          <InfoItem label="Día de pago" value={customer.paymentDayOfMonth ? `Día ${customer.paymentDayOfMonth}` : "-"} />
        </div>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-600">
          Información de contacto
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {isCompany ? (
            <InfoItem label="Razón social" value={person?.businessName || "-"} />
          ) : (
            <InfoItem label="Nombre" value={contactName || "-"} />
          )}
          {isCompany && <InfoItem label="Contacto" value={contactName || "-"} />}
          <InfoItem label="Email" value={person?.email || "-"} />
          <InfoItem label="Teléfono" value={person?.phone || "-"} />
          <InfoItem label="Dirección" value={person?.address || "-"} />
          <InfoItem
            label="Documento"
            value={person?.documentNumber ? `${documentLabel ?? "Documento"}: ${person.documentNumber}` : "-"}
          />
        </div>
      </section>
    </div>
  );
};
