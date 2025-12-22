import "reflect-metadata";
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, DeleteDateColumn } from "typeorm";
import { Person } from "./Person";

export enum UserRole {
    ADMIN = 'ADMIN',
    OPERATOR = 'OPERATOR'
}

@Entity("users")
export class User {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column("varchar")
    userName!: string;

    @Column("varchar")
    pass!: string;


    @Column("varchar")
    mail!: string;

    @Column({
        type: 'enum',
        enum: UserRole,
        default: UserRole.OPERATOR
    })
    rol!: UserRole;

    @ManyToOne(() => Person, { nullable: true, onDelete: 'SET NULL' })
    person?: Person;

    @DeleteDateColumn()
    deletedAt?: Date;
}
