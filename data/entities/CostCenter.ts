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

export enum CostCenterType {
    SALES = "SALES",
    OPERATIONS = "OPERATIONS",
    ADMIN = "ADMIN",
    MARKETING = "MARKETING",
    OTHER = "OTHER",
}

@Entity("cost_centers")
export class CostCenter {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: "uuid" })
    companyId!: string;

    @Column({ type: "uuid", nullable: true })
    parentId?: string | null;

    @Column({ type: "uuid", nullable: true })
    branchId?: string | null;

    @Column({ type: "varchar", length: 50 })
    code!: string;

    @Column({ type: "varchar", length: 255 })
    name!: string;

    @Column({ type: "text", nullable: true })
    description?: string;

    @Column({ type: "enum", enum: CostCenterType, default: CostCenterType.OTHER })
    type!: CostCenterType;

    @Column({ type: "boolean", default: true })
    isActive!: boolean;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @ManyToOne(() => Company, { onDelete: "RESTRICT" })
    @JoinColumn({ name: "companyId" })
    company!: Company;

    @ManyToOne(() => CostCenter, { onDelete: "SET NULL" })
    @JoinColumn({ name: "parentId" })
    parent?: CostCenter | null;

    @ManyToOne(() => Branch, { onDelete: "SET NULL" })
    @JoinColumn({ name: "branchId" })
    branch?: Branch | null;
}
