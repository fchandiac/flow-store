import "reflect-metadata";
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
} from "typeorm";

@Entity("companies")
export class Company {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: 'varchar', length: 255 })
    name!: string;

    @Column({ type: 'varchar', length: 10, default: 'CLP' })
    defaultCurrency!: string;

    @Column({ type: 'date', nullable: true })
    fiscalYearStart?: Date;

    @Column({ type: 'boolean', default: true })
    isActive!: boolean;

    @Column({ type: 'json', nullable: true })
    settings?: Record<string, any>;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @DeleteDateColumn()
    deletedAt?: Date;

    // Note: Branches and Taxes are queried by companyId
    // No inverse relations to avoid circular dependency issues
}
