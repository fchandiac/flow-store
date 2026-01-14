import "reflect-metadata";
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    ManyToOne,
    JoinColumn,
} from "typeorm";
import { Company } from "./Company";
import { CostCenter } from "./CostCenter";

@Entity("expense_categories")
export class ExpenseCategory {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: "uuid" })
    companyId!: string;

    @Column({ type: "varchar", length: 50, unique: true })
    code!: string;

    @Column({ type: "varchar", length: 255 })
    name!: string;

    @Column({ type: "text", nullable: true })
    description?: string;

    @Column({ type: "boolean", default: false })
    requiresApproval!: boolean;

    @Column({ type: "decimal", precision: 15, scale: 2, default: 0 })
    approvalThreshold!: string;

    @Column({ type: "uuid", nullable: true })
    defaultCostCenterId?: string | null;

    @Column({ type: "boolean", default: true })
    isActive!: boolean;

    @Column({ type: "json", nullable: true })
    metadata?: Record<string, unknown> | null;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @DeleteDateColumn()
    deletedAt?: Date;

    @ManyToOne(() => Company, { onDelete: "RESTRICT" })
    @JoinColumn({ name: "companyId" })
    company!: Company;

    @ManyToOne(() => CostCenter, { onDelete: "SET NULL" })
    @JoinColumn({ name: "defaultCostCenterId" })
    defaultCostCenter?: CostCenter | null;
}
