import "reflect-metadata";
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
} from "typeorm";
import type { PointOfSale } from "./PointOfSale";
import type { User } from "./User";
import type { Transaction } from "./Transaction";

export enum CashSessionStatus {
    OPEN = 'OPEN',
    CLOSED = 'CLOSED',
    RECONCILED = 'RECONCILED',
}

@Entity("cash_sessions")
export class CashSession {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: 'uuid' })
    pointOfSaleId!: string;

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

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    // Relations
    @ManyToOne('PointOfSale', 'cashSessions', { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'pointOfSaleId' })
    pointOfSale?: PointOfSale;

    @ManyToOne('User', { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'openedById' })
    openedBy?: User;

    @ManyToOne('User', { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'closedById' })
    closedBy?: User;

    @OneToMany('Transaction', 'cashSession')
    transactions?: Transaction[];
}
