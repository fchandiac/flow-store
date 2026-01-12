import type { ReactNode } from "react";
import Badge from "@/app/baseComponents/Badge/Badge";
import { supplierTypeLabels } from "../../constants";
import { DocumentType, PersonType } from "@/data/entities/Person";
import type { SupplierWithPerson } from "../../types";

const documentTypeLabels: Record<DocumentType, string> = {
  [DocumentType.RUN]: "RUN",
  [DocumentType.RUT]: "RUT",
  [DocumentType.PASSPORT]: "Pasaporte",
  [DocumentType.OTHER]: "Otro",
};

interface SupplierSummarySectionProps {
  supplier: SupplierWithPerson;
}

const InfoItem = ({ label, value }: { label: string; value: ReactNode }) => (
  <div>
    <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}</span>
    <div className="mt-1 text-sm text-neutral-800">{value || "-"}</div>
  </div>
);

export const SupplierSummarySection: React.FC<SupplierSummarySectionProps> = ({ supplier }) => {
  const person = supplier.person;
  const isCompany = person?.type === PersonType.COMPANY;

  const documentLabel = person?.documentType ? documentTypeLabels[person.documentType] : undefined;
  const contactName = [person?.firstName, person?.lastName].filter(Boolean).join(" ");

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-neutral-200 bg-neutral-50 p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-600">Información principal</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <InfoItem label="Tipo de proveedor" value={supplierTypeLabels[supplier.supplierType] ?? "-"} />
          <InfoItem
            label="Estado"
            value={<Badge variant={supplier.isActive ? "success" : "error"}>{supplier.isActive ? "Activo" : "Inactivo"}</Badge>}
          />
          <InfoItem label="Alias" value={supplier.alias || "-"} />
          <InfoItem label="Plazo de pago (días)" value={supplier.defaultPaymentTermDays?.toString() ?? "0"} />
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

      {supplier.notes && (
        <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-600">Notas internas</h3>
          <p className="text-sm text-neutral-700 whitespace-pre-wrap">{supplier.notes}</p>
        </section>
      )}
    </div>
  );
};
