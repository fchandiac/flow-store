import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config as loadEnv } from 'dotenv';
import path from 'path';
import { User } from '../../../data/entities/User';
import { CashSession } from '../../../data/entities/CashSession';
import { PointOfSale } from '../../../data/entities/PointOfSale';
import { Transaction } from '../../../data/entities/Transaction';
import { TransactionLine } from '../../../data/entities/TransactionLine';
import { Product } from '../../../data/entities/Product';
import { ProductVariant } from '../../../data/entities/ProductVariant';
import { Tax } from '../../../data/entities/Tax';
import { Unit } from '../../../data/entities/Unit';
import { Branch } from '../../../data/entities/Branch';
import { Company } from '../../../data/entities/Company';
import { Customer } from '../../../data/entities/Customer';
import { Supplier } from '../../../data/entities/Supplier';
import { ExpenseCategory } from '../../../data/entities/ExpenseCategory';
import { CostCenter } from '../../../data/entities/CostCenter';
import { Person } from '../../../data/entities/Person';
import { Category } from '../../../data/entities/Category';
import { PriceList } from '../../../data/entities/PriceList';
import { Shareholder } from '../../../data/entities/Shareholder';
import { AccountingAccount } from '../../../data/entities/AccountingAccount';
import { AccountingRule } from '../../../data/entities/AccountingRule';
import { Attribute } from '../../../data/entities/Attribute';

const envFiles = ['.env', '.env.local'];

for (const fileName of envFiles) {
  const resolved = path.resolve(process.cwd(), fileName);
  const result = loadEnv({ path: resolved, override: true });
  if (result.error && (!('code' in result.error) || result.error.code !== 'ENOENT')) {
    console.warn(`[TypeORM] No se pudo cargar ${fileName}:`, result.error.message);
  }
}

const dbType = (process.env.DB_TYPE ?? 'mysql') as 'mysql';
const dbPort = Number(process.env.DB_PORT ?? '3306');

export const appDataSource = new DataSource({
  type: dbType,
  host: process.env.DB_HOST ?? 'localhost',
  port: Number.isNaN(dbPort) ? 3306 : dbPort,
  username: process.env.DB_USERNAME ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_DATABASE ?? 'flow-store',
  url: process.env.DATABASE_URL,
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
  logging: process.env.DB_LOGGING === 'true',
  ssl: process.env.DB_SSL === 'true'
    ? {
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
      }
    : undefined,
  entities: [
    User,
    CashSession,
    PointOfSale,
    Transaction,
    TransactionLine,
    Product,
    ProductVariant,
    Tax,
    Unit,
    Branch,
    Company,
    Customer,
    Supplier,
    ExpenseCategory,
    CostCenter,
    Person,
    Category,
    PriceList,
    Attribute,
    Shareholder,
    AccountingAccount,
    AccountingRule,
  ],
  migrations: [],
  subscribers: [],
  extra: {
    decimalNumbers: true,
  },
});
