import "reflect-metadata";
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    Index,
} from "typeorm";

export enum PersonType {
    NATURAL = 'NATURAL',
    COMPANY = 'COMPANY'
}

export enum DocumentType {
    RUN = 'RUN',
    RUT = 'RUT',
    PASSPORT = 'PASSPORT',
    OTHER = 'OTHER',
}

export enum AccountTypeName {
    CUENTA_CORRIENTE = 'Cuenta Corriente',
    CUENTA_AHORRO = 'Cuenta de Ahorro',
    CUENTA_VISTA = 'Cuenta Vista',
    CUENTA_RUT = 'Cuenta RUT',
    CUENTA_CHEQUERA = 'Cuenta Chequera Electrónica',
    OTRO_TIPO = 'Otro',
}

export enum BankName {
    BANCO_CHILE = 'Banco de Chile',
    BANCO_ESTADO = 'Banco del Estado de Chile',
    BANCO_SANTANDER = 'Banco Santander Chile',
    BANCO_BCI = 'Banco de Crédito e Inversiones',
    BANCO_FALABELLA = 'Banco Falabella',
    BANCO_SECURITY = 'Banco Security',
    BANCO_CREDICHILE = 'Banco CrediChile',
    BANCO_ITAU = 'Banco Itaú Corpbanca',
    BANCO_SCOTIABANK = 'Scotiabank Chile',
    BANCO_CONSORCIO = 'Banco Consorcio',
    BANCO_RIPLEY = 'Banco Ripley',
    BANCO_INTERNACIONAL = 'Banco Internacional',
    BANCO_BICE = 'Banco BICE',
    BANCO_PARIS = 'Banco Paris',
    BANCO_MERCADO_PAGO = 'Banco Mercado Pago',
    OTRO = 'Otro',
}

export interface PersonBankAccount {
    accountKey?: string;
    bankName: BankName;
    accountType: AccountTypeName;
    accountNumber: string;
    accountHolderName?: string;
    isPrimary?: boolean;
    notes?: string;
    currentBalance?: number;
}

@Entity("persons")
export class Person {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: 'enum', enum: PersonType, default: PersonType.NATURAL })
    type!: PersonType;

    @Column({ type: 'varchar', length: 100 })
    firstName!: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    lastName?: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    businessName?: string;

    @Column({ type: 'enum', enum: DocumentType, nullable: true })
    documentType?: DocumentType | null;

    @Index()
    @Column({ type: 'varchar', length: 50, nullable: true })
    documentNumber?: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    email?: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    phone?: string;

    @Column({ type: 'text', nullable: true })
    address?: string;

    @Column({ type: 'json', nullable: true })
    bankAccounts?: PersonBankAccount[] | null;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @DeleteDateColumn()
    deletedAt?: Date;

    // Note: Customer and Supplier have ManyToOne to Person
    // We don't define the inverse OneToMany here to avoid circular metadata issues
}
