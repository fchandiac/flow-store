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
import { Person } from "./Person";
import { Branch } from "./Branch";
import { CostCenter } from "./CostCenter";
import { OrganizationalUnit } from "./OrganizationalUnit";

export enum EmploymentType {
    FULL_TIME = "FULL_TIME",
    PART_TIME = "PART_TIME",
    CONTRACTOR = "CONTRACTOR",
    TEMPORARY = "TEMPORARY",
    INTERN = "INTERN",
}

export enum EmployeeStatus {
    ACTIVE = "ACTIVE",
    SUSPENDED = "SUSPENDED",
    TERMINATED = "TERMINATED",
}

@Entity("employees")
export class Employee {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: "uuid" })
    companyId!: string;

    @Column({ type: "uuid" })
    personId!: string;

    @Column({ type: "uuid", nullable: true })
    branchId?: string | null;

    @Column({ type: "uuid", nullable: true })
    costCenterId?: string | null;

    @Column({ type: "uuid", nullable: true })
    organizationalUnitId?: string | null;

    @Column({ type: "enum", enum: EmploymentType, default: EmploymentType.FULL_TIME })
    employmentType!: EmploymentType;

    @Column({ type: "enum", enum: EmployeeStatus, default: EmployeeStatus.ACTIVE })
    status!: EmployeeStatus;

    @Column({ type: "date" })
    hireDate!: string;

    @Column({ type: "date", nullable: true })
    terminationDate?: string | null;

    @Column({ type: "bigint", nullable: true })
    baseSalary?: string | null;

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

    @ManyToOne(() => Person, { onDelete: "RESTRICT" })
    @JoinColumn({ name: "personId" })
    person!: Person;

    @ManyToOne(() => Branch, { onDelete: "SET NULL" })
    @JoinColumn({ name: "branchId" })
    branch?: Branch | null;

    @ManyToOne(() => CostCenter, { onDelete: "SET NULL" })
    @JoinColumn({ name: "costCenterId" })
    costCenter?: CostCenter | null;

    @ManyToOne(() => OrganizationalUnit, { onDelete: "SET NULL" })
    @JoinColumn({ name: "organizationalUnitId" })
    organizationalUnit?: OrganizationalUnit | null;
}
