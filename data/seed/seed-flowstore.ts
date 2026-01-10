import { getDb } from '../db';
import { User, UserRole } from '../entities/User';
import { Person, PersonType } from '../entities/Person';
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
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { IsNull } from 'typeorm';
import { computePriceWithTaxes } from '../../lib/pricing/priceCalculations';

// Helper para hashear contraseñas (debe coincidir con authOptions.ts)
function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 12);
}

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

  try {
    // ============================================
    // 1. EMPRESA - JOYERÍA
    // ============================================
    console.log('\n🏢 Creando empresa...');
    
    let company = await db.getRepository(Company).findOne({ where: { name: 'Joyería Brillante' } });
    
    if (!company) {
      // Buscar cualquier empresa existente para actualizar
      const companies = await db.getRepository(Company).find({ take: 1 });
      if (companies.length > 0) {
        company = companies[0];
        company.name = 'Joyería Brillante';
        company.defaultCurrency = 'CLP';
        company.isActive = true;
        company.settings = {
          allowNegativeStock: false,
          requireCustomerForSale: false,
          defaultPaymentMethod: 'CASH',
        };
        await db.getRepository(Company).save(company);
        console.log(`   ✓ Empresa actualizada: ${company.name}`);
      } else {
        company = new Company();
        company.id = uuidv4();
        company.name = 'Joyería Brillante';
        company.defaultCurrency = 'CLP';
        company.isActive = true;
        company.settings = {
          allowNegativeStock: false,
          requireCustomerForSale: false,
          defaultPaymentMethod: 'CASH',
        };
        company = await db.getRepository(Company).save(company);
        console.log(`   ✓ Empresa creada: ${company.name}`);
      }
    } else {
      console.log(`   ⚠ Empresa ya existe: ${company.name}`);
    }

    // ============================================
    // 2. SUCURSAL PRINCIPAL
    // ============================================
    console.log('\n🏬 Creando sucursal principal...');
    
    let branch = await db.getRepository(Branch).findOne({ 
      where: { companyId: company.id } 
    });
    
    if (!branch) {
      branch = new Branch();
      branch.id = uuidv4();
      branch.companyId = company.id;
      branch.name = 'Local Mall Plaza';
      branch.address = 'Mall Plaza Vespucio, Local 234';
      branch.phone = '+56 9 8765 4321';
      branch.location = { lat: -33.5206, lng: -70.6025 }; // Mall Plaza Vespucio
      branch.isActive = true;
      branch.isHeadquarters = true;
      branch = await db.getRepository(Branch).save(branch);
      console.log(`   ✓ Sucursal creada: ${branch.name}`);
    } else {
      console.log(`   ⚠ Sucursal ya existe: ${branch.name}`);
    }

    // ============================================
    // 3. IMPUESTOS
    // ============================================
    console.log('\n💰 Creando impuestos...');
    
    // IVA 19%
    let ivaDefault = await db.getRepository(Tax).findOne({ where: { code: 'IVA-19' } });
    if (!ivaDefault) {
      ivaDefault = new Tax();
      ivaDefault.id = uuidv4();
      ivaDefault.companyId = company.id;
      ivaDefault.name = 'IVA 19%';
      ivaDefault.code = 'IVA-19';
      ivaDefault.taxType = TaxType.IVA;
      ivaDefault.rate = 19;
      ivaDefault.description = 'Impuesto al Valor Agregado estándar';
      ivaDefault.isDefault = true;
      ivaDefault.isActive = true;
      await db.getRepository(Tax).save(ivaDefault);
      console.log(`   ✓ Impuesto creado: ${ivaDefault.name}`);
    } else {
      console.log(`   ⚠ Impuesto ya existe: ${ivaDefault.name}`);
    }
    
    // Exento
    let taxExempt = await db.getRepository(Tax).findOne({ where: { code: 'EXENTO' } });
    if (!taxExempt) {
      taxExempt = new Tax();
      taxExempt.id = uuidv4();
      taxExempt.companyId = company.id;
      taxExempt.name = 'Exento';
      taxExempt.code = 'EXENTO';
      taxExempt.taxType = TaxType.EXEMPT;
      taxExempt.rate = 0;
      taxExempt.description = 'Producto exento de impuestos';
      taxExempt.isDefault = false;
      taxExempt.isActive = true;
      await db.getRepository(Tax).save(taxExempt);
      console.log(`   ✓ Impuesto creado: ${taxExempt.name}`);
    } else {
      console.log(`   ⚠ Impuesto ya existe: ${taxExempt.name}`);
    }

    const taxesByCode: Record<string, Tax> = {};
    if (ivaDefault) {
      taxesByCode[ivaDefault.code] = ivaDefault;
    }
    if (taxExempt) {
      taxesByCode[taxExempt.code] = taxExempt;
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

    const priceListsByKey: Record<string, PriceList> = {};

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
      where: { branchId: branch.id } 
    });
    if (!storage) {
      storage = new Storage();
      storage.id = uuidv4();
      storage.branchId = branch.id;
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
    console.log('\n🖥️  Creando punto de venta...');
    
    let pointOfSale = await db.getRepository(PointOfSale).findOne({ 
      where: { branchId: branch.id } 
    });
    if (!pointOfSale) {
      pointOfSale = new PointOfSale();
      pointOfSale.id = uuidv4();
      pointOfSale.branchId = branch.id;
      pointOfSale.name = 'Caja Principal';
      pointOfSale.isActive = true;
      await db.getRepository(PointOfSale).save(pointOfSale);
      console.log(`   ✓ Punto de venta creado: ${pointOfSale.name}`);
    } else {
      console.log(`   ⚠ Punto de venta ya existe: ${pointOfSale.name}`);
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

    type PriceListKey = (typeof priceListsConfig)[number]['key'];

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
    };

    type ProductSeed = {
      name: string;
      description?: string;
      brand?: string;
      categoryCode: keyof typeof createdCategories;
      variants: VariantSeed[];
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
      product.taxIds = ivaDefault ? [ivaDefault.id] : undefined;
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
    console.log(`   • Sucursal: ${branch.name}`);
    console.log(`   • Impuestos: IVA 19%, Exento`);
    console.log(`   • Categorías: ${categoriesData.length} categorías de joyería`);
    console.log(`   • Atributos: ${attributesData.length} atributos para variantes`);
    console.log(`   • Productos: ${productsData.length} productos de ejemplo (${totalVariantsSeeded} variantes)`);
    console.log(`   • Listas de precios: ${Object.values(priceListsByKey).length} (${priceListsSummary})`);
    console.log(`   • Bodega: ${storage.name}`);
    console.log(`   • Punto de venta: ${pointOfSale.name}`);
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
