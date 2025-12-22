/**
 * Global setup para Playwright
 * Se ejecuta una sola vez antes de todos los tests
 */

import mysql from 'mysql2/promise';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { execSync } from 'child_process';

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
 * Recrear la base de datos de test usando SQL directo
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
      await connection.execute(`DROP DATABASE \`${dbName}\``);
      console.log(`[Setup] ✓ Base de datos eliminada`);
    } catch (e: any) {
      if (e.code === 'ER_DB_DROP_EXISTS') {
        // OK, la DB no existía
      } else {
        throw e;
      }
    }

    // Crear la base de datos nueva
    console.log(`[Setup] ✨ Creando base de datos "${dbName}"...`);
    await connection.execute(`CREATE DATABASE \`${dbName}\``);
    console.log(`[Setup] ✓ Base de datos creada`);

    // Cerrar y reconectar a la nueva base de datos
    await connection.end();
    connection = null;

    console.log('[Setup] 🔄 Reconectando a la nueva base de datos...');
    connection = await mysql.createConnection({
      host: config.database.host,
      port: config.database.port,
      user: config.database.username,
      password: config.database.password,
      database: dbName,
    });

    // Crear tablas manualmente
    console.log('[Setup] 📊 Creando tablas...');
    
    // Tabla persons (debe crearse primero porque users tiene FK a persons)
    await connection.execute(`
      CREATE TABLE persons (
        id varchar(36) NOT NULL PRIMARY KEY,
        name varchar(255) NOT NULL,
        dni varchar(255) NOT NULL,
        phone varchar(255) NULL,
        mail varchar(255) NULL,
        address varchar(255) NULL,
        deletedAt datetime NULL,
        createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Tabla users
    await connection.execute(`
      CREATE TABLE users (
        id varchar(36) NOT NULL PRIMARY KEY,
        userName varchar(255) NOT NULL UNIQUE,
        mail varchar(255) NOT NULL UNIQUE,
        pass varchar(255) NOT NULL,
        phone varchar(255) NULL,
        rol enum('ADMIN','OPERATOR') NOT NULL DEFAULT 'OPERATOR',
        personId varchar(36) NULL,
        deletedAt datetime NULL,
        createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_userName (userName),
        CONSTRAINT fk_user_person FOREIGN KEY (personId) REFERENCES persons(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Tabla audits
    await connection.execute(`
      CREATE TABLE audits (
        id varchar(36) NOT NULL PRIMARY KEY,
        entityName varchar(255) NOT NULL,
        entityId varchar(255) NOT NULL,
        userId varchar(36) NULL,
        action varchar(255) NOT NULL,
        oldValues longtext NULL,
        newValues longtext NULL,
        changes longtext NULL,
        description longtext NULL,
        createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_userId (userId),
        KEY idx_action (action),
        KEY idx_entityName (entityName),
        CONSTRAINT fk_audit_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Crear tabla varieties
    await connection.execute(`
      CREATE TABLE varieties (
        id int NOT NULL AUTO_INCREMENT PRIMARY KEY,
        name varchar(255) NOT NULL UNIQUE,
        priceCLP int NOT NULL,
        priceUSD float NOT NULL,
        currency enum('CLP', 'USD') NOT NULL DEFAULT 'CLP',
        deletedAt datetime NULL,
        createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Crear tabla formats
    await connection.execute(`
      CREATE TABLE formats (
        id int NOT NULL AUTO_INCREMENT PRIMARY KEY,
        name varchar(100) NOT NULL UNIQUE,
        description varchar(255) NULL,
        active boolean NOT NULL DEFAULT true,
        deletedAt datetime NULL,
        createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Tabla seasons (temporadas activas para recepciones)
    await connection.execute(`
      CREATE TABLE seasons (
        id varchar(36) NOT NULL PRIMARY KEY,
        name varchar(255) NOT NULL UNIQUE,
        startDate date NOT NULL,
        endDate date NOT NULL,
        description varchar(500) NULL,
        active boolean NOT NULL DEFAULT true,
        deletedAt datetime NULL,
        createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Tabla producers (productores que participan en recepciones)
    await connection.execute(`
      CREATE TABLE producers (
        id varchar(36) NOT NULL PRIMARY KEY,
        name varchar(255) NOT NULL,
        dni varchar(255) NOT NULL,
        phone varchar(255) NULL,
        mail varchar(255) NULL,
        personId varchar(36) NOT NULL,
        deletedAt datetime NULL,
        createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_producers_person FOREIGN KEY (personId) REFERENCES persons(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Tabla trays (tipos de bandejas)
    await connection.execute(`
      CREATE TABLE trays (
        id varchar(36) NOT NULL PRIMARY KEY,
        name varchar(255) NOT NULL UNIQUE,
        weight decimal(10,3) NOT NULL,
        stock int NOT NULL DEFAULT 0,
        active boolean NOT NULL DEFAULT true,
        deletedAt datetime NULL,
        createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Tabla storages (cámaras/puntos de almacenaje)
    await connection.execute(`
      CREATE TABLE storages (
        id varchar(36) NOT NULL PRIMARY KEY,
        name varchar(255) NOT NULL,
        type enum('COLD_ROOM', 'IQF_TUNNEL', 'DRY_WAREHOUSE', 'FREEZER') NOT NULL,
        capacityPallets int NULL,
        location varchar(255) NULL,
        active boolean NOT NULL DEFAULT true,
        deletedAt datetime NULL,
        createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Tabla pallets (inventario de pallets disponibles)
    await connection.execute(`
      CREATE TABLE pallets (
        id int UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        storageId varchar(36) NOT NULL,
        trayId varchar(36) NOT NULL,
        traysQuantity int NOT NULL DEFAULT 0,
        capacity int NOT NULL,
        weight decimal(10,3) NOT NULL DEFAULT 0,
        dispatchWeight decimal(10,3) NOT NULL DEFAULT 0,
        metadata json NULL,
        status enum('AVAILABLE', 'CLOSED', 'FULL', 'DISPATCHED') NOT NULL DEFAULT 'AVAILABLE',
        deletedAt datetime NULL,
        createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_pallet_storage FOREIGN KEY (storageId) REFERENCES storages(id),
        CONSTRAINT fk_pallet_tray FOREIGN KEY (trayId) REFERENCES trays(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Tabla transactions (movimientos financieros y de stock)
    await connection.execute(`
      CREATE TABLE transactions (
        id bigint UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        type enum('TRAY_ADJUSTMENT','TRAY_IN_FROM_PRODUCER','TRAY_OUT_TO_PRODUCER','TRAY_OUT_TO_CLIENT','TRAY_IN_FROM_CLIENT','RECEPTION','PALLET_TRAY_ASSIGNMENT','PALLET_TRAY_RELEASE') NOT NULL,
        seasonId varchar(36) NULL,
        producerId varchar(36) NULL,
        clientId varchar(36) NULL,
        userId varchar(36) NOT NULL,
        direction enum('IN','OUT') NOT NULL,
        amount decimal(12,2) NOT NULL,
        unit enum('TRAY','PALLET','KG','CLP','USD') NOT NULL,
        metadata json NULL,
        deletedAt datetime NULL,
        createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_transactions_type (type),
        INDEX idx_transactions_user (userId),
        INDEX idx_transactions_producer (producerId),
        INDEX idx_transactions_season (seasonId),
        CONSTRAINT fk_transactions_user FOREIGN KEY (userId) REFERENCES users(id),
        CONSTRAINT fk_transactions_producer FOREIGN KEY (producerId) REFERENCES producers(id) ON DELETE SET NULL,
        CONSTRAINT fk_transactions_season FOREIGN KEY (seasonId) REFERENCES seasons(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Tabla reception_packs (detalle de packs ingresados en recepción)
    await connection.execute(`
      CREATE TABLE reception_packs (
        id int UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        receptionTransactionId bigint UNSIGNED NOT NULL,
        varietyId int NOT NULL,
        varietyName varchar(255) NOT NULL,
        formatId int NOT NULL,
        formatName varchar(255) NOT NULL,
        trayId varchar(255) NULL,
        trayLabel varchar(255) NULL,
        traysQuantity int NOT NULL DEFAULT 0,
        unitTrayWeight decimal(12,3) NOT NULL DEFAULT 0,
        traysTotalWeight decimal(12,3) NOT NULL DEFAULT 0,
        grossWeight decimal(12,3) NOT NULL DEFAULT 0,
        netWeightBeforeImpurities decimal(12,3) NOT NULL DEFAULT 0,
        impurityPercent decimal(5,2) NOT NULL DEFAULT 0,
        netWeight decimal(12,3) NOT NULL DEFAULT 0,
        pricePerKg decimal(12,3) NOT NULL DEFAULT 0,
        currency enum('CLP','USD') NOT NULL DEFAULT 'CLP',
        totalToPay decimal(14,3) NOT NULL DEFAULT 0,
        palletAssignments json NULL,
        createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_reception_packs_transaction (receptionTransactionId),
        CONSTRAINT fk_reception_packs_transaction FOREIGN KEY (receptionTransactionId) REFERENCES transactions(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Tabla transaction_relations (relaciones entre transacciones y packs)
    await connection.execute(`
      CREATE TABLE transaction_relations (
        id int UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        parentTransactionId bigint UNSIGNED NOT NULL,
        childTransactionId bigint UNSIGNED NULL,
        childReceptionPackId int UNSIGNED NULL,
        relationType enum('RECEPTION_PACK','TRAY_RECEPTION','TRAY_DEVOLUTION','PALLET_ASSIGNMENT') NOT NULL,
        context varchar(255) NULL,
        createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_transaction_relations_parent (parentTransactionId),
        INDEX idx_transaction_relations_child (childTransactionId),
        CONSTRAINT fk_transaction_relations_parent FOREIGN KEY (parentTransactionId) REFERENCES transactions(id) ON DELETE CASCADE,
        CONSTRAINT fk_transaction_relations_child FOREIGN KEY (childTransactionId) REFERENCES transactions(id) ON DELETE CASCADE,
        CONSTRAINT fk_transaction_relations_pack FOREIGN KEY (childReceptionPackId) REFERENCES reception_packs(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Tabla customers (clientes que compran productos)
    await connection.execute(`
      CREATE TABLE customers (
        id varchar(36) NOT NULL PRIMARY KEY,
        personId varchar(36) NOT NULL,
        deletedAt datetime NULL,
        createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_customers_person FOREIGN KEY (personId) REFERENCES persons(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Tabla admin_bank_accounts (cuentas bancarias administrativas)
    await connection.execute(`
      CREATE TABLE admin_bank_accounts (
        id varchar(36) NOT NULL PRIMARY KEY,
        accountType enum('Cuenta Corriente','Cuenta de Ahorro','Cuenta Vista','Cuenta RUT','Cuenta Chequera Electrónica','Otro') NOT NULL,
        bank enum('Banco de Chile','Banco del Estado de Chile','Banco Santander Chile','Banco de Crédito e Inversiones','Banco Falabella','Banco Security','Banco CrediChile','Banco Itaú Corpbanca','Scotiabank Chile','Banco Consorcio','Banco Ripley','Banco Internacional','Banco BICE','Banco Paris','Banco Mercado Pago','Otro') NOT NULL,
        accountNumber varchar(255) NOT NULL,
        alias varchar(255) NULL,
        isActive boolean NOT NULL DEFAULT true,
        deletedAt datetime NULL,
        createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('[Setup] ✓ Tablas creadas');

    // Esperar un momento para asegurar que las tablas estén completamente creadas
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Ejecutar el seeder principal para poblar datos
    console.log('[Setup] 🌱 Ejecutando seeder principal...');
    execSync('npm run seed:test', { stdio: 'inherit', cwd: process.cwd() });

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
