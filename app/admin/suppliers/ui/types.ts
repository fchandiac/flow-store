import type { Supplier } from "@/data/entities/Supplier";
import type { Person } from "@/data/entities/Person";

export type SupplierWithPerson = Supplier & { person?: Person | null };
