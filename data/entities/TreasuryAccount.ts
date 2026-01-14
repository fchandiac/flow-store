import "reflect-metadata";
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from "typeorm";
import { Company } from "./Company";
import { Branch } from "./Branch";
import { BankName, AccountTypeName } from "./Person";

export enum TreasuryAccountType {
    BANK = "BANK",
    CASH = "CASH",
    VIRTUAL = "VIRTUAL",
}

export interface TreasuryAccountMetadata {
    notes?: string;
}

@Entity("treasury_accounts")
export class TreasuryAccount {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: "uuid" })
    companyId!: string;

    @Column({ type: "uuid", nullable: true })
    branchId?: string | null;

    @Column({ type: "enum", enum: TreasuryAccountType })
    type!: TreasuryAccountType;

    @Column({ type: "varchar", length: 255 })
    name!: string;

    @Column({ type: "enum", enum: BankName, nullable: true })
    bankName?: BankName | null;

    @Column({ type: "enum", enum: AccountTypeName, nullable: true })
    accountType?: AccountTypeName | null;

    @Column({ type: "varchar", length: 50, nullable: true })
    accountNumber?: string | null;

    @Column({ type: "boolean", default: true })
    isActive!: boolean;

    @Column({ type: "json", nullable: true })
    metadata?: TreasuryAccountMetadata | null;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @ManyToOne(() => Company, { onDelete: "RESTRICT" })
    @JoinColumn({ name: "companyId" })
    company!: Company;

    @ManyToOne(() => Branch, { onDelete: "SET NULL" })
    @JoinColumn({ name: "branchId" })
    branch?: Branch | null;
}
