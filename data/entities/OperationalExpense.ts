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
import { CostCenter } from "./CostCenter";
import { ExpenseCategory } from "./ExpenseCategory";
import { Supplier } from "./Supplier";
import { Employee } from "./Employee";
import { User } from "./User";

export enum OperationalExpenseStatus {
    DRAFT = "DRAFT",
    PENDING_APPROVAL = "PENDING_APPROVAL",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED",
    CANCELLED = "CANCELLED",
}

export interface OperationalExpenseMetadata {
    estimatedAmount?: number;
    invoiceNumber?: string;
    notes?: string;
    attachments?: string[];
}

@Entity("operational_expenses")
export class OperationalExpense {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: "uuid" })
    companyId!: string;

    @Column({ type: "uuid", nullable: true })
    branchId?: string | null;

    @Column({ type: "uuid" })
    costCenterId!: string;

    @Column({ type: "uuid" })
    categoryId!: string;

    @Column({ type: "uuid", nullable: true })
    supplierId?: string | null;

    @Column({ type: "uuid", nullable: true })
    employeeId?: string | null;

    @Column({ type: "varchar", length: 60 })
    referenceNumber!: string;

    @Column({ type: "text", nullable: true })
    description?: string;

    @Column({ type: "date" })
    operationDate!: string;

    @Column({ type: "enum", enum: OperationalExpenseStatus, default: OperationalExpenseStatus.DRAFT })
    status!: OperationalExpenseStatus;

    @Column({ type: "json", nullable: true })
    metadata?: OperationalExpenseMetadata | null;

    @Column({ type: "uuid" })
    createdBy!: string;

    @Column({ type: "uuid", nullable: true })
    approvedBy?: string | null;

    @Column({ type: "datetime", nullable: true })
    approvedAt?: Date | null;

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

    @ManyToOne(() => CostCenter, { onDelete: "RESTRICT" })
    @JoinColumn({ name: "costCenterId" })
    costCenter!: CostCenter;

    @ManyToOne(() => ExpenseCategory, { onDelete: "RESTRICT" })
    @JoinColumn({ name: "categoryId" })
    category!: ExpenseCategory;

    @ManyToOne(() => Supplier, { onDelete: "SET NULL" })
    @JoinColumn({ name: "supplierId" })
    supplier?: Supplier | null;

    @ManyToOne(() => Employee, { onDelete: "SET NULL" })
    @JoinColumn({ name: "employeeId" })
    employee?: Employee | null;

    @ManyToOne(() => User, { onDelete: "RESTRICT" })
    @JoinColumn({ name: "createdBy" })
    createdByUser!: User;

    @ManyToOne(() => User, { onDelete: "SET NULL" })
    @JoinColumn({ name: "approvedBy" })
    approvedByUser?: User | null;
}
