export type CustomerWithPerson = {
    id: string;
    personId: string;
    creditLimit: number;
    paymentDayOfMonth: 5 | 10 | 15 | 20 | 25 | 30;
    notes?: string;
    currentBalance: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    person: {
        id: string;
        type: import("@/data/entities/Person").PersonType;
        firstName: string;
        lastName?: string;
        businessName?: string;
        documentType?: import("@/data/entities/Person").DocumentType | null;
        documentNumber?: string;
        email?: string;
        phone?: string;
        address?: string;
        createdAt: Date;
        updatedAt: Date;
    };
};
