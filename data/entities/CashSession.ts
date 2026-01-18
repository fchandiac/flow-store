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
import { PointOfSale } from "./PointOfSale";
import { User } from "./User";

export type CashSessionTenderBreakdown = {
    cash: number;
    debitCard: number;
    creditCard: number;
    transfer: number;
    check: number;
    other: number;
};

export type CashSessionClosingDetails = {
    countedByUserId: string;
    countedByUserName?: string | null;
    countedAt: string;
    notes?: string | null;
    actual: CashSessionTenderBreakdown;
    expected: CashSessionTenderBreakdown;
    difference: {
        cash: number;
        total: number;
    };
};

export enum CashSessionStatus {
    OPEN = 'OPEN',
    CLOSED = 'CLOSED',
    RECONCILED = 'RECONCILED',
}

@Entity("cash_sessions")
export class CashSession {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: 'uuid', nullable: true })
    pointOfSaleId?: string;

    @Column({ type: 'uuid', nullable: true })
    openedById?: string;

    @Column({ type: 'uuid', nullable: true })
    closedById?: string;

    @Column({ type: 'enum', enum: CashSessionStatus, default: CashSessionStatus.OPEN })
    status!: CashSessionStatus;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    openingAmount!: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
    closingAmount?: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
    expectedAmount?: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
    difference?: number;

    @Column({ type: 'datetime' })
    openedAt!: Date;

    @Column({ type: 'datetime', nullable: true })
    closedAt?: Date;

    @Column({ type: 'text', nullable: true })
    notes?: string;

    @Column({ type: 'json', nullable: true })
    closingDetails?: CashSessionClosingDetails | null;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @DeleteDateColumn()
    deletedAt?: Date;

    // Relations
    @ManyToOne(() => PointOfSale, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'pointOfSaleId' })
    pointOfSale?: PointOfSale;

    @ManyToOne(() => User, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'openedById' })
    openedBy?: User;

    @ManyToOne(() => User, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'closedById' })
    closedBy?: User;

    // Note: Transaction has ManyToOne to CashSession
    // We don't define inverse OneToMany here to avoid circular metadata issues
}
