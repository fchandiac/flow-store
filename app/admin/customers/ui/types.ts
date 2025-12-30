import type { Customer } from "@/data/entities/Customer";
import type { Person } from "@/data/entities/Person";

export type CustomerWithPerson = Customer & { person: Person };
