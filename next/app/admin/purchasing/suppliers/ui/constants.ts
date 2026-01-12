import { SupplierType } from "@/data/entities/Supplier";

export const supplierTypeLabels: Record<SupplierType, string> = {
  [SupplierType.MANUFACTURER]: "Fabricante",
  [SupplierType.DISTRIBUTOR]: "Distribuidor",
  [SupplierType.WHOLESALER]: "Mayorista",
  [SupplierType.LOCAL]: "Local",
};
