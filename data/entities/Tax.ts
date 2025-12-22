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

export enum TaxType {
    IVA = 'IVA',
    EXEMPT = 'EXEMPT',
    RETENTION = 'RETENTION',
    SPECIFIC = 'SPECIFIC',
}

@Entity("taxes")
export class Tax {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: 'uuid' })
    companyId!: string;

    @Column({ type: 'varchar', length: 100 })
    name!: string;

    @Column({ type: 'varchar', length: 20, unique: true })
    code!: string;

    @Column({ type: 'enum', enum: TaxType, default: TaxType.IVA })
    taxType!: TaxType;

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
    rate!: number;

    @Column({ type: 'text', nullable: true })
    description?: string;

    @Column({ type: 'boolean', default: false })
    isDefault!: boolean;

    @Column({ type: 'boolean', default: true })
    isActive!: boolean;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @DeleteDateColumn()
    deletedAt?: Date;

    // Relations
    @ManyToOne(() => Company, company => company.taxes, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'companyId' })
    company?: Company;
}
