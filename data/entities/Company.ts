import "reflect-metadata";
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    OneToMany,
} from "typeorm";
import { Branch } from "./Branch";
import { Tax } from "./Tax";

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

    // Relations
    @OneToMany(() => Branch, branch => branch.company)
    branches?: Branch[];

    @OneToMany(() => Tax, tax => tax.company)
    taxes?: Tax[];
}
