/**
 * Global setup para Playwright
 * Se ejecuta una sola vez antes de todos los tests
 */

import mysql from 'mysql2/promise';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { execSync } from 'child_process';
import * as crypto from 'crypto';

// Leer configuración de test
function readTestConfig() {
  const configPath = path.join(process.cwd(), 'app.config.json');
  if (!fs.existsSync(configPath)) {
    throw new Error('app.config.json no encontrado');
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

/**
 * Crear usuarios de test
 */
async function seedTestUsers(connection: mysql.Connection) {
  console.log('[Setup] 👥 Creando usuarios de test...');

  // Hash de contraseña: "test123456"
  const hashedPassword = await bcrypt.hash('test123456', 10);
  const hashedAdmin1234 = await bcrypt.hash('1234', 10);

  // Primero crear las personas
  const persons = [
    {
      id: '550e8400-e29b-41d4-a716-446655440010',
      name: 'Admin Test',
      dni: '12345678',
      phone: '111111111',
      mail: 'admin@test.com',
      address: 'Calle Admin 123'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440011',
      name: 'User Test',
      dni: '87654321',
      phone: '222222222',
      mail: 'user@test.com',
      address: 'Calle User 456'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440012',
      name: 'Administrador Manual',
      dni: '99999999',
      phone: '999999999',
      mail: 'admin@example.com',
      address: 'Calle Admin Manual 789'
    },
  ];

  for (const person of persons) {
    try {
      await connection.execute(
        `INSERT INTO persons (id, name, dni, phone, mail, address, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [person.id, person.name, person.dni, person.phone, person.mail, person.address]
      );
    } catch (error: any) {
      if (error.code !== 'ER_DUP_ENTRY') {
        throw error;
      }
    }
  }

  const users = [
    {
      id: '550e8400-e29b-41d4-a716-446655440000',
      userName: 'test_admin',
      mail: 'admin@test.com',
      password: hashedPassword,
      personId: '550e8400-e29b-41d4-a716-446655440010',
      isActive: 1,
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      userName: 'test_user',
      mail: 'user@test.com',
      password: hashedPassword,
      personId: '550e8400-e29b-41d4-a716-446655440011',
      isActive: 1,
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      userName: 'admin',
      mail: 'admin@example.com',
      password: hashedAdmin1234,
      personId: '550e8400-e29b-41d4-a716-446655440012',
      isActive: 1,
    },
  ];

  for (const user of users) {
    try {
      await connection.execute(
        `INSERT INTO users (id, userName, mail, pass, phone, rol, personId, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, 'ADMIN', ?, NOW(), NOW())`,
        [user.id, user.userName, user.mail, user.password, null, user.personId]
      );
    } catch (error: any) {
      if (error.code !== 'ER_DUP_ENTRY') {
        throw error;
      }
    }
  }

  console.log(`[Setup] ✓ ${users.length} usuarios y ${persons.length} personas creados`);
}

/**
 * Crear variedades de test
 */
async function seedTestVarieties(connection: mysql.Connection) {
  console.log('[Setup] 🌱 Creando variedades de test...');

  const varieties = [
    {
      name: 'Variedad Test 1',
      priceCLP: 10000,
      priceUSD: 12,
      currency: 'CLP'
    },
    {
      name: 'Variedad Test 2',
      priceCLP: 20000,
      priceUSD: 24,
      currency: 'USD'
    }
  ];

  for (const variety of varieties) {
    try {
      await connection.execute(
        `INSERT INTO varieties (name, priceCLP, priceUSD, currency, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, NOW(), NOW())`,
        [variety.name, variety.priceCLP, variety.priceUSD, variety.currency]
      );
      console.log(`[Setup]   ✓ Variedad '${variety.name}' creada`);
    } catch (error: any) {
      if (error.code !== 'ER_DUP_ENTRY') {
        console.error(`[Setup]   ✗ Error creando variedad '${variety.name}':`, error.message);
        throw error;
      } else {
        console.log(`[Setup]   ⚠️  Variedad '${variety.name}' ya existe`);
      }
    }
  }

  console.log(`[Setup] ✓ ${varieties.length} variedades de test creadas`);
}

/**
 * Crear formatos de test
 */
async function seedTestFormats(connection: mysql.Connection) {
  console.log('[Setup] 📦 Creando formatos de test...');

  const formats = [
    {
      name: 'IQF',
      description: 'Congelado individual rápido'
    },
    {
      name: 'BLOCK',
      description: 'Producto congelado en bloque'
    },
    {
      name: 'JUGO',
      description: 'Producto destinado a jugo o pulpa'
    },
    {
      name: 'FRESCO',
      description: 'Producto fresco sin congelar'
    },
    {
      name: 'PURE',
      description: 'Pulpa o puré de fruta'
    }
  ];

  for (const format of formats) {
    try {
      await connection.execute(
        `INSERT INTO formats (name, description, active, createdAt, updatedAt)
         VALUES (?, ?, true, NOW(), NOW())`,
        [format.name, format.description]
      );
      console.log(`[Setup]   ✓ Formato '${format.name}' creado`);
    } catch (error: any) {
      if (error.code !== 'ER_DUP_ENTRY') {
        console.error(`[Setup]   ✗ Error creando formato '${format.name}':`, error.message);
        throw error;
      } else {
        console.log(`[Setup]   ⚠️  Formato '${format.name}' ya existe`);
      }
    }
  }

  console.log(`[Setup] ✓ ${formats.length} formatos de test creados`);
}

/**
 * Recrear la base de datos de test usando TypeORM
 */
async function setupTestDatabase() {
  const config = readTestConfig();

  let connection: mysql.Connection | null = null;

  try {
    // Conectar al servidor MySQL (sin base de datos específica)
    console.log('[Setup] 📡 Conectando al servidor MySQL...');
    connection = await mysql.createConnection({
      host: config.database.host,
      port: config.database.port,
      user: config.database.username,
      password: config.database.password,
    });

    const dbName = config.database.database;

    // Eliminar la base de datos si existe
    console.log(`[Setup] 🗑️  Eliminando base de datos "${dbName}" si existe...`);
    try {
      await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
      console.log(`[Setup] ✓ Base de datos eliminada`);
    } catch (e: any) {
      console.log(`[Setup] ⚠️  No se pudo eliminar la base de datos (puede que no exista): ${e.message}`);
    }

    // Crear la base de datos nueva
    console.log(`[Setup] ✨ Creando base de datos "${dbName}"...`);
    await connection.query(`CREATE DATABASE \`${dbName}\``);
    console.log(`[Setup] ✓ Base de datos creada`);

    // Usar la base de datos
    await connection.query(`USE \`${dbName}\``);

    console.log('[Setup] 📋 Creando tablas base...');

    // Crear tablas base primero (sin foreign keys)
    const baseTables = [
      `CREATE TABLE companies (
        id varchar(36) NOT NULL PRIMARY KEY,
        name varchar(255) NOT NULL,
        rut varchar(12) NOT NULL,
        address text NULL,
        phone varchar(20) NULL,
        email varchar(255) NULL,
        website varchar(255) NULL,
        isActive boolean NOT NULL DEFAULT true,
        deletedAt datetime NULL,
        createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_companies_rut (rut)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      `CREATE TABLE persons (
        id varchar(36) NOT NULL PRIMARY KEY,
        firstName varchar(255) NOT NULL,
        lastName varchar(255) NOT NULL,
        rut varchar(12) NOT NULL,
        email varchar(255) NULL,
        phone varchar(20) NULL,
        address text NULL,
        birthDate date NULL,
        gender enum('MALE','FEMALE','OTHER') NULL,
        isActive boolean NOT NULL DEFAULT true,
        deletedAt datetime NULL,
        createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_persons_rut (rut),
        UNIQUE KEY uk_persons_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      `CREATE TABLE permissions (
        id varchar(36) NOT NULL PRIMARY KEY,
        name varchar(255) NOT NULL,
        description text NULL,
        resource varchar(255) NOT NULL,
        action varchar(255) NOT NULL,
        isActive boolean NOT NULL DEFAULT true,
        deletedAt datetime NULL,
        createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_permissions_resource_action (resource, action)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      `CREATE TABLE branches (
        id varchar(36) NOT NULL PRIMARY KEY,
        companyId varchar(36) NULL,
        name varchar(255) NOT NULL,
        address text NULL,
        phone varchar(20) NULL,
        email varchar(255) NULL,
        isActive boolean NOT NULL DEFAULT true,
        deletedAt datetime NULL,
        createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      `CREATE TABLE users (
        id varchar(36) NOT NULL PRIMARY KEY,
        personId varchar(36) NULL,
        userName varchar(255) NOT NULL,
        pass varchar(255) NOT NULL,
        rol enum('ADMIN','MANAGER','EMPLOYEE','AUDITOR') NOT NULL DEFAULT 'EMPLOYEE',
        isActive boolean NOT NULL DEFAULT true,
        lastLoginAt datetime NULL,
        deletedAt datetime NULL,
        createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_users_userName (userName)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      `CREATE TABLE storages (
        id varchar(36) NOT NULL PRIMARY KEY,
        branchId varchar(36) NULL,
        name varchar(255) NOT NULL,
        type enum('WAREHOUSE','COLD_ROOM','DRY_ROOM','OUTDOOR') NOT NULL,
        capacity int NULL,
        isActive boolean NOT NULL DEFAULT true,
        deletedAt datetime NULL,
        createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      `CREATE TABLE categories (
        id varchar(36) NOT NULL PRIMARY KEY,
        name varchar(255) NOT NULL,
        description text NULL,
        parentId varchar(36) NULL,
        isActive boolean NOT NULL DEFAULT true,
        deletedAt datetime NULL,
        createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      `CREATE TABLE taxes (
        id varchar(36) NOT NULL PRIMARY KEY,
        name varchar(255) NOT NULL,
        rate decimal(5,2) NOT NULL,
        type enum('IVA','IE','OTHER') NOT NULL DEFAULT 'IVA',
        isActive boolean NOT NULL DEFAULT true,
        deletedAt datetime NULL,
        createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      `CREATE TABLE price_lists (
        id varchar(36) NOT NULL PRIMARY KEY,
        name varchar(255) NOT NULL,
        description text NULL,
        isDefault boolean NOT NULL DEFAULT false,
        isActive boolean NOT NULL DEFAULT true,
        deletedAt datetime NULL,
        createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    ];

    for (const sql of baseTables) {
      await connection.execute(sql);
    }

    console.log('[Setup] ✓ Tablas base creadas');

    // Crear foreign keys para tablas base
    const baseConstraints = [
      `ALTER TABLE branches ADD CONSTRAINT fk_branches_company FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE SET NULL`,
      `ALTER TABLE users ADD CONSTRAINT fk_users_person FOREIGN KEY (personId) REFERENCES persons(id) ON DELETE SET NULL`,
      `ALTER TABLE storages ADD CONSTRAINT fk_storages_branch FOREIGN KEY (branchId) REFERENCES branches(id) ON DELETE SET NULL`,
      `ALTER TABLE categories ADD CONSTRAINT fk_categories_parent FOREIGN KEY (parentId) REFERENCES categories(id) ON DELETE SET NULL`
    ];

    for (const sql of baseConstraints) {
      try {
        await connection.query(sql);
      } catch (e) {
        console.log(`⚠️  Constraint ya existe o error: ${e.message}`);
      }
    }

    console.log('[Setup] ✓ Constraints base aplicadas');

    // Crear tablas adicionales que dependen de las base
    const additionalTables = [
      `CREATE TABLE products (
        id varchar(36) NOT NULL PRIMARY KEY,
        categoryId varchar(36) NULL,
        name varchar(255) NOT NULL,
        description text NULL,
        sku varchar(100) NULL,
        barcode varchar(100) NULL,
        unit enum('KG','UNIT','BOX','PALLET') NOT NULL DEFAULT 'UNIT',
        isActive boolean NOT NULL DEFAULT true,
        deletedAt datetime NULL,
        createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_products_sku (sku),
        UNIQUE KEY uk_products_barcode (barcode)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      `CREATE TABLE product_variants (
        id varchar(36) NOT NULL PRIMARY KEY,
        productId varchar(36) NULL,
        name varchar(255) NOT NULL,
        sku varchar(100) NULL,
        barcode varchar(100) NULL,
        weight decimal(10,3) NULL,
        dimensions json NULL,
        isActive boolean NOT NULL DEFAULT true,
        deletedAt datetime NULL,
        createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_product_variants_sku (sku),
        UNIQUE KEY uk_product_variants_barcode (barcode)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      `CREATE TABLE attributes (
        id varchar(36) NOT NULL PRIMARY KEY,
        name varchar(255) NOT NULL,
        type enum('TEXT','NUMBER','BOOLEAN','DATE','SELECT') NOT NULL,
        options json NULL,
        isRequired boolean NOT NULL DEFAULT false,
        isActive boolean NOT NULL DEFAULT true,
        deletedAt datetime NULL,
        createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      `CREATE TABLE price_list_items (
        id varchar(36) NOT NULL PRIMARY KEY,
        priceListId varchar(36) NULL,
        productVariantId varchar(36) NULL,
        productId varchar(36) NULL,
        netPrice decimal(15,2) NOT NULL DEFAULT 0,
        grossPrice decimal(15,2) NOT NULL DEFAULT 0,
        taxIds json NULL,
        currency enum('CLP','USD') NOT NULL DEFAULT 'CLP',
        minQuantity int NOT NULL DEFAULT 1,
        isActive boolean NOT NULL DEFAULT true,
        deletedAt datetime NULL,
        createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      `CREATE TABLE suppliers (
        id varchar(36) NOT NULL PRIMARY KEY,
        personId varchar(36) NULL,
        companyName varchar(255) NULL,
        paymentTerms varchar(255) NULL,
        creditLimit decimal(12,2) NULL,
        isActive boolean NOT NULL DEFAULT true,
        deletedAt datetime NULL,
        createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      `CREATE TABLE customers (
        id varchar(36) NOT NULL PRIMARY KEY,
        personId varchar(36) NULL,
        creditLimit decimal(12,2) NULL,
        paymentTerms varchar(255) NULL,
        isActive boolean NOT NULL DEFAULT true,
        deletedAt datetime NULL,
        createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      `CREATE TABLE points_of_sale (
        id varchar(36) NOT NULL PRIMARY KEY,
        branchId varchar(36) NULL,
        name varchar(255) NOT NULL,
        deviceId varchar(100) NULL,
        isActive boolean NOT NULL DEFAULT true,
        deletedAt datetime NULL,
        createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      `CREATE TABLE cash_sessions (
        id varchar(36) NOT NULL PRIMARY KEY,
        pointOfSaleId varchar(36) NULL,
        userId varchar(36) NULL,
        openedAt datetime NOT NULL,
        closedAt datetime NULL,
        openingBalance decimal(12,2) NOT NULL DEFAULT 0,
        closingBalance decimal(12,2) NULL,
        expectedBalance decimal(12,2) NULL,
        status enum('OPEN','CLOSED','RECONCILED') NOT NULL DEFAULT 'OPEN',
        notes text NULL,
        deletedAt datetime NULL,
        createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      `CREATE TABLE transactions (
        id bigint UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        type enum('SALE','PURCHASE','ADJUSTMENT','TRANSFER','RECEPTION') NOT NULL,
        pointOfSaleId varchar(36) NULL,
        userId varchar(36) NULL,
        customerId varchar(36) NULL,
        supplierId varchar(36) NULL,
        total decimal(12,2) NOT NULL DEFAULT 0,
        taxAmount decimal(12,2) NOT NULL DEFAULT 0,
        discountAmount decimal(12,2) NOT NULL DEFAULT 0,
        status enum('PENDING','COMPLETED','CANCELLED') NOT NULL DEFAULT 'PENDING',
        notes text NULL,
        metadata json NULL,
        deletedAt datetime NULL,
        createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      `CREATE TABLE transaction_lines (
        id varchar(36) NOT NULL PRIMARY KEY,
        transactionId bigint UNSIGNED NULL,
        productVariantId varchar(36) NULL,
        productId varchar(36) NULL,
        quantity decimal(10,3) NOT NULL,
        unitPrice decimal(12,2) NOT NULL,
        discount decimal(12,2) NOT NULL DEFAULT 0,
        taxAmount decimal(12,2) NOT NULL DEFAULT 0,
        total decimal(12,2) NOT NULL,
        notes text NULL,
        metadata json NULL,
        deletedAt datetime NULL,
        createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      `CREATE TABLE audits (
        id varchar(36) NOT NULL PRIMARY KEY,
        userId varchar(36) NULL,
        action varchar(255) NOT NULL,
        resource varchar(255) NOT NULL,
        resourceId varchar(36) NULL,
        oldValues json NULL,
        newValues json NULL,
        ipAddress varchar(45) NULL,
        userAgent text NULL,
        timestamp datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        metadata json NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    ];

    for (const sql of additionalTables) {
      await connection.execute(sql);
    }

    console.log('[Setup] ✓ Tablas adicionales creadas');

    // Crear constraints para tablas adicionales
    const additionalConstraints = [
      `ALTER TABLE products ADD CONSTRAINT fk_products_category FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE SET NULL`,
      `ALTER TABLE product_variants ADD CONSTRAINT fk_product_variants_product FOREIGN KEY (productId) REFERENCES products(id) ON DELETE SET NULL`,
      `ALTER TABLE price_list_items ADD CONSTRAINT fk_price_list_items_price_list FOREIGN KEY (priceListId) REFERENCES price_lists(id) ON DELETE SET NULL`,
      `ALTER TABLE price_list_items ADD CONSTRAINT fk_price_list_items_product_variant FOREIGN KEY (productVariantId) REFERENCES product_variants(id) ON DELETE SET NULL`,
      `ALTER TABLE price_list_items ADD CONSTRAINT fk_price_list_items_product FOREIGN KEY (productId) REFERENCES products(id) ON DELETE SET NULL`,
      `ALTER TABLE suppliers ADD CONSTRAINT fk_suppliers_person FOREIGN KEY (personId) REFERENCES persons(id) ON DELETE SET NULL`,
      `ALTER TABLE customers ADD CONSTRAINT fk_customers_person FOREIGN KEY (personId) REFERENCES persons(id) ON DELETE SET NULL`,
      `ALTER TABLE points_of_sale ADD CONSTRAINT fk_points_of_sale_branch FOREIGN KEY (branchId) REFERENCES branches(id) ON DELETE SET NULL`,
      `ALTER TABLE cash_sessions ADD CONSTRAINT fk_cash_sessions_point_of_sale FOREIGN KEY (pointOfSaleId) REFERENCES points_of_sale(id) ON DELETE SET NULL`,
      `ALTER TABLE cash_sessions ADD CONSTRAINT fk_cash_sessions_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL`,
      `ALTER TABLE transactions ADD CONSTRAINT fk_transactions_point_of_sale FOREIGN KEY (pointOfSaleId) REFERENCES points_of_sale(id) ON DELETE SET NULL`,
      `ALTER TABLE transactions ADD CONSTRAINT fk_transactions_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL`,
      `ALTER TABLE transactions ADD CONSTRAINT fk_transactions_customer FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE SET NULL`,
      `ALTER TABLE transactions ADD CONSTRAINT fk_transactions_supplier FOREIGN KEY (supplierId) REFERENCES suppliers(id) ON DELETE SET NULL`,
      `ALTER TABLE transaction_lines ADD CONSTRAINT fk_transaction_lines_transaction FOREIGN KEY (transactionId) REFERENCES transactions(id) ON DELETE SET NULL`,
      `ALTER TABLE transaction_lines ADD CONSTRAINT fk_transaction_lines_product_variant FOREIGN KEY (productVariantId) REFERENCES product_variants(id) ON DELETE SET NULL`,
      `ALTER TABLE transaction_lines ADD CONSTRAINT fk_transaction_lines_product FOREIGN KEY (productId) REFERENCES products(id) ON DELETE SET NULL`,
      `ALTER TABLE audits ADD CONSTRAINT fk_audits_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL`
    ];

    for (const sql of additionalConstraints) {
      try {
        await connection.query(sql);
      } catch (e) {
        console.log(`⚠️  Constraint ya existe o error: ${e.message}`);
      }
    }

    console.log('[Setup] ✓ Todas las constraints aplicadas');

    console.log('[Setup] 🌱 Creando datos básicos para tests...');

    // Crear datos mínimos para que funcione el login
    const testData = [
      `INSERT INTO companies (id, name, rut, isActive, createdAt, updatedAt) VALUES
      ('550e8400-e29b-41d4-a716-446655440000', 'Test Company', '12345678-9', true, NOW(), NOW())`,

      `INSERT INTO persons (id, firstName, lastName, rut, email, isActive, createdAt, updatedAt) VALUES
      ('550e8400-e29b-41d4-a716-446655440001', 'Admin', 'User', '11111111-1', 'admin@test.com', true, NOW(), NOW())`,

      `INSERT INTO users (id, personId, userName, pass, rol, isActive, createdAt, updatedAt) VALUES
      ('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'admin', '${crypto.createHash('sha256').update('890890').digest('hex')}', 'ADMIN', true, NOW(), NOW())`,

      `INSERT INTO branches (id, companyId, name, isActive, createdAt, updatedAt) VALUES
      ('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 'Sucursal Principal', true, NOW(), NOW())`,

      `INSERT INTO permissions (id, name, description, resource, action, isActive, createdAt, updatedAt) VALUES
      ('550e8400-e29b-41d4-a716-446655440004', 'Admin Access', 'Full system access', 'admin', 'manage', true, NOW(), NOW())`
    ];

    for (const sql of testData) {
      try {
        await connection.query(sql);
        console.log('[Setup] ✓ Insertado:', sql.substring(0, 50) + '...');
      } catch (e) {
        console.log(`⚠️  Error insertando: ${e.message}`);
      }
    }

    // Verificar que el usuario se creó correctamente
    try {
      const [rows] = await connection.query('SELECT id, userName, pass FROM users WHERE userName = ?', ['admin']);
      console.log('[Setup] Usuario creado:', rows);
    } catch (e) {
      console.log('[Setup] Error verificando usuario:', e.message);
    }

    console.log('[Setup] ✓ Datos básicos creados');

    console.log('[Setup] ✓ Base de datos lista para tests');
  } catch (error) {
    console.error('[Setup] ❌ Error preparando base de datos de test:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

async function globalSetup() {
  console.log('[Setup] 🚀 Iniciando setup global...');

  try {
    // Preparar base de datos de test
    await setupTestDatabase();
    console.log('[Setup] ✓ Setup global completado exitosamente');
  } catch (error) {
    console.error('[Setup] ✗ Setup global falló:', error);
    process.exit(1);
  }
}

export default globalSetup;
