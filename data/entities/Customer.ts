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

@Entity("customers")
export class Customer {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: 'uuid' })
    personId!: string;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    creditLimit!: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    currentBalance!: number;

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

    // Note: Transaction has ManyToOne to Customer
    // We don't define inverse OneToMany here to avoid circular metadata issues
}
