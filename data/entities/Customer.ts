import "reflect-metadata";
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
} from "typeorm";
import { Person } from "./Person";
import { Transaction } from "./Transaction";

export enum CustomerType {
    RETAIL = 'RETAIL',
    WHOLESALE = 'WHOLESALE',
    VIP = 'VIP',
}

@Entity("customers")
export class Customer {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: 'uuid' })
    personId!: string;

    @Column({ type: 'varchar', length: 50, unique: true, nullable: true })
    code?: string;

    @Column({ type: 'enum', enum: CustomerType, default: CustomerType.RETAIL })
    customerType!: CustomerType;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    creditLimit!: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    currentBalance!: number;

    @Column({ type: 'int', default: 0 })
    defaultPaymentTermDays!: number;

    @Column({ type: 'uuid', nullable: true })
    defaultPriceListId?: string;

    @Column({ type: 'boolean', default: true })
    isActive!: boolean;

    @Column({ type: 'text', nullable: true })
    notes?: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @DeleteDateColumn()
    deletedAt?: Date;

    // Relations
    @ManyToOne(() => Person, person => person.customers, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'personId' })
    person?: Person;

    @OneToMany(() => Transaction, transaction => transaction.customer)
    transactions?: Transaction[];
}
