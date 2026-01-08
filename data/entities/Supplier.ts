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
import { Person } from "./Person";

export enum SupplierType {
    MANUFACTURER = 'MANUFACTURER',
    DISTRIBUTOR = 'DISTRIBUTOR',
    WHOLESALER = 'WHOLESALER',
    LOCAL = 'LOCAL',
}

@Entity("suppliers")
export class Supplier {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: 'uuid' })
    personId!: string;


    @Column({ type: 'enum', enum: SupplierType, default: SupplierType.LOCAL })
    supplierType!: SupplierType;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    creditLimit!: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    currentBalance!: number;

    @Column({ type: 'int', default: 0 })
    defaultPaymentTermDays!: number;

    @Column({ type: 'varchar', length: 100, nullable: true })
    bankName?: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    bankAccountNumber?: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    bankAccountType?: string;

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
    @ManyToOne(() => Person, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'personId' })
    person?: Person;

    // Note: Transaction has ManyToOne to Supplier
    // We don't define inverse OneToMany here to avoid circular metadata issues
}
