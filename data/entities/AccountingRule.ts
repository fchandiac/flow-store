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
import { AccountingAccount } from "./AccountingAccount";
import { ExpenseCategory } from "./ExpenseCategory";
import { Tax } from "./Tax";
import { TransactionType, PaymentMethod } from "./Transaction";

export enum RuleScope {
    TRANSACTION = "TRANSACTION",
    TRANSACTION_LINE = "TRANSACTION_LINE",
}

@Entity("accounting_rules")
export class AccountingRule {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: "uuid" })
    companyId!: string;

    @Column({ type: "enum", enum: RuleScope })
    appliesTo!: RuleScope;

    @Column({ type: "enum", enum: TransactionType })
    transactionType!: TransactionType;

    @Column({ type: "uuid", nullable: true })
    expenseCategoryId?: string | null;

    @Column({ type: "uuid", nullable: true })
    taxId?: string | null;

    @Column({ type: "enum", enum: PaymentMethod, nullable: true })
    paymentMethod?: PaymentMethod | null;

    @Column({ type: "uuid" })
    debitAccountId!: string;

    @Column({ type: "uuid" })
    creditAccountId!: string;

    @Column({ type: "int", default: 0 })
    priority!: number;

    @Column({ type: "boolean", default: true })
    isActive!: boolean;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @ManyToOne(() => Company, { onDelete: "RESTRICT" })
    @JoinColumn({ name: "companyId" })
    company!: Company;

    @ManyToOne(() => ExpenseCategory, { onDelete: "SET NULL" })
    @JoinColumn({ name: "expenseCategoryId" })
    expenseCategory?: ExpenseCategory | null;

    @ManyToOne(() => Tax, { onDelete: "SET NULL" })
    @JoinColumn({ name: "taxId" })
    tax?: Tax | null;

    @ManyToOne(() => AccountingAccount, { onDelete: "RESTRICT" })
    @JoinColumn({ name: "debitAccountId" })
    debitAccount!: AccountingAccount;

    @ManyToOne(() => AccountingAccount, { onDelete: "RESTRICT" })
    @JoinColumn({ name: "creditAccountId" })
    creditAccount!: AccountingAccount;
}
