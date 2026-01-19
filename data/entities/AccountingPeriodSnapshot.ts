import "reflect-metadata";
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Unique,
    Index,
} from "typeorm";
import { AccountingPeriod } from "./AccountingPeriod";
import { AccountingAccount } from "./AccountingAccount";

/**
 * Snapshot consolidado al cierre de un período contable.
 * Permite reconstituir saldos sin recalcular toda la historia.
 */
@Entity("accounting_period_snapshots")
@Unique(["periodId", "accountId"])
@Index(["periodId"])
export class AccountingPeriodSnapshot {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: "uuid" })
    periodId!: string;

    @Column({ type: "uuid" })
    accountId!: string;

    @Column({ type: "decimal", precision: 18, scale: 2, default: 0 })
    closingBalance!: number;

    @Column({ type: "decimal", precision: 18, scale: 2, default: 0 })
    debitSum!: number;

    @Column({ type: "decimal", precision: 18, scale: 2, default: 0 })
    creditSum!: number;

    @Column({ type: "json", nullable: true })
    metadata?: Record<string, any> | null;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @ManyToOne(() => AccountingPeriod, { onDelete: "CASCADE" })
    @JoinColumn({ name: "periodId" })
    period!: AccountingPeriod;

    @ManyToOne(() => AccountingAccount, { onDelete: "RESTRICT" })
    @JoinColumn({ name: "accountId" })
    account!: AccountingAccount;
}
