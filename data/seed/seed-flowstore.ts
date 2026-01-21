import { promises as fs } from 'fs';
import path from 'path';
import { getDb } from '../db';
import { User, UserRole } from '../entities/User';
import { Person, PersonType, DocumentType, BankName, AccountTypeName, PersonBankAccount } from '../entities/Person';
import { Customer } from '../entities/Customer';
import { Supplier, SupplierType } from '../entities/Supplier';
import { Company } from '../entities/Company';
import { Shareholder } from '../entities/Shareholder';
import { Branch } from '../entities/Branch';
import { Tax, TaxType } from '../entities/Tax';
import { Category } from '../entities/Category';
import { PriceList, PriceListType } from '../entities/PriceList';
import { PriceListItem } from '../entities/PriceListItem';
import { Storage, StorageCategory, StorageType } from '../entities/Storage';
import { PointOfSale } from '../entities/PointOfSale';
import { CashSession, CashSessionStatus } from '../entities/CashSession';
import { Permission, Ability, ALL_ABILITIES } from '../entities/Permission';
import { Attribute } from '../entities/Attribute';
import { Product, ProductType } from '../entities/Product';
import { ProductVariant } from '../entities/ProductVariant';
import { Unit } from '../entities/Unit';
import { UnitDimension } from '../entities/unit-dimension.enum';
import { AccountingAccount, AccountType } from '../entities/AccountingAccount';
import { ExpenseCategory } from '../entities/ExpenseCategory';
import { AccountingRule, RuleScope } from '../entities/AccountingRule';
import { AccountingPeriod, AccountingPeriodStatus } from '../entities/AccountingPeriod';
import { Transaction, TransactionStatus, PaymentMethod, TransactionType } from '../entities/Transaction';
import { TransactionLine } from '../entities/TransactionLine';
import { TreasuryAccount } from '../entities/TreasuryAccount';
import { CostCenter, CostCenterType } from '../entities/CostCenter';
import { OrganizationalUnit, OrganizationalUnitType } from '../entities/OrganizationalUnit';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { In, IsNull } from 'typeorm';
import { computePriceWithTaxes } from '../../lib/pricing/priceCalculations';

// Helper para hashear contraseñas (debe coincidir con authOptions.ts)
function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 12);
}

const DATA_DIR = path.join(__dirname, 'dataToSeed');

async function readSeedJson<T>(fileName: string): Promise<T | null> {
  try {
    const filePath = path.join(DATA_DIR, fileName);
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

function parseEnum<E extends Record<string, string>>(enumObject: E, raw: string, context: string): E[keyof E] {
  const enumRecord = enumObject as Record<string, string>;

  if (Object.prototype.hasOwnProperty.call(enumRecord, raw)) {
    return enumRecord[raw] as E[keyof E];
  }

  const normalizedRaw = raw.toLowerCase();
  for (const [key, value] of Object.entries(enumRecord)) {
    if (key.toLowerCase() === normalizedRaw || value.toLowerCase() === normalizedRaw) {
      return value as E[keyof E];
    }
  }

  throw new Error(`Valor inválido para ${context}: ${raw}`);
}

type RawBankAccount = Omit<PersonBankAccount, 'bankName' | 'accountType'> & {
  bankName: string;
  accountType: string;
};

function mapBankAccounts(accounts: RawBankAccount[] | undefined | null): PersonBankAccount[] | null {
  if (!accounts || accounts.length === 0) {
    return null;
  }

  return accounts.map((account, index) => ({
    ...account,
    accountKey: account.accountKey ?? `BANK-${String(index + 1).padStart(3, '0')}`,
    bankName: parseEnum(BankName, account.bankName, 'bankName'),
    accountType: parseEnum(AccountTypeName, account.accountType, 'accountType'),
  }));
}

function ensureArray<T>(data: T[] | null | undefined, fileName: string): T[] {
  if (!data || data.length === 0) {
    throw new Error(`El archivo ${fileName} debe contener al menos un registro.`);
  }
  return data;
}

function buildPersonDisplayName(person: Pick<Person, 'type' | 'firstName' | 'lastName' | 'businessName' | 'documentNumber'>): string {
  if (person.type === PersonType.COMPANY) {
    return person.businessName?.trim() || person.firstName || 'Empresa sin nombre';
  }

  const parts = [person.firstName, person.lastName]
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter((value): value is string => value.length > 0);

  if (parts.length > 0) {
    return parts.join(' ');
  }

  if (person.businessName && person.businessName.trim().length > 0) {
    return person.businessName.trim();
  }

  return person.documentNumber?.trim() || 'Persona sin identificación';
}

type CompanySeed = {
  name: string;
  defaultCurrency?: string;
  isActive?: boolean;
  settings?: Record<string, unknown> | null;
  bankAccounts?: RawBankAccount[];
};

type BranchSeed = {
  ref: string;
  name: string;
  address?: string;
  phone?: string;
  location?: { lat: number; lng: number } | null;
  isHeadquarters: boolean;
  legacyNames?: string[];
};

type ShareholderSeedRaw = {
  role?: string | null;
  ownershipPercentage?: number | null;
  notes?: string | null;
  isActive?: boolean;
  metadata?: Record<string, unknown> | null;
  person: {
    type?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    businessName?: string | null;
    documentType: string;
    documentNumber: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    bankAccounts?: RawBankAccount[] | null;
  };
};

type ShareholderSeed = {
  role?: string | null;
  ownershipPercentage?: number | null;
  notes?: string | null;
  isActive: boolean;
  metadata?: Record<string, unknown> | null;
  person: {
    type: PersonType;
    firstName?: string | null;
    lastName?: string | null;
    businessName?: string | null;
    documentType: DocumentType;
    documentNumber: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    bankAccounts?: PersonBankAccount[] | null;
  };
};

type CostCenterSeed = {
  ref: string;
  code: string;
  name: string;
  description?: string;
  type: keyof typeof CostCenterType;
  branchRef?: string;
};

type OrganizationalUnitSeed = {
  code: string;
  name: string;
  description?: string;
  type: keyof typeof OrganizationalUnitType;
  branchRef?: string;
  costCenterRef?: string;
  parentCode?: string;
};

type TaxSeed = {
  code: string;
  name: string;
  taxType: keyof typeof TaxType | string;
  rate: number;
  description: string;
  isDefault?: boolean;
  isActive?: boolean;
};

type AccountingAccountSeed = {
  ref: string;
  code: string;
  name: string;
  type: keyof typeof AccountType | string;
  parentRef: string | null;
};

type ExpenseCategorySeed = {
  ref: string;
  code: string;
  name: string;
  description?: string;
  defaultCostCenterRef?: string;
  metadata?: Record<string, unknown>;
};

type AccountingRuleSeed = {
  appliesTo: keyof typeof RuleScope | string;
  transactionType: keyof typeof TransactionType | string;
  paymentMethod?: keyof typeof PaymentMethod | string;
  taxCode?: string;
  expenseCategoryRef?: string;
  debitAccountRef: string;
  creditAccountRef: string;
  priority: number;
  isActive: boolean;
};

type AccountingPeriodSeedRaw = {
  companyName?: string | null;
  startDate: string;
  endDate: string;
  status?: keyof typeof AccountingPeriodStatus | string;
  closedAt?: string | null;
  closedByUserName?: string | null;
};

type AccountingPeriodSeed = {
  companyName: string;
  startDate: string;
  endDate: string;
  status: AccountingPeriodStatus;
  closedAt: Date | null;
  closedByUserName?: string | null;
};

type TreasuryAccountSeed = {
  id: string;
  companyId: string;
  branchId: string | null;
  type: string;
  name: string;
  bankName: string | null;
  accountNumber: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type CategorySeed = {
  name: string;
  description?: string;
  sortOrder?: number;
};

type AttributeSeed = {
  name: string;
  description?: string;
  options?: string[];
  displayOrder?: number;
};

type PriceListSeed = {
  key: string;
  name: string;
  type: keyof typeof PriceListType | string;
  priority?: number;
  isDefault?: boolean;
  description?: string;
  currency?: string;
};

type PriceListKey = PriceListSeed['key'];

type StorageSeed = {
  name: string;
  code?: string;
  branchRef?: string;
  type?: keyof typeof StorageType | string;
  category?: keyof typeof StorageCategory | string;
  isDefault?: boolean;
  isActive?: boolean;
};

type PointOfSaleSeed = {
  name: string;
  branchRef: string;
  defaultPriceListKey: PriceListSeed['key'];
  deviceId?: string;
};

type UnitSeed = {
  name: string;
  symbol: string;
  dimension: keyof typeof UnitDimension | string;
  conversionFactor: number;
  isBase: boolean;
  baseSymbol: string;
  allowDecimals?: boolean;
};

type CustomerSeed = {
  name: string;
  dni: string;
  phone?: string;
  mail?: string;
  address?: string;
  creditLimit?: number;
  paymentDayOfMonth?: 5 | 10 | 15 | 20 | 25 | 30;
  notes?: string;
};

type SupplierSeed = {
  businessName: string;
  alias?: string;
  contactFirstName: string;
  contactLastName?: string;
  documentNumber: string;
  documentType?: keyof typeof DocumentType | string;
  personType?: keyof typeof PersonType | string;
  email?: string;
  phone?: string;
  address?: string;
  supplierType: keyof typeof SupplierType | string;
  defaultPaymentTermDays?: number;
  notes?: string;
  bankAccounts?: RawBankAccount[];
};

type SupplierSeedNormalized = Omit<SupplierSeed, 'supplierType' | 'bankAccounts' | 'personType' | 'documentType'> & {
  supplierType: SupplierType;
  bankAccounts?: PersonBankAccount[] | null;
  personType: PersonType;
  documentType: DocumentType;
};

type UserSeedPerson = {
  firstName?: string;
  lastName?: string;
  documentNumber?: string;
  email?: string;
  phone?: string;
  address?: string;
};

type UserSeed = {
  userName: string;
  pass: string;
  mail?: string;
  rol?: keyof typeof UserRole | string;
  person?: UserSeedPerson;
};

type ProductVariantSeed = {
  sku: string;
  baseCost?: number;
  attributeValues?: Record<string, string>;
  priceEntries: Array<{
    listKey: PriceListSeed['key'];
    grossPrice?: number;
    netPrice?: number;
    taxCodes?: string[];
  }>;
  trackInventory?: boolean;
  allowNegativeStock?: boolean;
  weight?: number;
  weightUnit?: 'g' | 'kg';
};

type ProductSeed = {
  name: string;
  description?: string;
  brand?: string;
  categoryName: string;
  variants: ProductVariantSeed[];
};

type CashSessionSeedRaw = {
  ref: string;
  pointOfSaleName: string;
  openedByUserName: string;
  openedAt: string;
  openingAmount: number;
  status?: keyof typeof CashSessionStatus | string;
  notes?: string | null;
  createdAt?: string | null;
};

type CashSessionSeed = {
  ref: string;
  pointOfSaleName: string;
  openedByUserName: string;
  openedAt: Date;
  openingAmount: number;
  status: CashSessionStatus;
  notes?: string | null;
  createdAt: Date | null;
};

type TransactionSeedKind = 'CASH_SESSION_OPENING' | 'CAPITAL_CONTRIBUTION' | 'BANK_TO_CASH_TRANSFER';

type TransactionSeedRaw = {
  ref: string;
  kind: TransactionSeedKind;
  documentNumber: string;
  transactionType?: keyof typeof TransactionType | string;
  status?: keyof typeof TransactionStatus | string;
  branchRef?: string | null;
  pointOfSaleName?: string | null;
  cashSessionRef?: string | null;
  userName: string;
  shareholderDocumentNumber?: string | null;
  paymentMethod?: keyof typeof PaymentMethod | string | null;
  bankAccountKey?: string | null;
  bankAccountNumber?: string | null;
  bankName?: string | null;
  bankAccountType?: string | null;
  bankAccountLabel?: string | null;
  subtotal: number;
  taxAmount?: number | null;
  discountAmount?: number | null;
  total: number;
  amountPaid?: number | null;
  changeAmount?: number | null;
  notes?: string | null;
  occurredOn?: string | null;
  createdAt?: string | null;
  relatedDocumentNumber?: string | null;
  transferDestinationLabel?: string | null;
  originAccountCode?: string | null;
  destinationAccountCode?: string | null;
  balanceBefore?: number | null;
  balanceAfter?: number | null;
  openingAmount?: number | null;
};

type TransactionSeed = {
  ref: string;
  kind: TransactionSeedKind;
  documentNumber: string;
  transactionType: TransactionType;
  status: TransactionStatus;
  branchRef?: string | null;
  pointOfSaleName?: string | null;
  cashSessionRef?: string | null;
  userName: string;
  shareholderDocumentNumber?: string | null;
  paymentMethod?: PaymentMethod | null;
  bankAccountKey?: string | null;
  bankAccountNumber?: string | null;
  bankName?: string | null;
  bankAccountType?: string | null;
  bankAccountLabel?: string | null;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  amountPaid?: number | null;
  changeAmount?: number | null;
  notes?: string | null;
  occurredOn?: Date | null;
  createdAt?: Date | null;
  relatedDocumentNumber?: string | null;
  transferDestinationLabel?: string | null;
  originAccountCode?: string | null;
  destinationAccountCode?: string | null;
  balanceBefore?: number | null;
  balanceAfter?: number | null;
  openingAmount?: number | null;
};

/**
 * Seed para FlowStore - Joyería
 * Crea los datos básicos necesarios para una joyería:
 * - Empresa y sucursal principal
 * - Impuestos (IVA 19% y Exento)
 * - Categorías de joyería
 * - Atributos para variantes (Material, Talla, Piedra, Quilates)
 * - Lista de precios por defecto
 * - Bodega principal
 * - Punto de venta
 * - Usuario administrador
 * - Productos de ejemplo
 * 
 * Uso: npm run seed:flowstore
 */
async function seedFlowStore() {
  const db = await getDb();

  console.log('\n💎 FlowStore Joyería - Seed Inicial');
  console.log('═══════════════════════════════════════════════════════════');

  // Limpiar permisos con ability vacío o nulo (datos corruptos)
  console.log('\n🧹 Limpiando datos corruptos...');
  try {
    await db.query("DELETE FROM permissions WHERE ability IS NULL OR ability = ''");
    console.log('   ✓ Datos corruptos limpiados');
  } catch (cleanError) {
    console.log('   ⚠ No se pudieron limpiar datos (tabla puede no existir aún)');
  }

  console.log('\n🔄 Verificando conexión a base de datos...');
  try {
    await db.query('SELECT 1');
    console.log('   ✓ Conexión verificada correctamente');
  } catch (syncError) {
    console.error('   ✗ Error verificando conexión:', syncError);
    process.exit(1);
  }

  console.log('\n🧨 Reiniciando base de datos...');
  const resetRunner = db.createQueryRunner();
  let foreignKeysDisabled = false;
  try {
    await resetRunner.connect();
    await resetRunner.query('SET FOREIGN_KEY_CHECKS = 0');
    foreignKeysDisabled = true;

    const tables: Array<{ tableName: string | null }> = await resetRunner.query(
      "SELECT table_name AS tableName FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'",
    );
    const tablesToSkip = new Set(['migrations', 'typeorm_metadata']);

    for (const { tableName } of tables) {
      if (!tableName || tablesToSkip.has(tableName)) {
        continue;
      }
      await resetRunner.query(`TRUNCATE TABLE \`${tableName}\``);
    }

    await resetRunner.query('SET FOREIGN_KEY_CHECKS = 1');
    foreignKeysDisabled = false;
    console.log('   ✓ Base de datos reiniciada');
  } catch (resetError) {
    console.log('   ⚠ No se pudo reiniciar la base de datos:', resetError instanceof Error ? resetError.message : resetError);
  } finally {
    if (foreignKeysDisabled) {
      try {
        await resetRunner.query('SET FOREIGN_KEY_CHECKS = 1');
      } catch (fkError) {
        console.log('   ⚠ No se pudieron restaurar llaves foráneas automáticamente:', fkError instanceof Error ? fkError.message : fkError);
      }
    }
    await resetRunner.release();
  }

  const transactionRepo = db.getRepository(Transaction);
  const transactionLineRepo = db.getRepository(TransactionLine);
  const shareholderSummaries: string[] = [];
  const customerSummaries: string[] = [];
  const supplierSummaries: string[] = [];
  const clpFormatter = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  console.log('\n🧾 Eliminando aportes de capital legacy...');
  try {
    const legacyContributionDocs = ['CAP-2025-11-30', 'CAP-2025-12-15'];
    const legacyTransactions = await transactionRepo.find({
      where: {
        documentNumber: In(legacyContributionDocs),
        transactionType: TransactionType.PAYMENT_IN,
      },
    });

    if (legacyTransactions.length === 0) {
      console.log('   • Sin aportes de capital legacy que limpiar');
    } else {
      const legacyIds = legacyTransactions.map((tx) => tx.id);
      if (legacyIds.length > 0) {
        await transactionLineRepo.delete({ transactionId: In(legacyIds) });
        await transactionRepo.delete(legacyIds);
      }
      legacyTransactions.forEach((tx) => {
        console.log(`   ✓ Eliminado aporte legado: ${tx.documentNumber}`);
      });
    }
  } catch (cleanupError) {
    console.log('   ⚠ No se pudieron limpiar aportes legacy:', cleanupError instanceof Error ? cleanupError.message : cleanupError);
  }

  try {
    // ============================================
    // 1. EMPRESA - JOYERÍA
    // ============================================
    console.log('\n🏢 Creando empresa...');
    
    const companySeed = ensureArray(await readSeedJson<CompanySeed[]>('companies.json'), 'companies.json')[0];
    const branchSeeds = ensureArray(await readSeedJson<BranchSeed[]>('branches.json'), 'branches.json');
    const costCenterSeedsRaw = ensureArray(await readSeedJson<CostCenterSeed[]>('costCenters.json'), 'costCenters.json');
    const organizationalUnitSeedsRaw = ensureArray(await readSeedJson<OrganizationalUnitSeed[]>('organizationalUnits.json'), 'organizationalUnits.json');
    const taxSeedsRaw = ensureArray(await readSeedJson<TaxSeed[]>('taxes.json'), 'taxes.json');
    const accountingAccountSeedsRaw = ensureArray(await readSeedJson<AccountingAccountSeed[]>('accountingAccounts.json'), 'accountingAccounts.json');
    const expenseCategorySeeds = ensureArray(await readSeedJson<ExpenseCategorySeed[]>('expenseCategories.json'), 'expenseCategories.json');
    const accountingRuleSeedsRaw = ensureArray(await readSeedJson<AccountingRuleSeed[]>('accountingRules.json'), 'accountingRules.json');
    const categorySeeds = ensureArray(await readSeedJson<CategorySeed[]>('categories.json'), 'categories.json');
    const attributeSeeds = ensureArray(await readSeedJson<AttributeSeed[]>('attributes.json'), 'attributes.json');
    const priceListSeedsRaw = ensureArray(await readSeedJson<PriceListSeed[]>('priceLists.json'), 'priceLists.json');
    const storageSeedsRaw = ensureArray(await readSeedJson<StorageSeed[]>('storages.json'), 'storages.json');
    const pointOfSaleSeeds = ensureArray(await readSeedJson<PointOfSaleSeed[]>('pointsOfSale.json'), 'pointsOfSale.json');
    const unitSeedsRaw = ensureArray(await readSeedJson<UnitSeed[]>('units.json'), 'units.json');
    const customerSeeds = ensureArray(await readSeedJson<CustomerSeed[]>('customers.json'), 'customers.json');
    const supplierSeedsRaw = ensureArray(await readSeedJson<SupplierSeed[]>('suppliers.json'), 'suppliers.json');
    const userSeeds = ensureArray(await readSeedJson<UserSeed[]>('users.json'), 'users.json');
    const productSeeds = ensureArray(await readSeedJson<ProductSeed[]>('products.json'), 'products.json');
    const accountingPeriodSeedsRaw = ensureArray(
      await readSeedJson<AccountingPeriodSeedRaw[]>('accountingPeriods.json'),
      'accountingPeriods.json',
    );
    const shareholderSeedsRaw = ensureArray(await readSeedJson<ShareholderSeedRaw[]>('shareholders.json'), 'shareholders.json');
    const cashSessionSeedsRaw = ensureArray(await readSeedJson<CashSessionSeedRaw[]>('cashSessions.json'), 'cashSessions.json');
    const transactionSeedsRaw = ensureArray(await readSeedJson<TransactionSeedRaw[]>('transactions.json'), 'transactions.json');

    const costCenterSeeds = costCenterSeedsRaw.map((entry) => ({
      ...entry,
      type: parseEnum(CostCenterType, entry.type, `centro de costo ${entry.code}`),
    }));

    const organizationalUnitSeeds = organizationalUnitSeedsRaw.map((entry) => ({
      ...entry,
      type: parseEnum(OrganizationalUnitType, entry.type, `unidad organizativa ${entry.code}`),
    }));

    const taxSeeds = taxSeedsRaw.map((entry) => ({
      ...entry,
      taxType: parseEnum(TaxType, entry.taxType, `impuesto ${entry.code}`),
      isActive: entry.isActive ?? true,
    }));

    const accountingAccountSeeds = accountingAccountSeedsRaw.map((entry) => ({
      ...entry,
      type: parseEnum(AccountType, entry.type, `cuenta contable ${entry.code}`),
    }));

    const accountingRuleSeeds = accountingRuleSeedsRaw.map((entry) => ({
      ...entry,
      appliesTo: parseEnum(RuleScope, entry.appliesTo, 'regla contable (appliesTo)'),
      transactionType: parseEnum(TransactionType, entry.transactionType, 'regla contable (transactionType)'),
      paymentMethod: entry.paymentMethod ? parseEnum(PaymentMethod, entry.paymentMethod, 'regla contable (paymentMethod)') : undefined,
      isActive: entry.isActive ?? true,
    }));

    const priceListSeeds = priceListSeedsRaw.map((entry) => ({
      ...entry,
      type: parseEnum(PriceListType, entry.type, `lista de precios ${entry.key}`),
      priority: entry.priority ?? 0,
      isDefault: entry.isDefault ?? false,
      currency: entry.currency ?? 'CLP',
    }));

    const storageSeeds = storageSeedsRaw.map((entry) => ({
      ...entry,
      type: parseEnum(StorageType, entry.type ?? StorageType.WAREHOUSE, `bodega ${entry.name} (type)`),
      category: parseEnum(StorageCategory, entry.category ?? StorageCategory.IN_BRANCH, `bodega ${entry.name} (category)`),
      isDefault: entry.isDefault ?? false,
      isActive: entry.isActive ?? true,
    }));

    const unitSeeds = unitSeedsRaw.map((entry) => ({
      ...entry,
      dimension: parseEnum(UnitDimension, entry.dimension, `unidad ${entry.symbol} (dimension)`),
      allowDecimals: entry.allowDecimals ?? true,
    }));

    const supplierSeeds: SupplierSeedNormalized[] = supplierSeedsRaw.map((entry, index) => {
      const contextBase = entry.businessName ? `suppliers.json → ${entry.businessName}` : `suppliers.json → registro ${index + 1}`;
      const personType = parseEnum(
        PersonType,
        entry.personType ?? PersonType.COMPANY,
        `${contextBase} (personType)`,
      );

      const defaultDocumentType = personType === PersonType.NATURAL ? DocumentType.RUN : DocumentType.RUT;
      const documentType = parseEnum(
        DocumentType,
        entry.documentType ?? defaultDocumentType,
        `${contextBase} (documentType)`,
      );

      return {
        ...entry,
        personType,
        documentType,
        supplierType: parseEnum(SupplierType, entry.supplierType, `${contextBase} (type)`),
        bankAccounts: mapBankAccounts(entry.bankAccounts ?? []) ?? null,
      };
    });

    const shareholderSeeds = shareholderSeedsRaw.map((entry, index) => {
      if (!entry.person) {
        throw new Error(`shareholders.json → registro ${index + 1}: falta el bloque "person".`);
      }

      const documentNumber = entry.person.documentNumber?.trim();
      if (!documentNumber) {
        throw new Error(`shareholders.json → registro ${index + 1}: documentNumber es obligatorio.`);
      }

      const personType = parseEnum(PersonType, entry.person.type ?? PersonType.NATURAL, `shareholders.json → ${documentNumber} (person.type)`);
      const documentType = parseEnum(DocumentType, entry.person.documentType, `shareholders.json → ${documentNumber} (person.documentType)`);
      const bankAccounts = entry.person.bankAccounts ? mapBankAccounts(entry.person.bankAccounts) : null;

      let ownership: number | null = null;
      if (entry.ownershipPercentage !== null && entry.ownershipPercentage !== undefined) {
        const numericOwnership = Number(entry.ownershipPercentage);
        if (!Number.isFinite(numericOwnership)) {
          throw new Error(`shareholders.json → ${documentNumber}: ownershipPercentage debe ser numérico.`);
        }
        if (numericOwnership < 0 || numericOwnership > 100) {
          throw new Error(`shareholders.json → ${documentNumber}: ownershipPercentage debe estar entre 0 y 100.`);
        }
        ownership = Number(numericOwnership.toFixed(2));
      }

      return {
        role: entry.role ?? null,
        ownershipPercentage: ownership,
        notes: entry.notes ?? null,
        isActive: entry.isActive ?? true,
        metadata: entry.metadata ?? null,
        person: {
          type: personType,
          firstName: entry.person.firstName ?? null,
          lastName: entry.person.lastName ?? null,
          businessName: entry.person.businessName ?? null,
          documentType,
          documentNumber,
          email: entry.person.email ?? null,
          phone: entry.person.phone ?? null,
          address: entry.person.address ?? null,
          bankAccounts: bankAccounts ?? undefined,
        },
      } satisfies ShareholderSeed;
    });

    const cashSessionSeeds = cashSessionSeedsRaw.map((entry, index) => {
      const context = `cashSessions.json → registro ${index + 1}`;

      const ref = entry.ref?.trim();
      if (!ref) {
        throw new Error(`${context}: "ref" es obligatorio.`);
      }

      const pointOfSaleName = entry.pointOfSaleName?.trim();
      if (!pointOfSaleName) {
        throw new Error(`${context}: "pointOfSaleName" es obligatorio.`);
      }

      const openedByUserName = entry.openedByUserName?.trim();
      if (!openedByUserName) {
        throw new Error(`${context}: "openedByUserName" es obligatorio.`);
      }

      const openedAt = new Date(entry.openedAt);
      if (Number.isNaN(openedAt.getTime())) {
        throw new Error(`${context}: "openedAt" no es una fecha válida.`);
      }

      const createdAt = entry.createdAt ? new Date(entry.createdAt) : null;
      if (entry.createdAt && Number.isNaN(createdAt!.getTime())) {
        throw new Error(`${context}: "createdAt" no es una fecha válida.`);
      }

      const status = entry.status
        ? parseEnum(CashSessionStatus, entry.status, `${context} (status)`)
        : CashSessionStatus.OPEN;

      const openingAmount = Number(entry.openingAmount);
      if (!Number.isFinite(openingAmount) || openingAmount < 0) {
        throw new Error(`${context}: "openingAmount" debe ser un número positivo.`);
      }

      return {
        ref,
        pointOfSaleName,
        openedByUserName,
        openedAt,
        openingAmount,
        status,
        notes: entry.notes ?? null,
        createdAt,
      } satisfies CashSessionSeed;
    });

    const validTransactionKinds: TransactionSeedKind[] = ['CASH_SESSION_OPENING', 'CAPITAL_CONTRIBUTION', 'BANK_TO_CASH_TRANSFER'];

    const transactionSeeds = transactionSeedsRaw.map((entry, index) => {
      const context = `transactions.json → registro ${index + 1}`;

      const ref = entry.ref?.trim();
      if (!ref) {
        throw new Error(`${context}: "ref" es obligatorio.`);
      }

      if (!validTransactionKinds.includes(entry.kind)) {
        throw new Error(`${context}: "kind" debe ser uno de ${validTransactionKinds.join(', ')}`);
      }

      const transactionTypeRaw = entry.transactionType ?? ((): TransactionType => {
        switch (entry.kind) {
          case 'CASH_SESSION_OPENING':
            return TransactionType.CASH_SESSION_OPENING;
          case 'CAPITAL_CONTRIBUTION':
            return TransactionType.PAYMENT_IN;
          case 'BANK_TO_CASH_TRANSFER':
            return TransactionType.PAYMENT_OUT;
          default:
            return TransactionType.PAYMENT_IN;
        }
      })();

      const transactionType = parseEnum(TransactionType, transactionTypeRaw, `${context} (transactionType)`);
      const status = entry.status
        ? parseEnum(TransactionStatus, entry.status, `${context} (status)`)
        : TransactionStatus.CONFIRMED;

      const paymentMethod = entry.paymentMethod
        ? parseEnum(PaymentMethod, entry.paymentMethod, `${context} (paymentMethod)`)
        : null;

      const subtotal = Number(entry.subtotal);
      const taxAmount = Number(entry.taxAmount ?? 0);
      const discountAmount = Number(entry.discountAmount ?? 0);
      const total = Number(entry.total);

      for (const [label, value] of [
        ['subtotal', subtotal],
        ['taxAmount', taxAmount],
        ['discountAmount', discountAmount],
        ['total', total],
      ] as const) {
        if (!Number.isFinite(value)) {
          throw new Error(`${context}: "${label}" debe ser un número.`);
        }
      }

      const amountPaid = entry.amountPaid !== undefined ? Number(entry.amountPaid) : null;
      const changeAmount = entry.changeAmount !== undefined ? Number(entry.changeAmount) : null;

      if (amountPaid !== null && !Number.isFinite(amountPaid)) {
        throw new Error(`${context}: "amountPaid" debe ser numérico.`);
      }

      if (changeAmount !== null && !Number.isFinite(changeAmount)) {
        throw new Error(`${context}: "changeAmount" debe ser numérico.`);
      }

      const occurredOn = entry.occurredOn ? new Date(entry.occurredOn) : null;
      if (entry.occurredOn && Number.isNaN(occurredOn!.getTime())) {
        throw new Error(`${context}: "occurredOn" no es una fecha válida.`);
      }

      const createdAt = entry.createdAt ? new Date(entry.createdAt) : null;
      if (entry.createdAt && Number.isNaN(createdAt!.getTime())) {
        throw new Error(`${context}: "createdAt" no es una fecha válida.`);
      }

      const documentNumber = entry.documentNumber?.trim();
      if (!documentNumber) {
        throw new Error(`${context}: "documentNumber" es obligatorio.`);
      }

      return {
        ref,
        kind: entry.kind,
        documentNumber,
        transactionType,
        status,
        branchRef: entry.branchRef?.trim() ?? null,
        pointOfSaleName: entry.pointOfSaleName?.trim() ?? null,
        cashSessionRef: entry.cashSessionRef?.trim() ?? null,
        userName: entry.userName.trim(),
        shareholderDocumentNumber: entry.shareholderDocumentNumber?.trim() ?? null,
        paymentMethod,
        bankAccountKey: entry.bankAccountKey?.trim() ?? null,
        bankAccountNumber: entry.bankAccountNumber?.trim() ?? null,
        bankName: entry.bankName?.trim() ?? null,
        bankAccountType: entry.bankAccountType?.trim() ?? null,
        bankAccountLabel: entry.bankAccountLabel?.trim() ?? null,
        subtotal,
        taxAmount,
        discountAmount,
        total,
        amountPaid,
        changeAmount,
        notes: entry.notes ?? null,
        occurredOn,
        createdAt,
        relatedDocumentNumber: entry.relatedDocumentNumber?.trim() ?? null,
        transferDestinationLabel: entry.transferDestinationLabel?.trim() ?? null,
        originAccountCode: entry.originAccountCode?.trim() ?? null,
        destinationAccountCode: entry.destinationAccountCode?.trim() ?? null,
        balanceBefore: entry.balanceBefore ?? null,
        balanceAfter: entry.balanceAfter ?? null,
        openingAmount: entry.openingAmount ?? null,
      } satisfies TransactionSeed;
    });

    const accountingPeriodSeeds = accountingPeriodSeedsRaw.map((entry, index) => {
      const context = `accountingPeriods.json → registro ${index + 1}`;
      const startDate = entry.startDate?.trim();
      const endDate = entry.endDate?.trim();

      if (!startDate) {
        throw new Error(`${context}: startDate es obligatorio.`);
      }

      if (!endDate) {
        throw new Error(`${context}: endDate es obligatorio.`);
      }

      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!datePattern.test(startDate)) {
        throw new Error(`${context}: startDate debe tener formato YYYY-MM-DD.`);
      }

      if (!datePattern.test(endDate)) {
        throw new Error(`${context}: endDate debe tener formato YYYY-MM-DD.`);
      }

      const startDateValue = new Date(`${startDate}T00:00:00`);
      const endDateValue = new Date(`${endDate}T00:00:00`);

      if (Number.isNaN(startDateValue.getTime())) {
        throw new Error(`${context}: startDate no es una fecha válida.`);
      }

      if (Number.isNaN(endDateValue.getTime())) {
        throw new Error(`${context}: endDate no es una fecha válida.`);
      }

      if (startDateValue.getTime() > endDateValue.getTime()) {
        throw new Error(`${context}: startDate no puede ser posterior a endDate.`);
      }

      const status = entry.status
        ? parseEnum(AccountingPeriodStatus, entry.status, `${context} (status)`)
        : AccountingPeriodStatus.OPEN;

      let closedAt: Date | null = null;
      if (entry.closedAt) {
        const parsedClosedAt = new Date(entry.closedAt);
        if (Number.isNaN(parsedClosedAt.getTime())) {
          throw new Error(`${context}: closedAt no es una fecha válida.`);
        }
        closedAt = parsedClosedAt;
      }

      return {
        companyName: entry.companyName?.trim() || companySeed.name,
        startDate,
        endDate,
        status,
        closedAt,
        closedByUserName: entry.closedByUserName?.trim() || null,
      } as AccountingPeriodSeed;
    });

    const companyBankAccounts = mapBankAccounts(companySeed.bankAccounts ?? []) ?? undefined;
    const fallbackBankAccounts: PersonBankAccount[] = [
      {
        accountKey: 'JOYARTE-SANTANDER-CC-001',
        bankName: BankName.BANCO_SANTANDER,
        accountType: AccountTypeName.CUENTA_CORRIENTE,
        accountNumber: '12345678-9',
        accountHolderName: companySeed.name,
        isPrimary: true,
        notes: 'Cuenta principal de operaciones',
      },
    ];

    const companyRepo = db.getRepository(Company);
    let company = await companyRepo.findOne({ where: { name: companySeed.name } });

    if (!company) {
      const companies = await companyRepo.find({ take: 1 });
      if (companies.length > 0) {
        company = companies[0];
      } else {
        company = new Company();
        company.id = uuidv4();
      }
    }

    company.name = companySeed.name;
    company.defaultCurrency = companySeed.defaultCurrency ?? 'CLP';
    company.isActive = companySeed.isActive ?? true;
    company.settings = (companySeed.settings as Record<string, unknown> | undefined) ?? {
      allowNegativeStock: false,
      requireCustomerForSale: false,
      defaultPaymentMethod: 'CASH',
    };
    company.bankAccounts = companyBankAccounts ?? fallbackBankAccounts;
    company = await companyRepo.save(company);
    console.log(`   ✓ Empresa asegurada: ${company.name}`);

    if (Array.isArray(company.bankAccounts) && company.bankAccounts.length > 0) {
      let bankAccountsMutated = false;
      const normalizedAccounts = company.bankAccounts.map((account, index) => {
        if (account.accountKey) {
          return account;
        }
        bankAccountsMutated = true;
        return {
          ...account,
          accountKey: `JOYARTE-BANK-${String(index + 1).padStart(3, '0')}`,
        } satisfies PersonBankAccount;
      });

      if (bankAccountsMutated) {
        company.bankAccounts = normalizedAccounts;
        await db.getRepository(Company).save(company);
        console.log('   • Cuentas bancarias normalizadas con identificadores internos.');
      }
    }

    // ============================================
    // 1.1 SOCIOS DE LA EMPRESA
    // ============================================
    console.log('\n🤝 Registrando socios...');

    const shareholderRepo = db.getRepository(Shareholder);
    const shareholderPersonRepo = db.getRepository(Person);
    const shareholdersByDocumentNumber: Record<string, Shareholder> = {};
    const shareholderPersonsById: Record<string, Person> = {};

    for (const seed of shareholderSeeds) {
      const documentNumber = seed.person.documentNumber.trim();

      let person = await shareholderPersonRepo.findOne({
        where: { documentNumber },
        withDeleted: true,
      });

      const isNewPerson = !person;

      if (!person) {
        person = new Person();
        person.id = uuidv4();
        person.documentNumber = documentNumber;
      }

      person.type = seed.person.type;

      const rawFirstName = seed.person.firstName?.trim();
      const rawLastName = seed.person.lastName?.trim();
      const rawBusinessName = seed.person.businessName?.trim();

      if (seed.person.type === PersonType.NATURAL) {
        person.firstName = rawFirstName || rawBusinessName || 'Socio';
        person.lastName = rawLastName ?? undefined;
        person.businessName = undefined;
      } else {
        const resolvedBusinessName = rawBusinessName || rawFirstName || `Socio ${documentNumber}`;
        person.businessName = resolvedBusinessName;
        person.firstName = rawFirstName || resolvedBusinessName;
        person.lastName = rawLastName ?? undefined;
      }

      person.documentType = seed.person.documentType;
      person.email = seed.person.email?.trim() || undefined;
      person.phone = seed.person.phone?.trim() || undefined;
      person.address = seed.person.address?.trim() || undefined;
      person.bankAccounts = seed.person.bankAccounts ?? null;
      person.deletedAt = undefined;

      await shareholderPersonRepo.save(person);

      let shareholder = await shareholderRepo.findOne({
        where: { companyId: company.id, personId: person.id },
        withDeleted: true,
      });

      const isNewShareholder = !shareholder;

      if (!shareholder) {
        shareholder = new Shareholder();
        shareholder.id = uuidv4();
        shareholder.companyId = company.id;
        shareholder.personId = person.id;
      } else {
        shareholder.companyId = company.id;
        shareholder.personId = person.id;
      }

      shareholder.role = seed.role ?? null;
      shareholder.notes = seed.notes ?? null;
      shareholder.metadata = seed.metadata ?? null;
      shareholder.ownershipPercentage = seed.ownershipPercentage ?? null;
      shareholder.isActive = seed.isActive;
      shareholder.deletedAt = undefined;

      await shareholderRepo.save(shareholder);

      shareholdersByDocumentNumber[documentNumber] = shareholder;
      shareholdersByDocumentNumber[documentNumber.toLowerCase()] = shareholder;
      shareholderPersonsById[person.id] = person;

      const displayName = buildPersonDisplayName(person);
      shareholderSummaries.push(displayName);
      const prefix = isNewShareholder ? '   ✓' : '   •';
      const action = isNewShareholder ? 'Socio registrado' : 'Socio actualizado';
      const ownershipLabel = typeof seed.ownershipPercentage === 'number'
        ? ` (${seed.ownershipPercentage}% participación)`
        : '';
      if (isNewPerson) {
        console.log(`   ✓ Persona creada: ${displayName}`);
      }
      console.log(`${prefix} ${action}: ${displayName}${ownershipLabel}`);
    }

    // ============================================
    // 2. SUCURSALES
    // ============================================
    console.log('\n🏬 Configurando sucursales...');

    const branchRepo = db.getRepository(Branch);

    const branchesByRef: Record<string, Branch> = {};

    for (const seed of branchSeeds) {
      let branchEntity = await branchRepo.findOne({
        where: { companyId: company.id, name: seed.name },
        withDeleted: true,
      });

      if (!branchEntity && seed.legacyNames?.length) {
        for (const legacyName of seed.legacyNames) {
          const legacyBranch = await branchRepo.findOne({
            where: { companyId: company.id, name: legacyName },
            withDeleted: true,
          });
          if (legacyBranch) {
            branchEntity = legacyBranch;
            break;
          }
        }
      }

      const isNewBranch = !branchEntity;

      if (!branchEntity) {
        branchEntity = new Branch();
        branchEntity.id = uuidv4();
        branchEntity.companyId = company.id;
      } else {
        branchEntity.companyId = company.id ?? branchEntity.companyId ?? company.id;
      }

      branchEntity.name = seed.name;
      branchEntity.address = seed.address ?? undefined;
      branchEntity.phone = seed.phone ?? undefined;
      branchEntity.location = seed.location ?? undefined;
      branchEntity.isHeadquarters = seed.isHeadquarters;
      branchEntity.isActive = true;
      branchEntity.deletedAt = undefined;

      branchEntity = await branchRepo.save(branchEntity);
      branchesByRef[seed.ref] = branchEntity;

      const prefix = isNewBranch ? '   ✓' : '   •';
      const action = isNewBranch ? 'Sucursal creada' : 'Sucursal actualizada';
      console.log(`${prefix} ${action}: ${branchEntity.name}`);
    }

    const primaryBranch = branchesByRef['PARRAL'] ?? Object.values(branchesByRef).find((candidate) => candidate.isHeadquarters);
    if (!primaryBranch) {
      throw new Error('No se pudo determinar la sucursal principal (PARRAL).');
    }

    // ============================================
    // 2.1 CENTROS DE COSTO BASE
    // ============================================
    console.log('\n🏷️  Configurando centros de costo...');

    const costCenterRepo = db.getRepository(CostCenter);

    const costCenterRefMap: Record<string, CostCenter> = {};

    for (const entry of costCenterSeeds) {
      let existing = await costCenterRepo.findOne({ where: { code: entry.code } });

      const targetBranch = entry.branchRef ? branchesByRef[entry.branchRef] : undefined;

      if (!existing) {
        existing = new CostCenter();
        existing.companyId = company.id;
        existing.code = entry.code;
      }

      if (targetBranch) {
        existing.branchId = targetBranch.id;
      } else if (!existing.branchId) {
        existing.branchId = primaryBranch.id;
      }

      existing.name = entry.name;
      existing.description = entry.description ?? undefined;
      existing.type = entry.type;
      existing.isActive = true;

      existing = await costCenterRepo.save(existing);
      costCenterRefMap[entry.ref] = existing;
      console.log(`   • Centro de costo ${existing.code} (${existing.name}) listo`);
    }

    // ============================================
    // 2.2 UNIDADES ORGANIZATIVAS BASE
    // ============================================
    console.log('\n🗂️  Configurando unidades organizativas...');

    const organizationalUnitRepo = db.getRepository(OrganizationalUnit);

    const organizationalUnitMap = new Map<string, OrganizationalUnit>();

    for (const entry of organizationalUnitSeeds) {
      let unit = await organizationalUnitRepo.findOne({
        where: { companyId: company.id, code: entry.code },
        withDeleted: true,
      });

      const parentUnitId = entry.parentCode ? organizationalUnitMap.get(entry.parentCode)?.id ?? null : null;
      const costCenterId = entry.costCenterRef ? costCenterRefMap[entry.costCenterRef]?.id ?? null : null;
      const targetBranch = entry.branchRef ? branchesByRef[entry.branchRef] : undefined;

      if (!unit) {
        unit = organizationalUnitRepo.create({
          companyId: company.id,
          code: entry.code,
          name: entry.name,
          description: entry.description,
          unitType: entry.type,
          parentId: parentUnitId ?? undefined,
          branchId: targetBranch?.id,
          costCenterId: costCenterId ?? undefined,
          isActive: true,
        });
      } else {
        unit.name = entry.name;
        unit.description = entry.description;
        unit.unitType = entry.type;
        unit.parentId = parentUnitId ?? undefined;
        unit.branchId = targetBranch ? targetBranch.id : null;
        unit.costCenterId = costCenterId ?? undefined;
        unit.isActive = true;
        unit.deletedAt = undefined;
      }

      unit = await organizationalUnitRepo.save(unit);
      organizationalUnitMap.set(entry.code, unit);
      console.log(`   • Unidad organizativa ${unit.code} (${unit.name}) lista`);
    }

    // ============================================
    // 3. IMPUESTOS
    // ============================================
    console.log('\n💰 Creando impuestos...');
    
    // IVA 19%
    const taxRepo = db.getRepository(Tax);
    const taxesByCode: Record<string, Tax> = {};

    for (const definition of taxSeeds) {
      let taxEntity = await taxRepo.findOne({ where: { companyId: company.id, code: definition.code } });

      if (!taxEntity) {
        taxEntity = taxRepo.create({
          id: uuidv4(),
          companyId: company.id,
          code: definition.code,
          name: definition.name,
          taxType: definition.taxType,
          rate: definition.rate,
          description: definition.description,
          isDefault: Boolean(definition.isDefault),
          isActive: definition.isActive ?? true,
        });
        await taxRepo.save(taxEntity);
        console.log(`   ✓ Impuesto creado: ${taxEntity.name}`);
      } else {
        taxEntity.name = definition.name;
        taxEntity.taxType = definition.taxType;
        taxEntity.rate = definition.rate;
        taxEntity.description = definition.description;
        taxEntity.isDefault = Boolean(definition.isDefault);
        taxEntity.isActive = definition.isActive ?? true;
        await taxRepo.save(taxEntity);
        console.log(`   • Impuesto actualizado: ${taxEntity.name}`);
      }

      taxesByCode[taxEntity.code] = taxEntity;
    }

    // ============================================
    // 3.1 PLAN DE CUENTAS CHILENO (RESUMIDO)
    // ============================================
    console.log('\n📚 Configurando plan de cuentas contable...');

    const accountRepo = db.getRepository(AccountingAccount);
    const existingAccounts = await accountRepo.find({ where: { companyId: company.id } });
    const existingByCode = new Map(existingAccounts.map((account) => [account.code, account]));
    const accountRefMap: Record<string, AccountingAccount> = {};
    const codeByRef = new Map(accountingAccountSeeds.map((entry) => [entry.ref, entry.code]));

    for (const entry of accountingAccountSeeds) {
      const parentAccount = entry.parentRef
        ? accountRefMap[entry.parentRef] ?? existingByCode.get(codeByRef.get(entry.parentRef) ?? '') ?? null
        : null;

      let accountEntity = existingByCode.get(entry.code);

      if (!accountEntity) {
        accountEntity = accountRepo.create({
          companyId: company.id,
          code: entry.code,
          name: entry.name,
          type: entry.type,
          parentId: parentAccount?.id ?? null,
          isActive: true,
        });
      } else {
        accountEntity.name = entry.name;
        accountEntity.type = entry.type;
        accountEntity.parentId = parentAccount?.id ?? null;
        accountEntity.isActive = true;
      }

      accountEntity = await accountRepo.save(accountEntity);
      existingByCode.set(accountEntity.code, accountEntity);
      accountRefMap[entry.ref] = accountEntity;
      console.log(`   • Cuenta ${accountEntity.code} (${accountEntity.name}) lista`);
    }

    const allowedAccountCodes = new Set(accountingAccountSeeds.map((entry) => entry.code));
    const legacyAccounts = existingAccounts.filter((account) => !allowedAccountCodes.has(account.code));

    if (legacyAccounts.length > 0) {
      for (const legacy of legacyAccounts) {
        if (legacy.isActive) {
          legacy.isActive = false;
        }
      }

      await accountRepo.save(legacyAccounts);
      console.log(`   • ${legacyAccounts.length} cuentas legacy desactivadas para mantener el plan base`);
    }

    // ============================================
    // 3.2 CATEGORÍAS DE GASTO PARA IMPUTACIÓN
    // ============================================
    console.log('\n📑 Configurando categorías de gasto...');

    const expenseCategoryRepo = db.getRepository(ExpenseCategory);
    const expenseCategoryRefMap: Record<string, ExpenseCategory> = {};

    for (const entry of expenseCategorySeeds) {
      let category = await expenseCategoryRepo.findOne({
        where: { companyId: company.id, code: entry.code },
        withDeleted: true,
      });

      const defaultCostCenterId = entry.defaultCostCenterRef
        ? costCenterRefMap[entry.defaultCostCenterRef]?.id ?? null
        : null;

      if (!category) {
        category = expenseCategoryRepo.create({
          companyId: company.id,
          code: entry.code,
          name: entry.name,
          description: entry.description,
          requiresApproval: false,
          approvalThreshold: '0',
          isActive: true,
          metadata: entry.metadata ?? null,
          defaultCostCenterId,
        });
      } else {
        category.name = entry.name;
        category.description = entry.description;
        category.requiresApproval = false;
        category.approvalThreshold = '0';
        category.isActive = true;
        category.deletedAt = undefined;
        category.defaultCostCenterId = defaultCostCenterId;
        category.metadata = entry.metadata ?? null;
      }

      category = await expenseCategoryRepo.save(category);
      expenseCategoryRefMap[entry.ref] = category;
      console.log(`   • Categoría ${category.code} (${category.name}) lista`);
    }

    // ============================================
    // 3.3 REGLAS CONTABLES BASE
    // ============================================
    console.log('\n🧾 Configurando reglas contables...');

    const accountingRuleRepo = db.getRepository(AccountingRule);

    for (const ruleConfig of accountingRuleSeeds) {
      const debitAccount = accountRefMap[ruleConfig.debitAccountRef];
      const creditAccount = accountRefMap[ruleConfig.creditAccountRef];

      if (!debitAccount || !creditAccount) {
        console.warn(
          `   ⚠ No se pudo crear la regla (${ruleConfig.debitAccountRef} -> ${ruleConfig.creditAccountRef}) porque falta la cuenta contable`,
        );
        continue;
      }

      const taxId = ruleConfig.taxCode ? taxesByCode[ruleConfig.taxCode]?.id ?? null : null;
      if (ruleConfig.taxCode && !taxId) {
        console.warn(`   ⚠ Impuesto ${ruleConfig.taxCode} no encontrado, se omite regla.`);
        continue;
      }

      const expenseCategoryId = ruleConfig.expenseCategoryRef
        ? expenseCategoryRefMap[ruleConfig.expenseCategoryRef]?.id ?? null
        : null;
      if (ruleConfig.expenseCategoryRef && !expenseCategoryId) {
        console.warn(
          `   ⚠ Categoría de gasto ${ruleConfig.expenseCategoryRef} no encontrada, se omite regla.`,
        );
        continue;
      }

      const qb = accountingRuleRepo
        .createQueryBuilder('rule')
        .where('rule.companyId = :companyId', { companyId: company.id })
        .andWhere('rule.appliesTo = :appliesTo', { appliesTo: ruleConfig.appliesTo })
        .andWhere('rule.transactionType = :transactionType', { transactionType: ruleConfig.transactionType })
        .andWhere('rule.debitAccountId = :debitAccountId', { debitAccountId: debitAccount.id })
        .andWhere('rule.creditAccountId = :creditAccountId', { creditAccountId: creditAccount.id })
        .andWhere('rule.priority = :priority', { priority: ruleConfig.priority });

      if (ruleConfig.paymentMethod) {
        qb.andWhere('rule.paymentMethod = :paymentMethod', { paymentMethod: ruleConfig.paymentMethod });
      } else {
        qb.andWhere('rule.paymentMethod IS NULL');
      }

      if (taxId) {
        qb.andWhere('rule.taxId = :taxId', { taxId });
      } else {
        qb.andWhere('rule.taxId IS NULL');
      }

      if (expenseCategoryId) {
        qb.andWhere('rule.expenseCategoryId = :expenseCategoryId', { expenseCategoryId });
      } else {
        qb.andWhere('rule.expenseCategoryId IS NULL');
      }

      let ruleEntity = await qb.getOne();

      if (!ruleEntity) {
        ruleEntity = accountingRuleRepo.create({
          companyId: company.id,
          appliesTo: ruleConfig.appliesTo,
          transactionType: ruleConfig.transactionType,
          paymentMethod: ruleConfig.paymentMethod ?? null,
          taxId,
          expenseCategoryId,
          debitAccountId: debitAccount.id,
          creditAccountId: creditAccount.id,
          priority: ruleConfig.priority,
          isActive: ruleConfig.isActive,
        });
      } else {
        ruleEntity.paymentMethod = ruleConfig.paymentMethod ?? null;
        ruleEntity.taxId = taxId;
        ruleEntity.expenseCategoryId = expenseCategoryId;
        ruleEntity.debitAccountId = debitAccount.id;
        ruleEntity.creditAccountId = creditAccount.id;
        ruleEntity.priority = ruleConfig.priority;
        ruleEntity.isActive = ruleConfig.isActive;
      }

      await accountingRuleRepo.save(ruleEntity);
      console.log(
        `   • Regla ${ruleConfig.appliesTo} / ${ruleConfig.transactionType} (${ruleConfig.priority}) lista`,
      );
    }

    // ============================================
    // 4. CATEGORÍAS DE JOYERÍA
    // ============================================
    console.log('\n📁 Creando categorías de joyería...');
    
    const categoryRepo = db.getRepository(Category);
    const categoryMap: Record<string, Category> = {}; // keyed by category name

    for (const catData of categorySeeds) {
      let category = await categoryRepo.findOne({ where: { name: catData.name }, withDeleted: true });
      const isNewCategory = !category;

      if (!category) {
        category = new Category();
        category.id = uuidv4();
      }

      category.name = catData.name;
      category.description = catData.description;
      category.sortOrder = catData.sortOrder ?? 0;
      category.isActive = true;
      category.deletedAt = undefined;

      await categoryRepo.save(category);
      categoryMap[catData.name] = category;

      const prefix = isNewCategory ? '   ✓' : '   •';
      const action = isNewCategory ? 'Categoría creada' : 'Categoría actualizada';
      console.log(`${prefix} ${action}: ${category.name}`);
    }

    // ============================================
    // 5. ATRIBUTOS PARA VARIANTES DE JOYERÍA
    // ============================================
    console.log('\n💍 Creando atributos para variantes...');
    
    const attributeRepo = db.getRepository(Attribute);
    const attributeMap: Record<string, Attribute> = {};

    for (const attrData of attributeSeeds) {
      let attribute = await attributeRepo.findOne({
        where: { name: attrData.name },
        withDeleted: true,
      });
      const options = attrData.options ?? [];
      const displayOrder = attrData.displayOrder ?? 0;

      if (!attribute) {
        attribute = new Attribute();
        attribute.id = uuidv4();
        attribute.name = attrData.name;
        attribute.description = attrData.description;
        attribute.options = options;
        attribute.displayOrder = displayOrder;
        attribute.isActive = true;
        await attributeRepo.save(attribute);
        console.log(`   ✓ Atributo creado: ${attribute.name} (${options.length} opciones)`);
      } else {
        attribute.description = attrData.description;
        attribute.options = options;
        attribute.displayOrder = displayOrder;
        attribute.isActive = true;
        attribute.deletedAt = undefined;
        await attributeRepo.save(attribute);
        console.log(`   ⚠ Atributo ya existe: ${attribute.name}`);
      }
      attributeMap[attrData.name] = attribute;
    }

    // ============================================
    // 6. LISTAS DE PRECIOS
    // ============================================
    console.log('\n📋 Configurando listas de precios...');

    const priceListRepo = db.getRepository(PriceList);

    const priceListsByKey: Record<PriceListKey, PriceList> = {} as Record<PriceListKey, PriceList>;

    for (const config of priceListSeeds) {
      let list = await priceListRepo.findOne({ where: { name: config.name }, withDeleted: true });
      if (!list) {
        list = new PriceList();
        list.id = uuidv4();
        list.name = config.name;
        console.log(`   ✓ Lista de precios creada: ${config.name}`);
      } else {
        list.name = config.name;
        console.log(`   ⚠ Lista de precios existente actualizada: ${config.name}`);
      }

      list.priceListType = config.type;
      list.currency = config.currency ?? 'CLP';
      list.priority = config.priority;
      list.isDefault = config.isDefault;
      list.isActive = true;
      list.description = config.description;
      list.deletedAt = undefined;

      list = await priceListRepo.save(list);
      priceListsByKey[config.key] = list;
    }

    // ============================================
    // 7. BODEGA PRINCIPAL
    // ============================================
    console.log('\n📦 Configurando bodegas...');

    const storageRepo = db.getRepository(Storage);

    for (const storageSeed of storageSeeds) {
      const targetBranch = storageSeed.branchRef ? branchesByRef[storageSeed.branchRef] : null;
      if (storageSeed.branchRef && !targetBranch) {
        console.warn(`   ⚠ Sucursal ${storageSeed.branchRef} no encontrada para la bodega ${storageSeed.name}, se asigna a la sucursal principal.`);
      }

      let storage = await storageRepo.findOne({
        where: storageSeed.code ? { code: storageSeed.code } : { name: storageSeed.name },
        withDeleted: true,
      });

      const isNewStorage = !storage;
      if (!storage) {
        storage = new Storage();
        storage.id = uuidv4();
      }

      storage.branchId = targetBranch?.id ?? primaryBranch.id;
      storage.name = storageSeed.name;
      storage.code = storageSeed.code ?? storage.code;
      storage.type = storageSeed.type ?? StorageType.WAREHOUSE;
      storage.category = storageSeed.category ?? StorageCategory.IN_BRANCH;
      storage.isDefault = storageSeed.isDefault ?? false;
      storage.isActive = storageSeed.isActive ?? true;
      storage.deletedAt = undefined;

      await storageRepo.save(storage);
      const prefix = isNewStorage ? '   ✓' : '   •';
      const action = isNewStorage ? 'Bodega creada' : 'Bodega actualizada';
      console.log(`${prefix} ${action}: ${storage.name}`);
    }

    // ============================================
    // 8. PUNTO DE VENTA
    // ============================================
    console.log('\n🖥️  Configurando puntos de venta...');

    const pointOfSaleRepo = db.getRepository(PointOfSale);

    const pointsOfSale: PointOfSale[] = [];
    const pointOfSaleByName: Record<string, PointOfSale> = {};

    for (const seed of pointOfSaleSeeds) {
      const targetBranch = branchesByRef[seed.branchRef];
      if (!targetBranch) {
        throw new Error(`No se encontró la sucursal con referencia ${seed.branchRef} para el punto de venta ${seed.name}`);
      }

      const defaultPriceList = priceListsByKey[seed.defaultPriceListKey];
      if (!defaultPriceList) {
        throw new Error(`No se encontró la lista de precios "${seed.defaultPriceListKey}" para el punto de venta ${seed.name}`);
      }

      let existingPOS = await pointOfSaleRepo.findOne({ where: { name: seed.name }, withDeleted: true });

      const isNewPOS = !existingPOS;
      if (!existingPOS) {
        existingPOS = new PointOfSale();
        existingPOS.id = uuidv4();
      }

      existingPOS.branchId = targetBranch.id;
      existingPOS.defaultPriceListId = defaultPriceList.id;
      existingPOS.name = seed.name;
      existingPOS.deviceId = seed.deviceId ?? existingPOS.deviceId ?? undefined;
      existingPOS.isActive = true;
      existingPOS.deletedAt = undefined;

      const savedPOS = await pointOfSaleRepo.save(existingPOS);
      pointsOfSale.push(savedPOS);
      pointOfSaleByName[savedPOS.name.toLowerCase()] = savedPOS;

      const prefix = isNewPOS ? '   ✓' : '   •';
      const action = isNewPOS ? 'Punto de venta creado' : 'Punto de venta actualizado';
      console.log(`${prefix} ${action}: ${savedPOS.name} → Lista por defecto ${defaultPriceList.name}`);
    }

    // ============================================
    // 9. USUARIO ADMINISTRADOR
    // ============================================
    console.log('\n👤 Creando usuarios...');

    const personRepository = db.getRepository(Person);
    const userRepo = db.getRepository(User);

    let adminUser: User | null = null;
    let adminCredentials: { userName: string; password: string } | null = null;
    const usersByUserName: Record<string, User> = {};

    for (const userSeedEntry of userSeeds) {
      const userRole = userSeedEntry.rol ? parseEnum(UserRole, userSeedEntry.rol, `usuario ${userSeedEntry.userName} (rol)`) : UserRole.OPERATOR;

      const personSeedDefaults: {
        firstName: string;
        lastName?: string;
        documentType: DocumentType;
        documentNumber: string;
        email?: string;
        phone?: string;
        address?: string;
      } = userSeedEntry.userName === 'admin'
        ? {
            firstName: userSeedEntry.person?.firstName ?? 'Administrador',
            lastName: userSeedEntry.person?.lastName ?? 'del Sistema',
            documentType: DocumentType.RUN,
            documentNumber: userSeedEntry.person?.documentNumber ?? '22.222.222-2',
            email: userSeedEntry.mail ?? userSeedEntry.person?.email ?? 'admin@joyeria.cl',
            phone: userSeedEntry.person?.phone ?? '+56 9 1234 0000',
            address: userSeedEntry.person?.address,
          }
        : {
            firstName: userSeedEntry.person?.firstName ?? userSeedEntry.userName,
            lastName: userSeedEntry.person?.lastName,
            documentType: DocumentType.RUN,
            documentNumber: userSeedEntry.person?.documentNumber ?? `USR-${userSeedEntry.userName}`,
            email: userSeedEntry.mail ?? userSeedEntry.person?.email,
            phone: userSeedEntry.person?.phone,
            address: userSeedEntry.person?.address,
          };

      let person = await personRepository.findOne({
        where: { documentNumber: personSeedDefaults.documentNumber },
        withDeleted: true,
      });

      const isNewPerson = !person;

      if (!person) {
        person = new Person();
        person.id = uuidv4();
        person.documentNumber = personSeedDefaults.documentNumber;
      }

      person.type = PersonType.NATURAL;
      person.firstName = personSeedDefaults.firstName;
      person.lastName = personSeedDefaults.lastName ?? undefined;
      person.businessName = undefined;
      person.documentType = personSeedDefaults.documentType;
      person.email = userSeedEntry.mail ?? personSeedDefaults.email ?? undefined;
      person.phone = personSeedDefaults.phone ?? undefined;
      person.address = personSeedDefaults.address ?? undefined;
      person.deletedAt = undefined;

      await personRepository.save(person);

      let user = await userRepo.findOne({
        where: { userName: userSeedEntry.userName },
        relations: ['person'],
        withDeleted: true,
      });

      const isNewUser = !user;

      if (!user) {
        user = new User();
        user.id = uuidv4();
        user.userName = userSeedEntry.userName;
      }

      user.mail = userSeedEntry.mail ?? personSeedDefaults.email ?? `${userSeedEntry.userName}@joyarte.cl`;
      user.rol = userRole;
      user.pass = hashPassword(userSeedEntry.pass);
      user.person = person;
      user.deletedAt = undefined;

      await userRepo.save(user);
      usersByUserName[user.userName] = user;
      usersByUserName[user.userName.toLowerCase()] = user;

      const personMsgPrefix = isNewPerson ? '   ✓ Persona creada' : '   • Persona actualizada';
      const userMsgPrefix = isNewUser ? '   ✓ Usuario creado' : '   • Usuario actualizado';
      const displayName = [person.firstName, person.lastName].filter(Boolean).join(' ') || user.userName;

      if (isNewPerson) {
        console.log(`${personMsgPrefix}: ${displayName}`);
      }
      console.log(`${userMsgPrefix}: ${user.userName}`);

      if (user.userName === 'admin') {
        adminUser = user;
        adminCredentials = { userName: user.userName, password: userSeedEntry.pass };
        console.log(`   • Contraseña actualizada: ${userSeedEntry.pass}`);
      }
    }

    if (!adminUser) {
      throw new Error('El archivo users.json debe incluir un usuario "admin" para completar el seed.');
    }

    // ============================================
    // 9.1 PERÍODOS CONTABLES
    // ============================================
    console.log('\n🗓️  Configurando periodos contables...');

    const accountingPeriodRepo = db.getRepository(AccountingPeriod);
    const companyCacheByName: Record<string, Company> = {
      [company.name.toLowerCase()]: company,
    };

    for (const periodSeed of accountingPeriodSeeds) {
      const targetCompanyName = periodSeed.companyName || company.name;
      const lookupKey = targetCompanyName.trim().toLowerCase();

      let targetCompany = companyCacheByName[lookupKey];
      if (!targetCompany) {
        const fetchedCompany = await companyRepo.findOne({ where: { name: targetCompanyName } });
        if (!fetchedCompany) {
          throw new Error(
            `accountingPeriods.json → ${targetCompanyName} (${periodSeed.startDate} - ${periodSeed.endDate}): la empresa no existe en la base de datos.`,
          );
        }
        companyCacheByName[lookupKey] = fetchedCompany;
        targetCompany = fetchedCompany;
      }

      const closedByUserName = periodSeed.closedByUserName ?? null;
      let closedByUserId: string | null = null;

      if (closedByUserName) {
        const targetUser = usersByUserName[closedByUserName];
        if (!targetUser) {
          throw new Error(
            `accountingPeriods.json → ${targetCompanyName} (${periodSeed.startDate} - ${periodSeed.endDate}): el usuario "${closedByUserName}" no existe en users.json.`,
          );
        }
        closedByUserId = targetUser.id;
      }

      let period = await accountingPeriodRepo.findOne({
        where: {
          companyId: targetCompany.id,
          startDate: periodSeed.startDate,
          endDate: periodSeed.endDate,
        },
      });

      const isNewPeriod = !period;

      if (!period) {
        period = new AccountingPeriod();
        period.id = uuidv4();
        period.companyId = targetCompany.id;
        period.startDate = periodSeed.startDate;
        period.endDate = periodSeed.endDate;
      }

      period.status = periodSeed.status;

      if (periodSeed.status === AccountingPeriodStatus.OPEN) {
        period.closedAt = null;
        period.closedBy = null;
      } else {
        period.closedAt = periodSeed.closedAt ?? null;
        period.closedBy = closedByUserId;
      }

      await accountingPeriodRepo.save(period);

      const statusLabel = (() => {
        switch (period.status) {
          case AccountingPeriodStatus.CLOSED:
            return 'cerrado';
          case AccountingPeriodStatus.LOCKED:
            return 'bloqueado';
          default:
            return 'abierto';
        }
      })();

      console.log(
        `${isNewPeriod ? '   ✓' : '   •'} Periodo ${statusLabel}: ${targetCompany.name} ${periodSeed.startDate} → ${periodSeed.endDate}`,
      );
    }

    // ============================================
    // 9.2 SESIONES DE CAJA BASE
    // ============================================
    const cashSessionRepo = db.getRepository(CashSession);
    const cashSessionsByRef: Record<string, CashSession> = {};

    if (cashSessionSeeds.length === 0) {
      console.log('\n💼 No hay sesiones de caja definidas en cashSessions.json.');
    } else {
      console.log('\n💼 Configurando sesiones de caja base...');

      for (const seed of cashSessionSeeds) {
        const pointOfSale = pointOfSaleByName[seed.pointOfSaleName.toLowerCase()];
        if (!pointOfSale) {
          throw new Error(`cashSessions.json → ${seed.ref}: no se encontró el punto de venta "${seed.pointOfSaleName}".`);
        }

        const openedByUser = usersByUserName[seed.openedByUserName] ?? usersByUserName[seed.openedByUserName.toLowerCase()];
        if (!openedByUser) {
          throw new Error(`cashSessions.json → ${seed.ref}: el usuario "${seed.openedByUserName}" no existe en users.json.`);
        }

        let session = await cashSessionRepo.findOne({
          where: {
            pointOfSaleId: pointOfSale.id,
            openedAt: seed.openedAt,
          },
          withDeleted: true,
        });

        const isNewSession = !session;

        if (!session) {
          session = new CashSession();
          session.id = uuidv4();
        }

        session.pointOfSaleId = pointOfSale.id;
        session.openedById = openedByUser.id;
        session.closedById = undefined;
        session.status = seed.status;
        session.openingAmount = seed.openingAmount;
        session.closingAmount = undefined;
        session.expectedAmount = undefined;
        session.difference = undefined;
        session.openedAt = seed.openedAt;
        session.closedAt = undefined;
        session.notes = seed.notes ?? undefined;
        session.closingDetails = null;
        session.deletedAt = undefined;

        await cashSessionRepo.save(session);

        if (seed.createdAt) {
          await cashSessionRepo
            .createQueryBuilder()
            .update()
            .set({ createdAt: seed.createdAt })
            .where('id = :id', { id: session.id })
            .execute();
        }

        cashSessionsByRef[seed.ref] = session;
        cashSessionsByRef[seed.ref.toLowerCase()] = session;

        const prefix = isNewSession ? '   ✓' : '   •';
        const action = isNewSession ? 'Sesión de caja creada' : 'Sesión de caja actualizada';
        console.log(`${prefix} ${action}: ${seed.pointOfSaleName} → Apertura ${seed.openedAt.toISOString()} (${clpFormatter.format(seed.openingAmount)})`);
      }
    }

    // ============================================
    // 9.3 TRANSACCIONES CONTABLES BASE
    // ============================================
    const transactionsByDocumentNumber: Record<string, Transaction> = {};

    if (transactionSeeds.length === 0) {
      console.log('\n💸 No hay transacciones definidas en transactions.json.');
    } else {
      console.log('\n💸 Registrando transacciones contables base...');

      const pendingRelationUpdates: Array<{ transactionId: string; relatedDocumentNumber: string }> = [];

      const resolveUser = (identifier: string): User | undefined => {
        return usersByUserName[identifier] ?? usersByUserName[identifier.toLowerCase()];
      };

      const resolvePointOfSale = (name: string | null | undefined): PointOfSale | null => {
        if (!name) {
          return null;
        }
        return pointOfSaleByName[name.toLowerCase()] ?? null;
      };

      for (const seed of transactionSeeds) {
        const actor = resolveUser(seed.userName);
        if (!actor) {
          throw new Error(`transactions.json → ${seed.ref}: el usuario "${seed.userName}" no existe en users.json.`);
        }

        const branch = seed.branchRef ? branchesByRef[seed.branchRef] : undefined;
        if (seed.branchRef && !branch) {
          throw new Error(`transactions.json → ${seed.ref}: no se encontró la sucursal con referencia "${seed.branchRef}".`);
        }

        const pointOfSale = resolvePointOfSale(seed.pointOfSaleName);
        if (seed.pointOfSaleName && !pointOfSale) {
          throw new Error(`transactions.json → ${seed.ref}: no se encontró el punto de venta "${seed.pointOfSaleName}".`);
        }

        const cashSession = seed.cashSessionRef
          ? cashSessionsByRef[seed.cashSessionRef] ?? cashSessionsByRef[seed.cashSessionRef.toLowerCase()] ?? null
          : null;

        if (seed.cashSessionRef && !cashSession) {
          throw new Error(`transactions.json → ${seed.ref}: la sesión de caja "${seed.cashSessionRef}" no existe.`);
        }

        let shareholder: Shareholder | undefined;
        let shareholderPerson: Person | undefined;

        if (seed.shareholderDocumentNumber) {
          shareholder = shareholdersByDocumentNumber[seed.shareholderDocumentNumber]
            ?? shareholdersByDocumentNumber[seed.shareholderDocumentNumber.toLowerCase()];

          if (!shareholder) {
            throw new Error(`transactions.json → ${seed.ref}: no se encontró un socio con documento "${seed.shareholderDocumentNumber}".`);
          }

          shareholderPerson = shareholderPersonsById[shareholder.personId]
            ?? (await shareholderPersonRepo.findOne({ where: { id: shareholder.personId } }))
            ?? undefined;
        }

        const occurredOnIso = seed.occurredOn ? seed.occurredOn.toISOString() : null;
        const createdAtIso = seed.createdAt ? seed.createdAt.toISOString() : null;

        let transaction = await transactionRepo.findOne({
          where: { documentNumber: seed.documentNumber },
          withDeleted: true,
        });

        const isNewTransaction = !transaction;

        if (!transaction) {
          transaction = new Transaction();
          transaction.id = uuidv4();
          transaction.documentNumber = seed.documentNumber;
        }

        transaction.transactionType = seed.transactionType;
        transaction.status = seed.status;
        transaction.branchId = branch?.id ?? undefined;
        transaction.pointOfSaleId = pointOfSale?.id ?? undefined;
        transaction.cashSessionId = cashSession?.id ?? undefined;
        transaction.storageId = undefined;
        transaction.targetStorageId = undefined;
        transaction.customerId = undefined;
        transaction.supplierId = undefined;
        transaction.expenseCategoryId = undefined;
        transaction.costCenterId = undefined;
        transaction.relatedTransactionId = undefined;
        transaction.externalReference = undefined;
        transaction.notes = seed.notes ?? undefined;
        transaction.metadata = undefined;
        transaction.shareholderId = shareholder?.id ?? undefined;
        transaction.userId = actor.id;
        transaction.subtotal = seed.subtotal;
        transaction.taxAmount = seed.taxAmount;
        transaction.discountAmount = seed.discountAmount;
        transaction.total = seed.total;
        transaction.paymentMethod = seed.paymentMethod ?? undefined;
        transaction.bankAccountKey = seed.bankAccountKey ?? undefined;

        if (seed.amountPaid !== null && seed.amountPaid !== undefined) {
          transaction.amountPaid = seed.amountPaid;
        } else if (seed.kind === 'CASH_SESSION_OPENING') {
          transaction.amountPaid = undefined;
        } else {
          transaction.amountPaid = seed.total;
        }

        transaction.changeAmount = seed.changeAmount ?? 0;

        const userDisplayName = actor.person ? buildPersonDisplayName(actor.person) : actor.userName;

        let metadata: Record<string, unknown> | null = null;

        switch (seed.kind) {
          case 'CASH_SESSION_OPENING': {
            const openingAmount = seed.openingAmount ?? seed.total;
            const openedAtIso = occurredOnIso ?? cashSession?.openedAt?.toISOString() ?? createdAtIso ?? new Date().toISOString();

            metadata = {
              seedTag: 'flowstore-initial',
              branchId: transaction.branchId,
              cashSessionId: cashSession?.id ?? null,
              openingAmount,
              pointOfSaleId: pointOfSale?.id ?? null,
              openedByUserId: actor.id,
              pointOfSaleName: pointOfSale?.name ?? null,
              openedByUserName: userDisplayName,
              cashSessionOpenedAt: openedAtIso,
            };

            break;
          }
          case 'CAPITAL_CONTRIBUTION': {
            const shareholderName = shareholderPerson ? buildPersonDisplayName(shareholderPerson) : seed.shareholderDocumentNumber;
            const balanceBefore = seed.balanceBefore ?? 0;
            const balanceAfter = seed.balanceAfter ?? balanceBefore + seed.total;
            const occurred = occurredOnIso ?? createdAtIso ?? new Date().toISOString();

            metadata = {
              seedTag: 'flowstore-initial',
              source: 'capital-contribution-ui',
              occurredOn: occurred,
              bankMovement: {
                kind: 'CAPITAL_CONTRIBUTION',
                balanceAfter,
                balanceBefore,
                shareholderId: shareholder?.id ?? null,
                bankAccountKey: seed.bankAccountKey ?? null,
                createdByUserId: actor.id,
                shareholderName,
                bankAccountNumber: seed.bankAccountNumber ?? null,
              },
              capitalContribution: {
                amount: seed.total,
                occurredOn: occurred,
                balanceAfter,
                balanceBefore,
                shareholderId: shareholder?.id ?? null,
                bankAccountKey: seed.bankAccountKey ?? null,
                shareholderName,
              },
            };

            break;
          }
          case 'BANK_TO_CASH_TRANSFER': {
            const balanceBefore = seed.balanceBefore ?? seed.total;
            const balanceAfter = seed.balanceAfter ?? balanceBefore - seed.total;
            const occurred = occurredOnIso ?? createdAtIso ?? new Date().toISOString();

            metadata = {
              seedTag: 'flowstore-initial',
              source: 'bank-to-cash-transfer-ui',
              transfer: {
                amount: seed.total,
                occurredOn: occurred,
                balanceAfter,
                balanceBefore,
                originAccountKey: seed.bankAccountKey ?? null,
                originAccountCode: seed.originAccountCode ?? null,
                originAccountLabel: seed.bankAccountLabel ?? null,
                destinationAccountCode: seed.destinationAccountCode ?? null,
                destinationAccountName: seed.transferDestinationLabel ?? null,
              },
              occurredOn: occurred,
              bankMovement: {
                kind: 'BANK_TO_CASH_TRANSFER',
                bankName: seed.bankName ?? null,
                accountType: seed.bankAccountType ?? null,
                balanceAfter,
                balanceBefore,
                bankAccountKey: seed.bankAccountKey ?? null,
                createdByUserId: actor.id,
                bankAccountNumber: seed.bankAccountNumber ?? null,
                originAccountCode: seed.originAccountCode ?? null,
              },
            };

            break;
          }
          default: {
            metadata = null;
          }
        }

        transaction.metadata = metadata ?? undefined;

        await transactionRepo.save(transaction);

        if (seed.createdAt) {
          await transactionRepo
            .createQueryBuilder()
            .update()
            .set({ createdAt: seed.createdAt })
            .where('id = :id', { id: transaction.id })
            .execute();
        }

        transactionsByDocumentNumber[transaction.documentNumber] = transaction;
        transactionsByDocumentNumber[transaction.documentNumber.toLowerCase()] = transaction;

        if (seed.relatedDocumentNumber) {
          pendingRelationUpdates.push({ transactionId: transaction.id, relatedDocumentNumber: seed.relatedDocumentNumber });
        }

        const prefix = isNewTransaction ? '   ✓' : '   •';
        const action = isNewTransaction ? 'Transacción registrada' : 'Transacción actualizada';
        console.log(`${prefix} ${action}: ${transaction.documentNumber} (${transaction.transactionType}) → ${clpFormatter.format(transaction.total)}`);
      }

      for (const pending of pendingRelationUpdates) {
        const related = transactionsByDocumentNumber[pending.relatedDocumentNumber]
          ?? transactionsByDocumentNumber[pending.relatedDocumentNumber.toLowerCase()];

        if (!related) {
          throw new Error(`transactions.json: no se pudo resolver la transacción relacionada "${pending.relatedDocumentNumber}".`);
        }

        await transactionRepo.update({ id: pending.transactionId }, { relatedTransactionId: related.id });
      }
    }

    // ============================================
    // 9.3 CUENTAS DE TESORERÍA
    // ============================================
    console.log('\n🏦 Creando cuentas de tesorería...');

    const treasuryAccountRepo = db.getRepository(TreasuryAccount);
    const treasuryAccountSeeds = ensureArray(await readSeedJson<TreasuryAccountSeed[]>('treasuryAccounts.json'), 'treasuryAccounts.json');

    for (const seed of treasuryAccountSeeds) {
      const treasuryAccount = new TreasuryAccount();
      treasuryAccount.id = seed.id;
      treasuryAccount.companyId = company.id; // Use the actual company ID
      treasuryAccount.branchId = seed.branchId;
      treasuryAccount.type = seed.type as any; // Type assertion since we know the values are valid
      treasuryAccount.name = seed.name;
      treasuryAccount.bankName = seed.bankName;
      treasuryAccount.accountNumber = seed.accountNumber;
      treasuryAccount.isActive = seed.isActive;
      treasuryAccount.createdAt = new Date(seed.createdAt);
      treasuryAccount.updatedAt = new Date(seed.updatedAt);

      await treasuryAccountRepo.save(treasuryAccount);
    }

    console.log(`   ✓ Cuentas de tesorería creadas: ${treasuryAccountSeeds.length}`);

    // ============================================
    // 9.4 CLIENTES BASE
    // ============================================
    console.log('\n🧑‍🤝‍🧑 Creando clientes base...');

    const personRepo = db.getRepository(Person);
    const customerRepo = db.getRepository(Customer);

    const splitName = (fullName: string): { firstName: string; lastName?: string } => {
      const tokens = fullName.trim().split(/\s+/);
      if (tokens.length === 0) {
        return { firstName: fullName || 'Cliente' };
      }
      if (tokens.length === 1) {
        return { firstName: tokens[0] };
      }
      return {
        firstName: tokens.slice(0, -1).join(' '),
        lastName: tokens.slice(-1).join(' '),
      };
    };

    for (const seed of customerSeeds) {
      const { firstName, lastName } = splitName(seed.name);

      let person = await personRepo.findOne({ where: { documentNumber: seed.dni }, withDeleted: true });

      const isNewPerson = !person;
      if (!person) {
        person = new Person();
        person.id = uuidv4();
      }

      person.type = PersonType.NATURAL;
      person.firstName = firstName;
      person.lastName = lastName ?? undefined;
      person.businessName = undefined;
      person.documentType = DocumentType.RUN;
      person.documentNumber = seed.dni;
      person.email = seed.mail ?? undefined;
      person.phone = seed.phone ?? undefined;
      person.address = seed.address ?? undefined;
      person.deletedAt = undefined;

      person = await personRepo.save(person);

      let customer = await customerRepo.findOne({ where: { personId: person.id }, withDeleted: true });
      const isNewCustomer = !customer;

      if (!customer) {
        customer = new Customer();
        customer.id = uuidv4();
        customer.personId = person.id;
      }

      customer.creditLimit = seed.creditLimit ?? 0;
      customer.currentBalance = 0;
      customer.paymentDayOfMonth = seed.paymentDayOfMonth ?? 5;
      customer.isActive = true;
      customer.notes = seed.notes ?? undefined;
      customer.deletedAt = undefined;

      await customerRepo.save(customer);

      const fallbackName = [person.firstName, person.lastName].filter(Boolean).join(' ').trim();
      const displayName = seed.name ?? (fallbackName || person.businessName || seed.dni);
      const personPrefix = isNewPerson ? '   ✓ Persona creada' : '   • Persona actualizada';
      const customerPrefix = isNewCustomer ? '   ✓ Cliente creado' : '   • Cliente actualizado';

      if (isNewPerson) {
        console.log(`${personPrefix}: ${displayName}`);
      }
      console.log(`${customerPrefix}: ${displayName}`);
      customerSummaries.push(displayName);
    }

    // ============================================
    // 9.5 PROVEEDORES BASE
    // ============================================
    console.log('\n🏭 Creando proveedores base...');

    const supplierRepo = db.getRepository(Supplier);

    for (const seed of supplierSeeds) {
      let person = await personRepo.findOne({ where: { documentNumber: seed.documentNumber }, withDeleted: true });
      const isNewPerson = !person;

      if (!person) {
        person = new Person();
        person.id = uuidv4();
      }

      person.type = seed.personType;
      person.firstName = seed.contactFirstName;
      person.lastName = seed.contactLastName ?? undefined;
      person.businessName = seed.businessName;
      person.documentType = seed.documentType;
      person.documentNumber = seed.documentNumber;
      person.email = seed.email ?? undefined;
      person.phone = seed.phone ?? undefined;
      person.address = seed.address ?? undefined;
      person.bankAccounts = seed.bankAccounts ?? null;
      person.deletedAt = undefined;

      await personRepo.save(person);

      let supplier = await supplierRepo.findOne({ where: { personId: person.id }, withDeleted: true });
      const isNewSupplier = !supplier;

      if (!supplier) {
        supplier = supplierRepo.create({ personId: person.id });
      } else {
        supplier.personId = person.id;
      }

      supplier.supplierType = seed.supplierType;
      supplier.alias = seed.alias ?? seed.businessName;
      supplier.defaultPaymentTermDays = seed.defaultPaymentTermDays ?? 0;
      supplier.notes = seed.notes ?? undefined;
      supplier.isActive = true;
      supplier.deletedAt = undefined;

      await supplierRepo.save(supplier);

      const displayName = seed.businessName;
      const personPrefix = isNewPerson ? '   ✓ Persona registrada' : '   • Persona actualizada';
      const supplierPrefix = isNewSupplier ? '   ✓ Proveedor creado' : '   • Proveedor actualizado';

      if (isNewPerson) {
        console.log(`${personPrefix}: ${displayName}`);
      }
      console.log(`${supplierPrefix}: ${displayName}`);
      supplierSummaries.push(displayName);
    }

    // ============================================
    // 10. PERMISOS PARA ADMIN
    // ============================================
    console.log('\n🔐 Asignando permisos al administrador...');
    
    const permissionRepo = db.getRepository(Permission);
    let permissionsCreated = 0;
    let permissionsSkipped = 0;
    
    for (const ability of ALL_ABILITIES) {
      const existingPermission = await permissionRepo.findOne({
        where: { userId: adminUser.id, ability }
      });
      
      if (!existingPermission) {
        const permission = new Permission();
        permission.id = uuidv4();
        permission.userId = adminUser.id;
        permission.ability = ability;
        permission.description = `Permiso ${ability} para admin`;
        await permissionRepo.save(permission);
        permissionsCreated++;
      } else {
        permissionsSkipped++;
      }
    }
    
    if (permissionsCreated > 0) {
      console.log(`   ✓ ${permissionsCreated} permisos asignados`);
    }
    if (permissionsSkipped > 0) {
      console.log(`   ⚠ ${permissionsSkipped} permisos ya existían`);
    }

    // ============================================
    // 11. UNIDADES DE MEDIDA
    // ============================================
    console.log('\n📏 Configurando unidades de medida...');

    const unitRepo = db.getRepository(Unit);
    const existingUnits = await unitRepo.find({ where: { deletedAt: IsNull() }, relations: ['baseUnit'] });
    const unitsBySymbol = new Map(existingUnits.map((unit) => [unit.symbol, unit]));

    for (const seed of unitSeeds.filter((unit) => unit.isBase)) {
      if (unitsBySymbol.has(seed.symbol)) {
        console.log(`   ⚠ Unidad base ya existe: ${seed.symbol}`);
        continue;
      }

      const unit = new Unit();
      unit.id = uuidv4();
      unit.name = seed.name;
      unit.symbol = seed.symbol;
      unit.dimension = seed.dimension;
      unit.conversionFactor = seed.conversionFactor;
      unit.allowDecimals = seed.allowDecimals ?? true;
      unit.isBase = true;
      unit.active = true;
      unit.baseUnit = null;

      await unitRepo.save(unit);
      unitsBySymbol.set(seed.symbol, unit);
      console.log(`   ✓ Unidad base creada: ${seed.name} (${seed.symbol})`);
    }

    for (const seed of unitSeeds.filter((unit) => !unit.isBase)) {
      if (unitsBySymbol.has(seed.symbol)) {
        console.log(`   ⚠ Unidad derivada ya existe: ${seed.symbol}`);
        continue;
      }

      const baseUnit = unitsBySymbol.get(seed.baseSymbol);
      if (!baseUnit) {
        console.log(`   ✗ No se pudo crear ${seed.symbol}: unidad base ${seed.baseSymbol} no encontrada`);
        continue;
      }

      const unit = new Unit();
      unit.id = uuidv4();
      unit.name = seed.name;
      unit.symbol = seed.symbol;
      unit.dimension = seed.dimension;
      unit.conversionFactor = seed.conversionFactor;
      unit.allowDecimals = seed.allowDecimals ?? true;
      unit.isBase = false;
      unit.active = true;
      unit.baseUnit = baseUnit;

      await unitRepo.save(unit);
      unitsBySymbol.set(seed.symbol, unit);
      console.log(`   ✓ Unidad derivada creada: ${seed.name} (${seed.symbol})`);
    }

    // ============================================
    // 12. PRODUCTOS DE EJEMPLO (JOYERÍA)
    // ============================================
    console.log('\n💎 Creando productos de ejemplo...');

    const normalizeSeedWeightUnit = (unit?: ProductVariantSeed['weightUnit']): 'kg' | 'g' => {
      if (!unit) {
        return 'kg';
      }

      return unit === 'g' ? 'g' : 'kg';
    };

    const productRepo = db.getRepository(Product);
    const variantRepo = db.getRepository(ProductVariant);
    const priceListItemRepo = db.getRepository(PriceListItem);

    const mapAttributeValues = (values?: Record<string, string>): Record<string, string> | undefined => {
      if (!values) {
        return undefined;
      }

      const mapped: Record<string, string> = {};
      let hasAtLeastOne = false;

      for (const [attributeName, optionValue] of Object.entries(values)) {
        const attribute = attributeMap[attributeName];
        if (!attribute || !optionValue) {
          continue;
        }
        mapped[attribute.id] = optionValue;
        hasAtLeastOne = true;
      }

      return hasAtLeastOne ? mapped : undefined;
    };

    const defaultVatTax = taxesByCode['IVA-19'];

    for (const productSeed of productSeeds) {
      const desiredSkus = new Set(productSeed.variants.map((variant) => variant.sku));

      let product = await productRepo.findOne({
        where: { name: productSeed.name },
        withDeleted: true,
      });

      if (!product) {
        product = new Product();
        product.id = uuidv4();
        product.productType = ProductType.PHYSICAL;
      }

      const category = categoryMap[productSeed.categoryName];
      if (!category) {
        console.log(`   ⚠ No se encontró la categoría ${productSeed.categoryName} para ${productSeed.name}`);
      }
      const baseUnit = unitsBySymbol.get('un');

      if (!baseUnit) {
        console.log('   ✗ No se pudo asegurar variantes: unidad UN no disponible.');
        continue;
      }

      product.name = productSeed.name;
      product.description = productSeed.description;
      product.brand = productSeed.brand;
      product.categoryId = category?.id;
      product.productType = ProductType.PHYSICAL;
      product.isActive = true;
      product.baseUnitId = baseUnit.id;
      product.baseUnit = baseUnit;
      product.taxIds = defaultVatTax ? [defaultVatTax.id] : undefined;
      product.deletedAt = undefined;

      await productRepo.save(product);

      const existingVariants = await variantRepo.find({
        where: { productId: product.id },
        withDeleted: true,
      });

      for (const existing of existingVariants) {
        if (!desiredSkus.has(existing.sku)) {
          await db.createQueryBuilder()
            .delete()
            .from(PriceListItem)
            .where('productVariantId = :variantId', { variantId: existing.id })
            .execute();

          await variantRepo.softRemove(existing);
        }
      }

      for (const variantSeed of productSeed.variants) {

        let variant = await variantRepo.findOne({
          where: { sku: variantSeed.sku },
          withDeleted: true,
        });

        if (!variant) {
          variant = new ProductVariant();
          variant.id = uuidv4();
          variant.sku = variantSeed.sku;
        }

        const attributeValues = mapAttributeValues(variantSeed.attributeValues);

        const preparedPriceEntries = (variantSeed.priceEntries ?? [])
          .map((entry) => {
            const priceList = priceListsByKey[entry.listKey];
            if (!priceList) {
              console.log(`   ✗ Lista de precios "${entry.listKey}" no existe, se omite para variante ${variantSeed.sku}`);
              return null;
            }

            const taxes = (entry.taxCodes ?? ['IVA-19'])
              .map((code) => taxesByCode[code])
              .filter((tax): tax is Tax => Boolean(tax));

            const computation = computePriceWithTaxes({
              netPrice: entry.netPrice,
              grossPrice: entry.grossPrice,
              taxRates: taxes.map((tax) => tax.rate),
            });

            return {
              priceList,
              netPrice: computation.netPrice,
              grossPrice: computation.grossPrice,
              taxIds: taxes.map((tax) => tax.id),
            };
          })
          .filter((entry): entry is { priceList: PriceList; netPrice: number; grossPrice: number; taxIds: string[] } => entry !== null);

        if (preparedPriceEntries.length === 0) {
          console.log(`   ⚠ Variante ${variantSeed.sku} sin precios válidos, se omite.`);
          continue;
        }

        const primaryEntry = preparedPriceEntries[0];
        const uniqueTaxIds = Array.from(new Set(preparedPriceEntries.flatMap((entry) => entry.taxIds)));

        variant.productId = product.id;
        variant.basePrice = primaryEntry.netPrice;
        variant.baseCost = variantSeed.baseCost ?? Math.round(primaryEntry.netPrice * 0.45);
        variant.unitId = baseUnit.id;
        variant.unit = baseUnit;
        variant.weight = variantSeed.weight !== undefined ? Number(variantSeed.weight) : undefined;
        variant.weightUnit = normalizeSeedWeightUnit(variantSeed.weightUnit);
        variant.attributeValues = attributeValues;
        variant.isActive = true;
        variant.trackInventory = variantSeed.trackInventory ?? true;
        variant.allowNegativeStock = variantSeed.allowNegativeStock ?? false;
        variant.taxIds = uniqueTaxIds.length > 0 ? uniqueTaxIds : undefined;
        variant.deletedAt = undefined;

        await variantRepo.save(variant);

        await db.createQueryBuilder()
          .delete()
          .from(PriceListItem)
          .where('productVariantId = :variantId', { variantId: variant.id })
          .execute();

        for (const entry of preparedPriceEntries) {
          const priceListItem = new PriceListItem();
          priceListItem.id = uuidv4();
          priceListItem.priceListId = entry.priceList.id;
          priceListItem.productId = product.id;
          priceListItem.productVariantId = variant.id;
          priceListItem.netPrice = entry.netPrice;
          priceListItem.grossPrice = entry.grossPrice;
          priceListItem.taxIds = entry.taxIds.length > 0 ? entry.taxIds : null;

          await priceListItemRepo.save(priceListItem);
        }

        console.log(`   ✓ Variante asegurada: ${variantSeed.sku}`);
      }
    }

    // ============================================
    // RESUMEN
    // ============================================
    const totalVariantsSeeded = productSeeds.reduce((acc, product) => acc + product.variants.length, 0);
    const priceListsSummary = Object.values(priceListsByKey)
      .map((list) => list.name)
      .join(', ');

    const [
      personCount,
      shareholderCount,
      customerCount,
      supplierCount,
      userCount,
      permissionCount,
      priceListItemCount,
    ] = await Promise.all([
      db.getRepository(Person).count({ where: { deletedAt: IsNull() } }),
      db.getRepository(Shareholder).count({ where: { companyId: company.id, deletedAt: IsNull() } }),
      db.getRepository(Customer).count({ where: { deletedAt: IsNull() } }),
      db.getRepository(Supplier).count({ where: { deletedAt: IsNull() } }),
      db.getRepository(User).count({ where: { deletedAt: IsNull() } }),
      db.getRepository(Permission).count({ where: { deletedAt: IsNull() } }),
      db.getRepository(PriceListItem).count({ where: { deletedAt: IsNull() } }),
    ]);

    const storagesSummaryList = await db.getRepository(Storage).find({
      where: { deletedAt: IsNull() },
      order: { name: 'ASC' },
    });

    const storageDisplayNames = storagesSummaryList.map((entry) => entry.name);
    const storageSummaryText = storageDisplayNames.length > 0 ? storageDisplayNames.join(', ') : '—';
    const uniqueShareholderSummaries = Array.from(new Set(shareholderSummaries));
    const shareholderSummaryText = uniqueShareholderSummaries.length > 0 ? uniqueShareholderSummaries.join(', ') : '—';
    const uniqueCustomerSummaries = Array.from(new Set(customerSummaries));
    const customerSummaryText = uniqueCustomerSummaries.length > 0 ? uniqueCustomerSummaries.join(', ') : '—';
    const uniqueSupplierSummaries = Array.from(new Set(supplierSummaries));
    const supplierSummaryText = uniqueSupplierSummaries.length > 0 ? uniqueSupplierSummaries.join(', ') : '—';

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ Seed completado exitosamente!');
    console.log('───────────────────────────────────────────────────────────');
    console.log('\n📊 Resumen de datos:');
    console.log(`   • Empresa: ${company.name}`);
    const branchSummaryList = branchSeeds
      .map((seed) => branchesByRef[seed.ref])
      .filter((entry): entry is Branch => Boolean(entry));
    const branchSummaryHeader = `   • Sucursales (${branchSummaryList.length}):`;
    const branchDisplayNames = branchSummaryList.map((entry) => (entry.isHeadquarters ? `${entry.name} (Casa matriz)` : entry.name));
    if (branchDisplayNames.length <= 3) {
      console.log(`${branchSummaryHeader} ${branchDisplayNames.join(', ')}`);
    } else {
      console.log(branchSummaryHeader);
      branchDisplayNames.forEach((name) => console.log(`      - ${name}`));
    }
    const taxNames = Object.values(taxesByCode)
      .map((tax) => tax.name)
      .sort((a, b) => a.localeCompare(b, 'es'));
    const taxSummaryHeader = `   • Impuestos (${taxNames.length}):`;
    if (taxNames.length <= 3) {
      console.log(`${taxSummaryHeader} ${taxNames.join(', ')}`);
    } else {
      console.log(taxSummaryHeader);
      taxNames.forEach((name) => console.log(`      - ${name}`));
    }
    console.log(`   • Plan de cuentas: ${accountingAccountSeeds.length} cuentas activas`);
    console.log(`   • Categorías de gasto: ${expenseCategorySeeds.length} categorías`);
    console.log(`   • Reglas contables: ${accountingRuleSeeds.length} reglas automáticas`);
    console.log(`   • Permisos asignados: ${permissionCount}`);
    console.log(`   • Usuarios activos: ${userCount}`);
    console.log(`   • Personas registradas: ${personCount}`);
    console.log(`   • Socios activos: ${shareholderCount}${shareholderSummaryText !== '—' ? ` (${shareholderSummaryText})` : ''}`);
    console.log(`   • Clientes activos: ${customerCount}${customerSummaryText !== '—' ? ` (${customerSummaryText})` : ''}`);
    console.log(`   • Proveedores activos: ${supplierCount}${supplierSummaryText !== '—' ? ` (${supplierSummaryText})` : ''}`);
    console.log(`   • Centros de costo: ${costCenterSeeds.length} activos`);
    console.log(`   • Unidades organizativas: ${organizationalUnitSeeds.length} activas`);
    console.log(`   • Categorías: ${categorySeeds.length} categorías de joyería`);
    console.log(`   • Atributos: ${attributeSeeds.length} atributos para variantes`);
    console.log(`   • Productos: ${productSeeds.length} productos de ejemplo (${totalVariantsSeeded} variantes)`);
    console.log(`   • Listas de precios: ${Object.values(priceListsByKey).length} (${priceListsSummary})`);
    console.log(`   • Ítems de listas de precio: ${priceListItemCount}`);
    console.log(`   • Bodegas: ${storagesSummaryList.length} (${storageSummaryText})`);
    const pointOfSaleSummary = pointsOfSale.map((pos) => {
      const listName = Object.values(priceListsByKey).find((list) => list.id === pos.defaultPriceListId)?.name ?? 'Sin lista';
      return `${pos.name} → ${listName}`;
    });
    console.log(`   • Puntos de venta: ${pointsOfSale.length} (${pointOfSaleSummary.join(', ')})`);
    console.log('\n🔑 Credenciales de acceso:');
    if (adminCredentials) {
      console.log(`   Usuario: ${adminCredentials.userName}`);
      console.log(`   Contraseña: ${adminCredentials.password}`);
    } else {
      console.log('   Usuario: admin');
      console.log('   Contraseña: (consultar users.json)');
    }
    console.log('───────────────────────────────────────────────────────────\n');

    process.exit(0);
  } catch (error) {
    console.error('\n───────────────────────────────────────────────────────────');
    console.error('❌ Error en el seed:');
    console.error(error);
    process.exit(1);
  }
}

seedFlowStore();
