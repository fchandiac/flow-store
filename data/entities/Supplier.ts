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

    @Column({ type: 'varchar', length: 255, nullable: true })
    alias?: string;

    @Column({ type: 'int', default: 0 })
    defaultPaymentTermDays!: number;

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
