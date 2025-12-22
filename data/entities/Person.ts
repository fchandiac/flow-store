import "reflect-metadata";
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    Index,
    OneToMany,
} from "typeorm";
import type { Customer } from "./Customer";
import type { Supplier } from "./Supplier";

export enum PersonType {
    NATURAL = 'NATURAL',
    COMPANY = 'COMPANY'
}

@Entity("persons")
export class Person {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: 'enum', enum: PersonType, default: PersonType.NATURAL })
    type!: PersonType;

    @Column({ type: 'varchar', length: 100 })
    firstName!: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    lastName?: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    businessName?: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    documentType?: string;

    @Index()
    @Column({ type: 'varchar', length: 50, nullable: true })
    documentNumber?: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    email?: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    phone?: string;

    @Column({ type: 'text', nullable: true })
    address?: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @DeleteDateColumn()
    deletedAt?: Date;

    // Relations
    @OneToMany('Customer', 'person')
    customers?: Customer[];

    @OneToMany('Supplier', 'person')
    suppliers?: Supplier[];
}
