import "reflect-metadata";
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    Index,
} from "typeorm";

export enum PersonType {
    NATURAL = 'NATURAL',
    COMPANY = 'COMPANY'
}

export enum DocumentType {
    RUN = 'RUN',
    RUT = 'RUT',
    PASSPORT = 'PASSPORT',
    OTHER = 'OTHER',
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

    @Column({ type: 'enum', enum: DocumentType, nullable: true })
    documentType?: DocumentType | null;

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

    // Note: Customer and Supplier have ManyToOne to Person
    // We don't define the inverse OneToMany here to avoid circular metadata issues
}
