import { getDb } from '../db';
import { User, UserRole } from '../entities/User';
import { Person, PersonType, DocumentType, BankName, AccountTypeName, PersonBankAccount } from '../entities/Person';
import { Company } from '../entities/Company';
import { Branch } from '../entities/Branch';
import { Tax, TaxType } from '../entities/Tax';
import { Category } from '../entities/Category';
import { PriceList, PriceListType } from '../entities/PriceList';
import { PriceListItem } from '../entities/PriceListItem';
import { Storage, StorageCategory, StorageType } from '../entities/Storage';
import { PointOfSale } from '../entities/PointOfSale';
import { Permission, Ability, ALL_ABILITIES } from '../entities/Permission';
import { Attribute } from '../entities/Attribute';
import { Product, ProductType } from '../entities/Product';
import { ProductVariant } from '../entities/ProductVariant';
import { Unit } from '../entities/Unit';
import { UnitDimension } from '../entities/unit-dimension.enum';
import { AccountingAccount, AccountType } from '../entities/AccountingAccount';
import { ExpenseCategory } from '../entities/ExpenseCategory';
import { AccountingRule, RuleScope } from '../entities/AccountingRule';
import { Transaction, TransactionStatus, PaymentMethod, TransactionType } from '../entities/Transaction';
import { TransactionLine } from '../entities/TransactionLine';
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

const clpFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

const formatCLP = (value: number): string => clpFormatter.format(value);

const INITIAL_CAPITAL_DOCUMENT = 'CAP-INITIAL-0001';
const INITIAL_CAPITAL_AMOUNT = 10_000_000;

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
    
    let company = await db.getRepository(Company).findOne({ where: { name: 'Joyarte' } });
    
    const defaultBankAccount: PersonBankAccount = {
      accountKey: 'JOYARTE-SANTANDER-CC-001',
      bankName: BankName.BANCO_SANTANDER,
      accountType: AccountTypeName.CUENTA_CORRIENTE,
      accountNumber: '12345678-9',
      accountHolderName: 'Joyarte SpA',
      isPrimary: true,
      notes: 'Cuenta principal de operaciones',
    };

    if (!company) {
      // Buscar cualquier empresa existente para actualizar
      const companies = await db.getRepository(Company).find({ take: 1 });
      if (companies.length > 0) {
        company = companies[0];
        company.name = 'Joyarte';
        company.defaultCurrency = 'CLP';
        company.isActive = true;
        company.settings = {
          allowNegativeStock: false,
          requireCustomerForSale: false,
          defaultPaymentMethod: 'CASH',
        };
        company.bankAccounts = [defaultBankAccount];
        await db.getRepository(Company).save(company);
        console.log(`   ✓ Empresa actualizada: ${company.name}`);
      } else {
        company = new Company();
        company.id = uuidv4();
        company.name = 'Joyarte';
        company.defaultCurrency = 'CLP';
        company.isActive = true;
        company.settings = {
          allowNegativeStock: false,
          requireCustomerForSale: false,
          defaultPaymentMethod: 'CASH',
        };
        company.bankAccounts = [defaultBankAccount];
        company = await db.getRepository(Company).save(company);
        console.log(`   ✓ Empresa creada: ${company.name}`);
      }
    } else {
      if (!company.bankAccounts || company.bankAccounts.length === 0) {
        company.bankAccounts = [defaultBankAccount];
        await db.getRepository(Company).save(company);
        console.log(`   ✓ Empresa actualizada con cuenta bancaria por defecto: ${company.name}`);
      } else {
        console.log(`   ⚠ Empresa ya existe: ${company.name}`);
      }
    }

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

    const primaryBankAccount = Array.isArray(company.bankAccounts)
      ? company.bankAccounts.find((account) => account.isPrimary) ?? company.bankAccounts[0] ?? null
      : null;

    // ============================================
    // 2. SUCURSALES
    // ============================================
    console.log('\n🏬 Configurando sucursales...');

    const branchRepo = db.getRepository(Branch);
    const branchSeeds: Array<{
      ref: string;
      name: string;
      address?: string;
      phone?: string;
      location?: { lat: number; lng: number } | null;
      isHeadquarters: boolean;
      legacyNames?: string[];
    }> = [
      {
        ref: 'PARRAL',
        name: 'Sucursal Parral',
        address: 'Avenida Aníbal Pinto 123, Parral',
        phone: '+56 9 1234 5678',
        location: { lat: -36.1454, lng: -71.8244 },
        isHeadquarters: true,
        legacyNames: ['Local Mall Plaza'],
      },
      {
        ref: 'ONLINE',
        name: 'Tienda Online',
        address: 'Canal e-commerce Joyarte',
        phone: '+56 2 600 569 2783',
        location: null,
        isHeadquarters: false,
        legacyNames: ['Tienda Online'],
      },
    ];

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
    const costCentersData: Array<{
      ref: string;
      code: string;
      name: string;
      description?: string;
      type: CostCenterType;
      branchRef?: string;
    }> = [
      {
        ref: 'OPERACIONES_PARRAL',
        code: 'OPS-PARRAL',
        name: 'Operaciones Sucursal Parral',
        description: 'Centro de costos principal para la operación presencial en Parral.',
        type: CostCenterType.OPERATIONS,
        branchRef: 'PARRAL',
      },
      {
        ref: 'OPERACIONES_ONLINE',
        code: 'OPS-ONLINE',
        name: 'Operaciones Tienda Online',
        description: 'Centro de costos para el canal e-commerce y logística de envíos.',
        type: CostCenterType.OPERATIONS,
        branchRef: 'ONLINE',
      },
    ];

    const costCenterRefMap: Record<string, CostCenter> = {};

    for (const entry of costCentersData) {
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
    const organizationalUnitsData: Array<{
      code: string;
      name: string;
      description?: string;
      type: OrganizationalUnitType;
      branchRef?: string;
      costCenterRef?: string;
      parentCode?: string;
    }> = [
      {
        code: 'ADM-CENTRAL',
        name: 'Administración Central',
        description: 'Equipo central responsable de la gestión administrativa y financiera.',
        type: OrganizationalUnitType.HEADQUARTERS,
        costCenterRef: 'OPERACIONES_PARRAL',
      },
      {
        code: 'OPS-PARRAL',
        name: 'Operaciones Sucursal Parral',
        description: 'Equipo operativo de la sala de ventas presencial en Parral.',
        type: OrganizationalUnitType.STORE,
        branchRef: 'PARRAL',
        costCenterRef: 'OPERACIONES_PARRAL',
        parentCode: 'ADM-CENTRAL',
      },
      {
        code: 'OPS-ONLINE',
        name: 'Operaciones Tienda Online',
        description: 'Equipo encargado del canal online, fulfillment y despacho.',
        type: OrganizationalUnitType.STORE,
        branchRef: 'ONLINE',
        costCenterRef: 'OPERACIONES_ONLINE',
        parentCode: 'ADM-CENTRAL',
      },
    ];

    const organizationalUnitMap = new Map<string, OrganizationalUnit>();

    for (const entry of organizationalUnitsData) {
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
    const taxDefinitions: Array<{
      code: string;
      name: string;
      taxType: TaxType;
      rate: number;
      description: string;
      isDefault?: boolean;
    }> = [
      {
        code: 'IVA-19',
        name: 'IVA 19%',
        taxType: TaxType.IVA,
        rate: 19,
        description: 'Impuesto al Valor Agregado estándar. Cuenta 2.1.02 IVA Débito Fiscal.',
        isDefault: true,
      },
      {
        code: 'EXENTO',
        name: 'Exento',
        taxType: TaxType.EXEMPT,
        rate: 0,
        description: 'Producto exento de impuestos.',
      },
      {
        code: 'ILA_BEBIDAS_10',
        name: 'ILA Bebidas Analcohólicas 10%',
        taxType: TaxType.SPECIFIC,
        rate: 10,
        description: 'Analcohólicas con azúcar ≤ 15g/100ml. Cuenta 2.1.03 ILA por Pagar.',
      },
      {
        code: 'ILA_BEBIDAS_18',
        name: 'ILA Bebidas Azucaradas 18%',
        taxType: TaxType.SPECIFIC,
        rate: 18,
        description: 'Analcohólicas con azúcar > 15g/100ml. Cuenta 2.1.03 ILA por Pagar.',
      },
      {
        code: 'ILA_CERVEZAS_20_5',
        name: 'ILA Cervezas y Sidras 20.5%',
        taxType: TaxType.SPECIFIC,
        rate: 20.5,
        description: 'Cervezas y sidras. Cuenta 2.1.03 ILA por Pagar.',
      },
      {
        code: 'ILA_VINOS_20_5',
        name: 'ILA Vinos y Chichas 20.5%',
        taxType: TaxType.SPECIFIC,
        rate: 20.5,
        description: 'Vinos y chichas. Cuenta 2.1.03 ILA por Pagar.',
      },
      {
        code: 'ILA_LICORES_31_5',
        name: 'ILA Licores y Destilados 31.5%',
        taxType: TaxType.SPECIFIC,
        rate: 31.5,
        description: 'Destilados (pisco, whisky, ron). Cuenta 2.1.03 ILA por Pagar.',
      },
      {
        code: 'IMP_LUJO_15',
        name: 'Impuesto de Lujo 15%',
        taxType: TaxType.SPECIFIC,
        rate: 15,
        description: 'Joyas, artículos de lujo y objetos de alto valor. Cuenta 2.1.03 ILA por Pagar.',
      },
    ];

    const taxRepo = db.getRepository(Tax);
    const taxesByCode: Record<string, Tax> = {};

    for (const definition of taxDefinitions) {
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
          isActive: true,
        });
        await taxRepo.save(taxEntity);
        console.log(`   ✓ Impuesto creado: ${taxEntity.name}`);
      } else {
        taxEntity.name = definition.name;
        taxEntity.taxType = definition.taxType;
        taxEntity.rate = definition.rate;
        taxEntity.description = definition.description;
        taxEntity.isDefault = Boolean(definition.isDefault);
        taxEntity.isActive = true;
        await taxRepo.save(taxEntity);
        console.log(`   • Impuesto actualizado: ${taxEntity.name}`);
      }

      taxesByCode[taxEntity.code] = taxEntity;
    }

    // ============================================
    // 3.1 PLAN DE CUENTAS CHILENO (RESUMIDO)
    // ============================================
    console.log('\n📚 Configurando plan de cuentas contable...');

    const accountingAccountsData: Array<{
      ref: string;
      code: string;
      name: string;
      type: AccountType;
      parentRef: string | null;
    }> = [
      { ref: 'ACTIVOS', code: '1', name: 'ACTIVOS', type: AccountType.ASSET, parentRef: null },
      { ref: 'ACTIVO_CIRCULANTE', code: '1.1', name: 'ACTIVO CIRCULANTE', type: AccountType.ASSET, parentRef: 'ACTIVOS' },
      { ref: 'CAJA_GENERAL', code: '1.1.01', name: 'Caja General', type: AccountType.ASSET, parentRef: 'ACTIVO_CIRCULANTE' },
      { ref: 'INSTITUCIONES_FINANCIERAS', code: '1.1.02', name: 'Instituciones Financieras (Bancos)', type: AccountType.ASSET, parentRef: 'ACTIVO_CIRCULANTE' },
      { ref: 'CLIENTES_CXC', code: '1.1.03', name: 'Clientes (Cuentas por Cobrar)', type: AccountType.ASSET, parentRef: 'ACTIVO_CIRCULANTE' },
      { ref: 'EXISTENCIAS', code: '1.1.04', name: 'Existencias (Inventario)', type: AccountType.ASSET, parentRef: 'ACTIVO_CIRCULANTE' },
      { ref: 'IVA_CREDITO_FISCAL', code: '1.1.05', name: 'IVA Crédito Fiscal (19%)', type: AccountType.ASSET, parentRef: 'ACTIVO_CIRCULANTE' },
      { ref: 'PPM', code: '1.1.06', name: 'PPM (Pagos Provisionales Mensuales)', type: AccountType.ASSET, parentRef: 'ACTIVO_CIRCULANTE' },
      { ref: 'ACTIVO_FIJO', code: '1.2', name: 'ACTIVO FIJO', type: AccountType.ASSET, parentRef: 'ACTIVOS' },
      { ref: 'MAQUINARIA_INSTALACIONES', code: '1.2.01', name: 'Maquinaria e Instalaciones', type: AccountType.ASSET, parentRef: 'ACTIVO_FIJO' },
      { ref: 'VEHICULOS', code: '1.2.02', name: 'Vehículos', type: AccountType.ASSET, parentRef: 'ACTIVO_FIJO' },

      { ref: 'PASIVOS', code: '2', name: 'PASIVOS', type: AccountType.LIABILITY, parentRef: null },
      { ref: 'PASIVO_CIRCULANTE', code: '2.1', name: 'PASIVO CIRCULANTE', type: AccountType.LIABILITY, parentRef: 'PASIVOS' },
      { ref: 'PROVEEDORES', code: '2.1.01', name: 'Proveedores (Cuentas por Pagar)', type: AccountType.LIABILITY, parentRef: 'PASIVO_CIRCULANTE' },
      { ref: 'IVA_DEBITO_FISCAL', code: '2.1.02', name: 'IVA Débito Fiscal (19%)', type: AccountType.LIABILITY, parentRef: 'PASIVO_CIRCULANTE' },
      { ref: 'RETENCIONES_HONORARIOS', code: '2.1.03', name: 'Retenciones de Honorarios (13.75%)', type: AccountType.LIABILITY, parentRef: 'PASIVO_CIRCULANTE' },
      { ref: 'REMUNERACIONES_POR_PAGAR', code: '2.1.04', name: 'Remuneraciones por Pagar', type: AccountType.LIABILITY, parentRef: 'PASIVO_CIRCULANTE' },
      { ref: 'LEYES_SOCIALES_POR_PAGAR', code: '2.1.05', name: 'Leyes Sociales por Pagar', type: AccountType.LIABILITY, parentRef: 'PASIVO_CIRCULANTE' },

      { ref: 'PATRIMONIO', code: '3', name: 'PATRIMONIO', type: AccountType.EQUITY, parentRef: null },
      { ref: 'CAPITAL_PAGADO', code: '3.1.01', name: 'Capital Pagado', type: AccountType.EQUITY, parentRef: 'PATRIMONIO' },
      { ref: 'UTILIDADES_ACUMULADAS', code: '3.1.02', name: 'Utilidades / Pérdidas Acumuladas', type: AccountType.EQUITY, parentRef: 'PATRIMONIO' },

      { ref: 'INGRESOS', code: '4', name: 'INGRESOS', type: AccountType.INCOME, parentRef: null },
      { ref: 'INGRESOS_OPERACIONALES', code: '4.1', name: 'Ingresos Operacionales', type: AccountType.INCOME, parentRef: 'INGRESOS' },
      { ref: 'VENTAS_MERCADERIAS', code: '4.1.01', name: 'Ventas de Mercaderías', type: AccountType.INCOME, parentRef: 'INGRESOS_OPERACIONALES' },
      { ref: 'VENTAS_SERVICIOS', code: '4.1.02', name: 'Ventas de Servicios', type: AccountType.INCOME, parentRef: 'INGRESOS_OPERACIONALES' },
      { ref: 'INGRESOS_NO_OPERACIONALES', code: '4.2', name: 'Ingresos No Operacionales', type: AccountType.INCOME, parentRef: 'INGRESOS' },
      { ref: 'INTERESES_GANADOS', code: '4.2.01', name: 'Intereses Ganados / Otros Ingresos', type: AccountType.INCOME, parentRef: 'INGRESOS_NO_OPERACIONALES' },

      { ref: 'EGRESOS', code: '5', name: 'EGRESOS / GASTOS', type: AccountType.EXPENSE, parentRef: null },
      { ref: 'COSTOS_VENTAS', code: '5.1', name: 'Costos de Ventas', type: AccountType.EXPENSE, parentRef: 'EGRESOS' },
      { ref: 'CMV', code: '5.1.01', name: 'Costo de Mercaderías Vendidas (CMV)', type: AccountType.EXPENSE, parentRef: 'COSTOS_VENTAS' },
      { ref: 'GASTOS_ADMIN', code: '5.2', name: 'Gastos de Administración', type: AccountType.EXPENSE, parentRef: 'EGRESOS' },
      { ref: 'SUELDOS_SALARIOS', code: '5.2.01', name: 'Sueldos y Salarios', type: AccountType.EXPENSE, parentRef: 'GASTOS_ADMIN' },
      { ref: 'ARRIENDOS', code: '5.2.02', name: 'Arriendos', type: AccountType.EXPENSE, parentRef: 'GASTOS_ADMIN' },
      { ref: 'GASTOS_GENERALES', code: '5.2.03', name: 'Gastos Generales', type: AccountType.EXPENSE, parentRef: 'GASTOS_ADMIN' },
      { ref: 'HONORARIOS_PROFESIONALES', code: '5.2.04', name: 'Honorarios Profesionales', type: AccountType.EXPENSE, parentRef: 'GASTOS_ADMIN' },
      { ref: 'GASTOS_VENTAS', code: '5.3', name: 'Gastos de Ventas', type: AccountType.EXPENSE, parentRef: 'EGRESOS' },
      { ref: 'PUBLICIDAD_MARKETING', code: '5.3.01', name: 'Publicidad y Marketing', type: AccountType.EXPENSE, parentRef: 'GASTOS_VENTAS' },
      { ref: 'COMISIONES_VENTAS', code: '5.3.02', name: 'Comisiones por Ventas', type: AccountType.EXPENSE, parentRef: 'GASTOS_VENTAS' },
    ];

    const accountRepo = db.getRepository(AccountingAccount);
    const existingAccounts = await accountRepo.find({ where: { companyId: company.id } });
    const existingByCode = new Map(existingAccounts.map((account) => [account.code, account]));
    const accountRefMap: Record<string, AccountingAccount> = {};
    const codeByRef = new Map(accountingAccountsData.map((entry) => [entry.ref, entry.code]));

    for (const entry of accountingAccountsData) {
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

    const allowedAccountCodes = new Set(accountingAccountsData.map((entry) => entry.code));
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
    const expenseCategoriesData: Array<{
      ref: string;
      code: string;
      name: string;
      description?: string;
      defaultCostCenterRef?: string;
      metadata?: Record<string, unknown>;
    }> = [
      {
        ref: 'SERVICIO_AGUA',
        code: 'SERV_AGUA',
        name: 'Agua y alcantarillado',
        description: 'Consumo de agua potable, alcantarillado y derechos sanitarios.',
        defaultCostCenterRef: 'OPERACIONES_PARRAL',
        metadata: { group: 'Servicios básicos', examples: ['Essbio', 'Aguas Andinas', 'SMAPA'] },
      },
      {
        ref: 'SERVICIO_ELECTRICIDAD',
        code: 'SERV_LUZ',
        name: 'Electricidad',
        description: 'Facturas eléctricas, cargos fijos y potencia contratada.',
        defaultCostCenterRef: 'OPERACIONES_PARRAL',
        metadata: { group: 'Servicios básicos', examples: ['Enel', 'CGE', 'SAESA'] },
      },
      {
        ref: 'SERVICIO_INTERNET',
        code: 'SERV_INTERNET',
        name: 'Internet y telecomunicaciones',
        description: 'Servicios de internet, telefonía IP y planes móviles corporativos.',
        defaultCostCenterRef: 'OPERACIONES_PARRAL',
        metadata: { group: 'Servicios básicos', examples: ['Movistar', 'Entel', 'Claro Empresas'] },
      },
      {
        ref: 'SERVICIO_BASICOS_OTROS',
        code: 'SERV_BAS_OTH',
        name: 'Servicios básicos complementarios',
        description: 'Gas, calefacción y otros suministros esenciales no clasificados.',
        defaultCostCenterRef: 'OPERACIONES_PARRAL',
        metadata: { group: 'Servicios básicos', examples: ['Gasco', 'Abastible', 'Lipigas'] },
      },
      {
        ref: 'SUELDOS_REMUNERACIONES',
        code: 'RRHH_SUELDOS',
        name: 'Pago de remuneraciones',
        description: 'Nómina, jornales y honorarios del personal interno.',
        defaultCostCenterRef: 'OPERACIONES_PARRAL',
        metadata: {
          group: 'Personal',
          examples: ['Pago mensual', 'Liquidaciones'],
          locked: true,
          payroll: { type: 'salary' },
        },
      },
      {
        ref: 'SUELDOS_ADELANTOS',
        code: 'RRHH_ADELANTO',
        name: 'Adelantos de sueldos',
        description: 'Adelantos extraordinarios o préstamos a colaboradores.',
        defaultCostCenterRef: 'OPERACIONES_PARRAL',
        metadata: {
          group: 'Personal',
          examples: ['Adelanto quincenal', 'Préstamo interno'],
          locked: true,
          payroll: { type: 'advance' },
        },
      },
      {
        ref: 'SUELDOS_BENEFICIOS',
        code: 'RRHH_BENEF',
        name: 'Beneficios y viáticos',
        description: 'Viáticos, colaciones, movilización y otros beneficios al personal.',
        defaultCostCenterRef: 'OPERACIONES_PARRAL',
        metadata: { group: 'Personal', examples: ['Viáticos', 'Giftcards', 'Caja de mercadería'] },
      },
      {
        ref: 'SERVICIOS_CONTRATADOS',
        code: 'SERV_EXTERNOS',
        name: 'Servicios profesionales externos',
        description: 'Asesorías contables, legales, TI y outsourcing de procesos.',
        defaultCostCenterRef: 'OPERACIONES_PARRAL',
        metadata: { group: 'Servicios externos', examples: ['Contador', 'Abogado', 'Consultor TI'] },
      },
      {
        ref: 'MANTENCION_LOCAL',
        code: 'MANT_LOCAL',
        name: 'Mantención y reparaciones del local',
        description: 'Reparaciones menores, ambientación y mejoras del espacio físico.',
        defaultCostCenterRef: 'OPERACIONES_PARRAL',
        metadata: { group: 'Infraestructura', examples: ['Pintura', 'Carpintería', 'Ambientación'] },
      },
      {
        ref: 'SERVICIOS_LIMPIEZA_SEGURIDAD',
        code: 'SERV_LIMPIEZA',
        name: 'Limpieza y seguridad',
        description: 'Servicios periódicos de aseo, sanitización y vigilancia.',
        defaultCostCenterRef: 'OPERACIONES_PARRAL',
        metadata: { group: 'Infraestructura', examples: ['Empresas de aseo', 'Guardias'] },
      },
      {
        ref: 'LICENCIAS_SOFTWARE',
        code: 'TI_SOFTWARE',
        name: 'Licencias y software',
        description: 'Suscripciones de software y licencias empresariales.',
        defaultCostCenterRef: 'OPERACIONES_ONLINE',
        metadata: { group: 'Tecnología', examples: ['Microsoft 365', 'Antivirus', 'ERP'] },
      },
      {
        ref: 'SERVICIOS_CLOUD',
        code: 'TI_CLOUD',
        name: 'Servicios cloud y SaaS',
        description: 'Infraestructura cloud, hosting, almacenamiento y SaaS.',
        defaultCostCenterRef: 'OPERACIONES_ONLINE',
        metadata: { group: 'Tecnología', examples: ['AWS', 'Vercel', 'Google Workspace'] },
      },
      {
        ref: 'PUBLICIDAD_DIGITAL',
        code: 'MKT_DIGITAL',
        name: 'Marketing digital',
        description: 'Publicidad en redes sociales, campañas online y posicionamiento SEO.',
        defaultCostCenterRef: 'OPERACIONES_ONLINE',
        metadata: { group: 'Marketing', examples: ['Meta Ads', 'Google Ads', 'Email marketing'] },
      },
      {
        ref: 'PUBLICIDAD_TRADICIONAL',
        code: 'MKT_TRADIC',
        name: 'Marketing offline y eventos',
        description: 'Ferias, activaciones, impresos y material POP.',
        defaultCostCenterRef: 'OPERACIONES_PARRAL',
        metadata: { group: 'Marketing', examples: ['Eventos', 'Radio', 'Gigantografías'] },
      },
      {
        ref: 'LOGISTICA_DESPACHO',
        code: 'LOG_DESPACHO',
        name: 'Transporte y logística',
        description: 'Despachos, encomiendas, fletes y transporte de mercadería.',
        defaultCostCenterRef: 'OPERACIONES_ONLINE',
        metadata: { group: 'Operaciones', examples: ['Chilexpress', 'Transportes locales'] },
      },
      {
        ref: 'SUMINISTROS_OFICINA',
        code: 'OFI_SUMINISTROS',
        name: 'Suministros y papelería',
        description: 'Artículos de oficina, insumos de punto de venta y embalajes.',
        defaultCostCenterRef: 'OPERACIONES_PARRAL',
        metadata: { group: 'Operaciones', examples: ['Papelería', 'Tóner', 'Bolsas'] },
      },
      {
        ref: 'CAPACITACION_PERSONAL',
        code: 'RRHH_CAPAC',
        name: 'Capacitación y desarrollo',
        description: 'Cursos, certificaciones, talleres y actividades para el equipo.',
        defaultCostCenterRef: 'OPERACIONES_PARRAL',
        metadata: { group: 'Personal', examples: ['Cursos en línea', 'Workshops', 'Charlas'] },
      },
      {
        ref: 'SEGUROS_POLIZAS',
        code: 'ADM_SEGUROS',
        name: 'Seguros y pólizas',
        description: 'Seguros comerciales, de incendio, responsabilidad civil y equipos.',
        defaultCostCenterRef: 'OPERACIONES_PARRAL',
        metadata: { group: 'Administración', examples: ['Seguro local', 'Seguro equipos'] },
      },
    ];

    const expenseCategoryRefMap: Record<string, ExpenseCategory> = {};

    for (const entry of expenseCategoriesData) {
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
    const paymentOutExpenseCategoryRefs = [
      'SERVICIO_AGUA',
      'SERVICIO_ELECTRICIDAD',
      'SERVICIO_INTERNET',
      'SERVICIO_BASICOS_OTROS',
      'SUELDOS_REMUNERACIONES',
      'SUELDOS_ADELANTOS',
      'SUELDOS_BENEFICIOS',
      'SERVICIOS_CONTRATADOS',
      'MANTENCION_LOCAL',
      'SERVICIOS_LIMPIEZA_SEGURIDAD',
      'LICENCIAS_SOFTWARE',
      'SERVICIOS_CLOUD',
      'PUBLICIDAD_DIGITAL',
      'PUBLICIDAD_TRADICIONAL',
      'LOGISTICA_DESPACHO',
      'SUMINISTROS_OFICINA',
      'CAPACITACION_PERSONAL',
      'SEGUROS_POLIZAS',
    ];

    const accountingRulesData: Array<{
      appliesTo: RuleScope;
      transactionType: TransactionType;
      paymentMethod?: PaymentMethod;
      taxCode?: string;
      expenseCategoryRef?: string;
      debitAccountRef: string;
      creditAccountRef: string;
      priority: number;
      isActive: boolean;
    }> = [
      {
        appliesTo: RuleScope.TRANSACTION,
        transactionType: TransactionType.SALE,
        paymentMethod: PaymentMethod.CASH,
        debitAccountRef: 'CAJA_GENERAL',
        creditAccountRef: 'VENTAS_MERCADERIAS',
        priority: 1,
        isActive: true,
      },
      {
        appliesTo: RuleScope.TRANSACTION,
        transactionType: TransactionType.SALE,
        paymentMethod: PaymentMethod.CREDIT_CARD,
        debitAccountRef: 'INSTITUCIONES_FINANCIERAS',
        creditAccountRef: 'VENTAS_MERCADERIAS',
        priority: 2,
        isActive: true,
      },
      {
        appliesTo: RuleScope.TRANSACTION,
        transactionType: TransactionType.SALE,
        paymentMethod: PaymentMethod.DEBIT_CARD,
        debitAccountRef: 'INSTITUCIONES_FINANCIERAS',
        creditAccountRef: 'VENTAS_MERCADERIAS',
        priority: 3,
        isActive: true,
      },
      {
        appliesTo: RuleScope.TRANSACTION,
        transactionType: TransactionType.SALE,
        paymentMethod: PaymentMethod.TRANSFER,
        debitAccountRef: 'INSTITUCIONES_FINANCIERAS',
        creditAccountRef: 'VENTAS_MERCADERIAS',
        priority: 4,
        isActive: true,
      },
      {
        appliesTo: RuleScope.TRANSACTION_LINE,
        transactionType: TransactionType.SALE,
        taxCode: 'IVA-19',
        debitAccountRef: 'CAJA_GENERAL',
        creditAccountRef: 'IVA_DEBITO_FISCAL',
        priority: 10,
        isActive: true,
      },
      {
        appliesTo: RuleScope.TRANSACTION,
        transactionType: TransactionType.PURCHASE,
        paymentMethod: PaymentMethod.TRANSFER,
        debitAccountRef: 'EXISTENCIAS',
        creditAccountRef: 'INSTITUCIONES_FINANCIERAS',
        priority: 1,
        isActive: true,
      },
      {
        appliesTo: RuleScope.TRANSACTION_LINE,
        transactionType: TransactionType.PURCHASE,
        taxCode: 'IVA-19',
        debitAccountRef: 'IVA_CREDITO_FISCAL',
        creditAccountRef: 'EXISTENCIAS',
        priority: 15,
        isActive: true,
      },
      {
        appliesTo: RuleScope.TRANSACTION,
        transactionType: TransactionType.OPERATING_EXPENSE,
        paymentMethod: PaymentMethod.CASH,
        debitAccountRef: 'GASTOS_GENERALES',
        creditAccountRef: 'CAJA_GENERAL',
        priority: 5,
        isActive: true,
      },
      {
        appliesTo: RuleScope.TRANSACTION,
        transactionType: TransactionType.OPERATING_EXPENSE,
        paymentMethod: PaymentMethod.TRANSFER,
        debitAccountRef: 'GASTOS_GENERALES',
        creditAccountRef: 'INSTITUCIONES_FINANCIERAS',
        priority: 6,
        isActive: true,
      },
      {
        appliesTo: RuleScope.TRANSACTION,
        transactionType: TransactionType.OPERATING_EXPENSE,
        paymentMethod: PaymentMethod.DEBIT_CARD,
        debitAccountRef: 'GASTOS_GENERALES',
        creditAccountRef: 'INSTITUCIONES_FINANCIERAS',
        priority: 7,
        isActive: true,
      },
      {
        appliesTo: RuleScope.TRANSACTION,
        transactionType: TransactionType.OPERATING_EXPENSE,
        paymentMethod: PaymentMethod.CREDIT_CARD,
        debitAccountRef: 'GASTOS_GENERALES',
        creditAccountRef: 'INSTITUCIONES_FINANCIERAS',
        priority: 8,
        isActive: true,
      },
    ];

    paymentOutExpenseCategoryRefs.forEach((expenseCategoryRef, index) => {
      accountingRulesData.push({
        appliesTo: RuleScope.TRANSACTION,
        transactionType: TransactionType.PAYMENT_OUT,
        expenseCategoryRef,
        debitAccountRef: 'GASTOS_GENERALES',
        creditAccountRef: 'CAJA_GENERAL',
        priority: 20 + index,
        isActive: true,
      });
    });

    accountingRulesData.push(
      {
        appliesTo: RuleScope.TRANSACTION,
        transactionType: TransactionType.PAYMENT_IN,
        paymentMethod: PaymentMethod.CASH,
        debitAccountRef: 'CAJA_GENERAL',
        creditAccountRef: 'CAPITAL_PAGADO',
        priority: 40,
        isActive: true,
      },
      {
        appliesTo: RuleScope.TRANSACTION,
        transactionType: TransactionType.PAYMENT_IN,
        paymentMethod: PaymentMethod.TRANSFER,
        debitAccountRef: 'INSTITUCIONES_FINANCIERAS',
        creditAccountRef: 'CAPITAL_PAGADO',
        priority: 41,
        isActive: true,
      },
    );

    for (const ruleConfig of accountingRulesData) {
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
    
    // Eliminar categorías antiguas de supermercado
    await db.query("DELETE FROM categories WHERE code LIKE 'CAT-%'");
    
    const categoriesData = [
      { code: 'ANI', name: 'Anillos', description: 'Anillos de compromiso, alianzas y más', sortOrder: 1 },
      { code: 'COL', name: 'Collares', description: 'Collares y cadenas', sortOrder: 2 },
      { code: 'ARE', name: 'Aros', description: 'Aros y pendientes', sortOrder: 3 },
      { code: 'PUL', name: 'Pulseras', description: 'Pulseras y brazaletes', sortOrder: 4 },
      { code: 'REL', name: 'Relojes', description: 'Relojes de lujo', sortOrder: 5 },
      { code: 'CAD', name: 'Cadenas', description: 'Cadenas y collares finos', sortOrder: 6 },
      { code: 'SET', name: 'Sets', description: 'Conjuntos y sets de joyería', sortOrder: 7 },
      { code: 'ACC', name: 'Accesorios', description: 'Cajas, limpiadores y accesorios', sortOrder: 8 },
    ];
    
    const createdCategories: Record<string, Category> = {};
    
    for (const catData of categoriesData) {
      let category = await db.getRepository(Category).findOne({ where: { code: catData.code } });
      if (!category) {
        category = new Category();
        category.id = uuidv4();
        category.code = catData.code;
        category.name = catData.name;
        category.description = catData.description;
        category.sortOrder = catData.sortOrder;
        category.isActive = true;
        await db.getRepository(Category).save(category);
        console.log(`   ✓ Categoría creada: ${category.name}`);
      } else {
        console.log(`   ⚠ Categoría ya existe: ${category.name}`);
      }
      createdCategories[catData.code] = category;
    }

    // ============================================
    // 5. ATRIBUTOS PARA VARIANTES DE JOYERÍA
    // ============================================
    console.log('\n💍 Creando atributos para variantes...');
    
    const attributesData = [
      { 
        name: 'Material', 
        description: 'Metal o material de la joya',
        options: ['Oro 18K', 'Oro 14K', 'Oro Blanco', 'Oro Rosa', 'Plata 925', 'Platino', 'Acero'],
        displayOrder: 1 
      },
      { 
        name: 'Talla', 
        description: 'Talla de anillo',
        options: ['5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16'],
        displayOrder: 2 
      },
      { 
        name: 'Piedra', 
        description: 'Tipo de piedra preciosa',
        options: ['Diamante', 'Rubí', 'Esmeralda', 'Zafiro', 'Amatista', 'Topacio', 'Perla', 'Sin piedra'],
        displayOrder: 3 
      },
      { 
        name: 'Quilates', 
        description: 'Peso en quilates de la piedra',
        options: ['0.25ct', '0.50ct', '0.75ct', '1.00ct', '1.50ct', '2.00ct', 'N/A'],
        displayOrder: 4 
      },
      { 
        name: 'Largo', 
        description: 'Largo de cadenas y collares',
        options: ['40cm', '45cm', '50cm', '55cm', '60cm'],
        displayOrder: 5 
      },
    ];
    
    const createdAttributes: Record<string, Attribute> = {};
    
    for (const attrData of attributesData) {
      let attribute = await db.getRepository(Attribute).findOne({
        where: { name: attrData.name },
        withDeleted: true,
      });
      if (!attribute) {
        attribute = new Attribute();
        attribute.id = uuidv4();
        attribute.name = attrData.name;
        attribute.description = attrData.description;
        attribute.options = attrData.options;
        attribute.displayOrder = attrData.displayOrder;
        attribute.isActive = true;
        await db.getRepository(Attribute).save(attribute);
        console.log(`   ✓ Atributo creado: ${attribute.name} (${attribute.options.length} opciones)`);
      } else {
        attribute.description = attrData.description;
        attribute.options = attrData.options;
        attribute.displayOrder = attrData.displayOrder;
        attribute.isActive = true;
        attribute.deletedAt = undefined;
        await db.getRepository(Attribute).save(attribute);
        console.log(`   ⚠ Atributo ya existe: ${attribute.name}`);
      }
      createdAttributes[attrData.name] = attribute;
    }

    // ============================================
    // 6. LISTAS DE PRECIOS
    // ============================================
    console.log('\n📋 Configurando listas de precios...');

    const priceListRepo = db.getRepository(PriceList);
    const priceListsConfig = [
      {
        key: 'retail',
        name: 'Precio Público',
        type: PriceListType.RETAIL,
        priority: 0,
        isDefault: true,
        description: 'Lista de precios para venta al público en tienda',
      },
      {
        key: 'online',
        name: 'Venta Online',
        type: PriceListType.RETAIL,
        priority: 10,
        isDefault: false,
        description: 'Precios aplicados para el canal e-commerce',
      },
      {
        key: 'wholesale',
        name: 'Mayorista Joyero',
        type: PriceListType.WHOLESALE,
        priority: 20,
        isDefault: false,
        description: 'Precios preferenciales para joyerías asociadas',
      },
    ] as const;

    type PriceListKey = (typeof priceListsConfig)[number]['key'];

    const priceListsByKey: Record<PriceListKey, PriceList> = {} as Record<PriceListKey, PriceList>;

    for (const config of priceListsConfig) {
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
      list.currency = 'CLP';
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
    console.log('\n📦 Creando bodega...');
    
    let storage = await db.getRepository(Storage).findOne({ 
      where: { branchId: primaryBranch.id } 
    });
    if (!storage) {
      storage = new Storage();
      storage.id = uuidv4();
      storage.branchId = primaryBranch.id;
      storage.name = 'Vitrina Principal';
      storage.code = 'VIT-001';
      storage.type = StorageType.WAREHOUSE;
      storage.category = StorageCategory.IN_BRANCH;
      storage.isDefault = true;
      storage.isActive = true;
      await db.getRepository(Storage).save(storage);
      console.log(`   ✓ Bodega creada: ${storage.name}`);
    } else {
      console.log(`   ⚠ Bodega ya existe: ${storage.name}`);
    }

    // ============================================
    // 8. PUNTO DE VENTA
    // ============================================
    console.log('\n🖥️  Configurando puntos de venta...');

    const pointOfSaleRepo = db.getRepository(PointOfSale);
    const pointOfSaleSeeds: Array<{
      name: string;
      branchRef: keyof typeof branchesByRef;
      defaultPriceListKey: PriceListKey;
      deviceId?: string;
    }> = [
      {
        name: 'Caja Principal',
        branchRef: 'PARRAL',
        defaultPriceListKey: 'retail',
        deviceId: 'POS-PARRAL-MAIN-01',
      },
      {
        name: 'Caja Mayorista',
        branchRef: 'PARRAL',
        defaultPriceListKey: 'wholesale',
        deviceId: 'POS-PARRAL-WHS-01',
      },
    ];

    const pointsOfSale: PointOfSale[] = [];

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

      const prefix = isNewPOS ? '   ✓' : '   •';
      const action = isNewPOS ? 'Punto de venta creado' : 'Punto de venta actualizado';
      console.log(`${prefix} ${action}: ${savedPOS.name} → Lista por defecto ${defaultPriceList.name}`);
    }

    // ============================================
    // 9. USUARIO ADMINISTRADOR
    // ============================================
    console.log('\n👤 Creando usuario administrador...');
    
    let adminUser = await db.getRepository(User).findOne({ where: { userName: 'admin' } });
    
    if (!adminUser) {
      // Crear persona para el admin
      const adminPerson = new Person();
      adminPerson.id = uuidv4();
      adminPerson.type = PersonType.NATURAL;
      adminPerson.firstName = 'Administrador';
      adminPerson.lastName = 'Joyería';
      adminPerson.documentType = DocumentType.RUN;
      adminPerson.documentNumber = '11111111-1';
      adminPerson.email = 'admin@joyeriabrillante.cl';
      adminPerson.phone = '+56 9 0000 0000';
      await db.getRepository(Person).save(adminPerson);
      
      // Crear usuario admin
      adminUser = new User();
      adminUser.id = uuidv4();
      adminUser.userName = 'admin';
      adminUser.pass = hashPassword('890890');
      adminUser.mail = 'admin@joyeriabrillante.cl';
      adminUser.rol = UserRole.ADMIN;
      adminUser.person = adminPerson;
      await db.getRepository(User).save(adminUser);
      
      console.log(`   ✓ Usuario creado: ${adminUser.userName}`);
    } else {
      // Actualizar contraseña por si cambió
      adminUser.pass = hashPassword('890890');
      await db.getRepository(User).save(adminUser);
      console.log(`   ✓ Usuario actualizado: ${adminUser.userName} (contraseña: 890890)`);
    }

    // ============================================
    // 9.1 CAPITAL INICIAL
    // ============================================
    console.log('\n🏦 Registrando capital inicial...');
    try {
      const existingInitialCapital = await transactionRepo.findOne({
        where: {
          documentNumber: INITIAL_CAPITAL_DOCUMENT,
          transactionType: TransactionType.PAYMENT_IN,
        },
      });

      if (existingInitialCapital) {
        console.log(`   ⚠ Capital inicial ya existe: ${INITIAL_CAPITAL_DOCUMENT}`);
      } else if (!primaryBankAccount?.accountKey) {
        console.log('   ⚠ No se pudo registrar capital inicial: falta cuenta bancaria principal.');
      } else {
        const capitalTransaction = transactionRepo.create({
          documentNumber: INITIAL_CAPITAL_DOCUMENT,
          transactionType: TransactionType.PAYMENT_IN,
          status: TransactionStatus.CONFIRMED,
          branchId: primaryBranch.id,
          pointOfSaleId: pointsOfSale[0]?.id ?? null,
          userId: adminUser.id,
          subtotal: INITIAL_CAPITAL_AMOUNT,
          taxAmount: 0,
          discountAmount: 0,
          total: INITIAL_CAPITAL_AMOUNT,
          paymentMethod: PaymentMethod.TRANSFER,
          bankAccountKey: primaryBankAccount.accountKey,
          amountPaid: INITIAL_CAPITAL_AMOUNT,
          changeAmount: 0,
          notes: 'Capital inicial de la empresa',
          metadata: {
            source: 'seed-flowstore',
            capitalContribution: true,
            initialCapital: true,
            occurredOn: '2025-01-01',
          },
        });

        await transactionRepo.save(capitalTransaction);
        console.log(`   ✓ Capital inicial registrado: ${INITIAL_CAPITAL_DOCUMENT} por ${formatCLP(INITIAL_CAPITAL_AMOUNT)}`);
      }
    } catch (initialCapitalError) {
      console.log('   ⚠ No se pudo registrar capital inicial:', initialCapitalError instanceof Error ? initialCapitalError.message : initialCapitalError);
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

    type UnitSeed = {
      name: string;
      symbol: string;
      dimension: UnitDimension;
      conversionFactor: number;
      isBase: boolean;
      baseSymbol: string;
    };

    const unitSeeds: UnitSeed[] = [
      {
        name: 'Unidad',
        symbol: 'un',
        dimension: UnitDimension.COUNT,
        conversionFactor: 1,
        isBase: true,
        baseSymbol: 'un',
      },
      {
        name: 'Caja',
        symbol: 'cj',
        dimension: UnitDimension.COUNT,
        conversionFactor: 12,
        isBase: false,
        baseSymbol: 'un',
      },
      {
        name: 'Kilogramo',
        symbol: 'kg',
        dimension: UnitDimension.MASS,
        conversionFactor: 1,
        isBase: true,
        baseSymbol: 'kg',
      },
      {
        name: 'Gramo',
        symbol: 'g',
        dimension: UnitDimension.MASS,
        conversionFactor: 0.001,
        isBase: false,
        baseSymbol: 'kg',
      },
    ];

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

    type VariantSeed = {
      sku: string;
      baseCost?: number;
      attributeValues?: Record<string, string>;
      priceEntries: Array<{
        listKey: PriceListKey;
        grossPrice: number;
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
      categoryCode: keyof typeof createdCategories;
      variants: VariantSeed[];
    };

    const normalizeSeedWeightUnit = (unit?: VariantSeed['weightUnit']): 'kg' | 'g' => {
      if (!unit) {
        return 'kg';
      }

      return unit === 'g' ? 'g' : 'kg';
    };

    const productsData: ProductSeed[] = [
      {
        name: 'Anillo Solitario Clásico',
        description: 'Elegante anillo solitario con diamante central',
        brand: 'Brillante',
        categoryCode: 'ANI',
        variants: [
          {
            sku: 'ANI-SOL-ORO18-T6',
            baseCost: 950000,
            attributeValues: {
              Material: 'Oro 18K',
              Talla: '6',
              Piedra: 'Diamante',
              Quilates: '1.00ct',
            },
            weight: 6.4,
            weightUnit: 'g',
            priceEntries: [
              { listKey: 'retail', grossPrice: 1_890_000, taxCodes: ['IVA-19'] },
              { listKey: 'online', grossPrice: 1_849_000, taxCodes: ['IVA-19'] },
              { listKey: 'wholesale', grossPrice: 1_720_000, taxCodes: ['IVA-19'] },
            ],
          },
          {
            sku: 'ANI-SOL-ORO18-T7',
            baseCost: 900000,
            attributeValues: {
              Material: 'Oro 18K',
              Talla: '7',
              Piedra: 'Diamante',
              Quilates: '0.75ct',
            },
            weight: 6.1,
            weightUnit: 'g',
            priceEntries: [
              { listKey: 'retail', grossPrice: 1_790_000, taxCodes: ['IVA-19'] },
              { listKey: 'online', grossPrice: 1_750_000, taxCodes: ['IVA-19'] },
              { listKey: 'wholesale', grossPrice: 1_630_000, taxCodes: ['IVA-19'] },
            ],
          },
        ],
      },
      {
        name: 'Collar Cadena Veneciana',
        description: 'Delicada cadena veneciana en oro',
        brand: 'Brillante',
        categoryCode: 'COL',
        variants: [
          {
            sku: 'COL-VEN-ORO14-45',
            baseCost: 220000,
            attributeValues: {
              Material: 'Oro 14K',
              Largo: '45cm',
            },
            weight: 12.5,
            weightUnit: 'g',
            priceEntries: [
              { listKey: 'retail', grossPrice: 450000, taxCodes: ['IVA-19'] },
              { listKey: 'online', grossPrice: 439000, taxCodes: ['IVA-19'] },
              { listKey: 'wholesale', grossPrice: 398000, taxCodes: ['IVA-19'] },
            ],
          },
          {
            sku: 'COL-VEN-ORO14-50',
            baseCost: 235000,
            attributeValues: {
              Material: 'Oro 14K',
              Largo: '50cm',
            },
            weight: 13.2,
            weightUnit: 'g',
            priceEntries: [
              { listKey: 'retail', grossPrice: 475000, taxCodes: ['IVA-19'] },
              { listKey: 'online', grossPrice: 462000, taxCodes: ['IVA-19'] },
              { listKey: 'wholesale', grossPrice: 418000, taxCodes: ['IVA-19'] },
            ],
          },
          {
            sku: 'COL-VEN-PLATA-50',
            baseCost: 110000,
            attributeValues: {
              Material: 'Plata 925',
              Largo: '50cm',
            },
            weight: 9.8,
            weightUnit: 'g',
            priceEntries: [
              { listKey: 'retail', grossPrice: 189000, taxCodes: ['IVA-19'] },
              { listKey: 'online', grossPrice: 179000, taxCodes: ['IVA-19'] },
            ],
          },
        ],
      },
      {
        name: 'Aros Perla Cultivada',
        description: 'Aros clásicos con perla cultivada',
        brand: 'Brillante',
        categoryCode: 'ARE',
        variants: [
          {
            sku: 'ARE-PER-PLATA',
            baseCost: 85000,
            attributeValues: {
              Material: 'Plata 925',
              Piedra: 'Perla',
              Quilates: 'N/A',
            },
            weight: 3.2,
            weightUnit: 'g',
            priceEntries: [
              { listKey: 'retail', grossPrice: 180000, taxCodes: ['IVA-19'] },
              { listKey: 'online', grossPrice: 169000, taxCodes: ['IVA-19'] },
            ],
          },
          {
            sku: 'ARE-PER-ORO18',
            baseCost: 125000,
            attributeValues: {
              Material: 'Oro 18K',
              Piedra: 'Perla',
              Quilates: 'N/A',
            },
            weight: 3.5,
            weightUnit: 'g',
            priceEntries: [
              { listKey: 'retail', grossPrice: 245000, taxCodes: ['IVA-19'] },
              { listKey: 'online', grossPrice: 235000, taxCodes: ['IVA-19'] },
              { listKey: 'wholesale', grossPrice: 210000, taxCodes: ['IVA-19'] },
            ],
          },
        ],
      },
    ];

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
        const attribute = createdAttributes[attributeName];
        if (!attribute || !optionValue) {
          continue;
        }
        mapped[attribute.id] = optionValue;
        hasAtLeastOne = true;
      }

      return hasAtLeastOne ? mapped : undefined;
    };

    const defaultVatTax = taxesByCode['IVA-19'];

    for (const productSeed of productsData) {
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

      const category = createdCategories[productSeed.categoryCode];
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
    const totalVariantsSeeded = productsData.reduce((acc, product) => acc + product.variants.length, 0);
    const priceListsSummary = Object.values(priceListsByKey)
      .map((list) => list.name)
      .join(', ');

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
    console.log(`   • Plan de cuentas: ${accountingAccountsData.length} cuentas activas`);
    console.log(`   • Categorías de gasto: ${expenseCategoriesData.length} categorías`);
    console.log(`   • Reglas contables: ${accountingRulesData.length} reglas automáticas`);
    console.log(`   • Centros de costo: ${costCentersData.length} activos`);
    console.log(`   • Unidades organizativas: ${organizationalUnitsData.length} activas`);
    console.log(`   • Categorías: ${categoriesData.length} categorías de joyería`);
    console.log(`   • Atributos: ${attributesData.length} atributos para variantes`);
    console.log(`   • Productos: ${productsData.length} productos de ejemplo (${totalVariantsSeeded} variantes)`);
    console.log(`   • Listas de precios: ${Object.values(priceListsByKey).length} (${priceListsSummary})`);
    console.log(`   • Bodega: ${storage.name}`);
    const pointOfSaleSummary = pointsOfSale.map((pos) => {
      const listName = Object.values(priceListsByKey).find((list) => list.id === pos.defaultPriceListId)?.name ?? 'Sin lista';
      return `${pos.name} → ${listName}`;
    });
    console.log(`   • Puntos de venta: ${pointsOfSale.length} (${pointOfSaleSummary.join(', ')})`);
    console.log(`   • Capital inicial: ${INITIAL_CAPITAL_DOCUMENT} por ${formatCLP(INITIAL_CAPITAL_AMOUNT)}`);
    console.log('\n🔑 Credenciales de acceso:');
    console.log('   Usuario: admin');
    console.log('   Contraseña: 890890');
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
