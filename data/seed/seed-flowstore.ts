import { getDb } from '../db';
import { User, UserRole } from '../entities/User';
import { Person, PersonType } from '../entities/Person';
import { Company } from '../entities/Company';
import { Branch } from '../entities/Branch';
import { Tax, TaxType } from '../entities/Tax';
import { Category } from '../entities/Category';
import { PriceList, PriceListType } from '../entities/PriceList';
import { Storage, StorageType } from '../entities/Storage';
import { PointOfSale } from '../entities/PointOfSale';
import { Permission, Ability, ALL_ABILITIES } from '../entities/Permission';
import { Attribute } from '../entities/Attribute';
import { Product, ProductType } from '../entities/Product';
import { ProductVariant } from '../entities/ProductVariant';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

// Helper para hashear contraseñas (debe coincidir con auth.server.ts)
function hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
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
      { code: 'DIJ', name: 'Dijes', description: 'Dijes y colgantes', sortOrder: 6 },
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
      let attribute = await db.getRepository(Attribute).findOne({ where: { name: attrData.name } });
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
        console.log(`   ⚠ Atributo ya existe: ${attribute.name}`);
      }
      createdAttributes[attrData.name] = attribute;
    }

    // ============================================
    // 6. LISTA DE PRECIOS POR DEFECTO
    // ============================================
    console.log('\n📋 Creando lista de precios...');
    
    let priceList = await db.getRepository(PriceList).findOne({ where: { isDefault: true } });
    if (!priceList) {
      priceList = new PriceList();
      priceList.id = uuidv4();
      priceList.name = 'Precio Público';
      priceList.priceListType = PriceListType.RETAIL;
      priceList.currency = 'CLP';
      priceList.priority = 0;
      priceList.isDefault = true;
      priceList.isActive = true;
      priceList.description = 'Lista de precios para venta al público';
      await db.getRepository(PriceList).save(priceList);
      console.log(`   ✓ Lista de precios creada: ${priceList.name}`);
    } else {
      console.log(`   ⚠ Lista de precios ya existe: ${priceList.name}`);
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
    // 11. PRODUCTOS DE EJEMPLO (JOYERÍA)
    // ============================================
    console.log('\n💎 Creando productos de ejemplo...');
    
    const productsData = [
      {
        name: 'Anillo Solitario Clásico',
        description: 'Elegante anillo solitario con diamante central',
        brand: 'Brillante',
        categoryCode: 'ANI',
        sku: 'ANI-SOL-001',
        basePrice: 1890000,
        baseCost: 950000,
      },
      {
        name: 'Collar Cadena Veneciana',
        description: 'Delicada cadena veneciana en oro',
        brand: 'Brillante',
        categoryCode: 'COL',
        sku: 'COL-VEN-001',
        basePrice: 450000,
        baseCost: 220000,
      },
      {
        name: 'Aros Perla Cultivada',
        description: 'Aros clásicos con perla cultivada',
        brand: 'Brillante',
        categoryCode: 'ARE',
        sku: 'ARE-PER-001',
        basePrice: 180000,
        baseCost: 85000,
      },
      {
        name: 'Pulsera Tenis Diamantes',
        description: 'Elegante pulsera tenis con diamantes',
        brand: 'Brillante',
        categoryCode: 'PUL',
        sku: 'PUL-TEN-001',
        basePrice: 2500000,
        baseCost: 1200000,
      },
      {
        name: 'Alianza Matrimonial',
        description: 'Alianza clásica para matrimonio',
        brand: 'Brillante',
        categoryCode: 'ANI',
        sku: 'ANI-ALI-001',
        basePrice: 350000,
        baseCost: 170000,
      },
    ];

    for (const prodData of productsData) {
      let product = await db.getRepository(Product).findOne({ 
        where: { name: prodData.name } 
      });
      
      if (!product) {
        const category = createdCategories[prodData.categoryCode];
        
        product = new Product();
        product.id = uuidv4();
        product.name = prodData.name;
        product.description = prodData.description;
        product.brand = prodData.brand;
        product.categoryId = category?.id;
        product.productType = ProductType.PHYSICAL;
        product.isActive = true;
        await db.getRepository(Product).save(product);
        
        // Crear variante default
        const variant = new ProductVariant();
        variant.id = uuidv4();
        variant.productId = product.id;
        variant.sku = prodData.sku;
        variant.basePrice = prodData.basePrice;
        variant.baseCost = prodData.baseCost;
        variant.unitOfMeasure = 'UN';
        variant.isDefault = true;
        variant.isActive = true;
        variant.trackInventory = true;
        variant.allowNegativeStock = false;
        await db.getRepository(ProductVariant).save(variant);
        
        console.log(`   ✓ Producto creado: ${product.name} ($${prodData.basePrice.toLocaleString()})`);
      } else {
        console.log(`   ⚠ Producto ya existe: ${product.name}`);
      }
    }

    // ============================================
    // RESUMEN
    // ============================================
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ Seed completado exitosamente!');
    console.log('───────────────────────────────────────────────────────────');
    console.log('\n📊 Resumen de datos:');
    console.log(`   • Empresa: ${company.name}`);
    console.log(`   • Sucursal: ${branch.name}`);
    console.log(`   • Impuestos: IVA 19%, Exento`);
    console.log(`   • Categorías: ${categoriesData.length} categorías de joyería`);
    console.log(`   • Atributos: ${attributesData.length} atributos para variantes`);
    console.log(`   • Productos: ${productsData.length} productos de ejemplo`);
    console.log(`   • Lista de precios: ${priceList.name}`);
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
