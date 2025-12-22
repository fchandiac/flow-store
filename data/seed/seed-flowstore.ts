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
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

// Helper para hashear contraseñas (debe coincidir con auth.server.ts)
function hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Seed mínimo para inicializar FlowStore
 * Crea los datos básicos necesarios para comenzar a usar el sistema:
 * - Empresa y sucursal principal
 * - Impuestos (IVA 19% y Exento)
 * - Categorías básicas
 * - Lista de precios por defecto
 * - Bodega principal
 * - Punto de venta
 * - Usuario administrador
 * 
 * Uso: npm run seed:flowstore
 */
async function seedFlowStore() {
  const db = await getDb();

  console.log('\n🏪 FlowStore - Seed Inicial');
  console.log('═══════════════════════════════════════════════════════════');

  // Limpiar permisos con ability vacío o nulo (datos corruptos)
  console.log('\n🧹 Limpiando datos corruptos en permisos...');
  try {
    await db.query("DELETE FROM permissions WHERE ability IS NULL OR ability = ''");
    console.log('   ✓ Datos corruptos limpiados');
  } catch (cleanError) {
    console.log('   ⚠ No se pudieron limpiar datos (tabla puede no existir aún)');
  }

  // No usamos synchronize() aquí porque puede causar conflictos con índices
  // La tabla permissions ya debe existir (creada manualmente o por migrations)
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
    // 1. EMPRESA
    // ============================================
    console.log('\n🏢 Creando empresa...');
    
    let company = await db.getRepository(Company).findOne({ where: { name: 'FlowStore Demo' } });
    
    if (!company) {
      company = new Company();
      company.id = uuidv4();
      company.name = 'FlowStore Demo';
      company.defaultCurrency = 'CLP';
      company.isActive = true;
      company.settings = {
        allowNegativeStock: false,
        requireCustomerForSale: false,
        defaultPaymentMethod: 'CASH',
      };
      company = await db.getRepository(Company).save(company);
      console.log(`   ✓ Empresa creada: ${company.name}`);
    } else {
      console.log(`   ⚠ Empresa ya existe: ${company.name}`);
    }

    // ============================================
    // 2. SUCURSAL PRINCIPAL
    // ============================================
    console.log('\n🏬 Creando sucursal principal...');
    
    let branch = await db.getRepository(Branch).findOne({ 
      where: { companyId: company.id, code: 'SUC-001' } 
    });
    
    if (!branch) {
      branch = new Branch();
      branch.id = uuidv4();
      branch.companyId = company.id;
      branch.name = 'Sucursal Principal';
      branch.code = 'SUC-001';
      branch.address = 'Av. Principal 123';
      branch.phone = '+56 9 1234 5678';
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
    // 4. CATEGORÍAS BÁSICAS
    // ============================================
    console.log('\n📁 Creando categorías...');
    
    const categoriesData = [
      { code: 'CAT-GENERAL', name: 'General', description: 'Productos generales', sortOrder: 0 },
      { code: 'CAT-ALIMENTOS', name: 'Alimentos', description: 'Productos alimenticios', sortOrder: 1 },
      { code: 'CAT-BEBIDAS', name: 'Bebidas', description: 'Bebidas y líquidos', sortOrder: 2 },
      { code: 'CAT-LIMPIEZA', name: 'Limpieza', description: 'Productos de limpieza', sortOrder: 3 },
      { code: 'CAT-OTROS', name: 'Otros', description: 'Otros productos', sortOrder: 99 },
    ];
    
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
    }

    // ============================================
    // 5. LISTA DE PRECIOS POR DEFECTO
    // ============================================
    console.log('\n📋 Creando lista de precios...');
    
    let priceList = await db.getRepository(PriceList).findOne({ where: { name: 'Precio Público', isDefault: true } });
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
    // 6. BODEGA PRINCIPAL
    // ============================================
    console.log('\n📦 Creando bodega...');
    
    let storage = await db.getRepository(Storage).findOne({ 
      where: { branchId: branch.id, code: 'BOD-001' } 
    });
    if (!storage) {
      storage = new Storage();
      storage.id = uuidv4();
      storage.branchId = branch.id;
      storage.name = 'Bodega Principal';
      storage.code = 'BOD-001';
      storage.type = StorageType.WAREHOUSE;
      storage.isDefault = true;
      storage.isActive = true;
      await db.getRepository(Storage).save(storage);
      console.log(`   ✓ Bodega creada: ${storage.name}`);
    } else {
      console.log(`   ⚠ Bodega ya existe: ${storage.name}`);
    }

    // ============================================
    // 7. PUNTO DE VENTA
    // ============================================
    console.log('\n🖥️  Creando punto de venta...');
    
    let pointOfSale = await db.getRepository(PointOfSale).findOne({ 
      where: { branchId: branch.id, name: 'Caja 1' } 
    });
    if (!pointOfSale) {
      pointOfSale = new PointOfSale();
      pointOfSale.id = uuidv4();
      pointOfSale.branchId = branch.id;
      pointOfSale.name = 'Caja 1';
      pointOfSale.isActive = true;
      await db.getRepository(PointOfSale).save(pointOfSale);
      console.log(`   ✓ Punto de venta creado: ${pointOfSale.name}`);
    } else {
      console.log(`   ⚠ Punto de venta ya existe: ${pointOfSale.name}`);
    }

    // ============================================
    // 8. USUARIO ADMINISTRADOR
    // ============================================
    console.log('\n👤 Creando usuario administrador...');
    
    let adminUser = await db.getRepository(User).findOne({ where: { userName: 'admin' } });
    
    if (!adminUser) {
      // Crear persona para el admin
      const adminPerson = new Person();
      adminPerson.id = uuidv4();
      adminPerson.type = PersonType.NATURAL;
      adminPerson.firstName = 'Administrador';
      adminPerson.lastName = 'Sistema';
      adminPerson.documentNumber = '11111111-1';
      adminPerson.email = 'admin@flowstore.local';
      adminPerson.phone = '+56 9 0000 0000';
      await db.getRepository(Person).save(adminPerson);
      
      // Crear usuario admin
      adminUser = new User();
      adminUser.id = uuidv4();
      adminUser.userName = 'admin';
      adminUser.pass = hashPassword('890890');
      adminUser.mail = 'admin@flowstore.local';
      adminUser.rol = UserRole.ADMIN;
      adminUser.person = adminPerson;
      await db.getRepository(User).save(adminUser);
      
      console.log(`   ✓ Usuario creado: ${adminUser.userName}`);
    } else {
      console.log(`   ⚠ Usuario ya existe: ${adminUser.userName}`);
    }

    // ============================================
    // 9. PERMISOS PARA ADMIN (TODOS LOS PERMISOS)
    // ============================================
    console.log('\n🔐 Asignando todos los permisos al administrador...');
    
    const permissionRepo = db.getRepository(Permission);
    let permissionsCreated = 0;
    let permissionsSkipped = 0;
    
    // Asignar TODOS los permisos al usuario admin
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
      console.log(`   ✓ ${permissionsCreated} permisos asignados al administrador`);
    }
    if (permissionsSkipped > 0) {
      console.log(`   ⚠ ${permissionsSkipped} permisos ya existían`);
    }
    console.log(`   📊 Total de permisos del sistema: ${ALL_ABILITIES.length}`);

    // ============================================
    // RESUMEN
    // ============================================
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ Seed completado exitosamente!');
    console.log('───────────────────────────────────────────────────────────');
    console.log('\n📊 Resumen de datos creados:');
    console.log(`   • Empresa: ${company.name}`);
    console.log(`   • Sucursal: ${branch.name}`);
    console.log(`   • Impuestos: IVA 19%, Exento`);
    console.log(`   • Categorías: ${categoriesData.length} categorías`);
    console.log(`   • Lista de precios: ${priceList.name}`);
    console.log(`   • Bodega: ${storage.name}`);
    console.log(`   • Punto de venta: ${pointOfSale.name}`);
    console.log(`   • Permisos: ${ALL_ABILITIES.length} permisos asignados al admin`);
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
