/**
 * Seed inicial para base de datos berries-app
 * Solo crea estructura base y datos esenciales (sin productores, personas ni clientes)
 * 
 * Ejecutar con:
 * npx ts-node data/seed/seed-clean.ts
 */

import * as fs from "fs";
import * as path from "path";
import * as mysql from "mysql2/promise";
import { randomUUID } from "crypto";
import * as bcrypt from "bcrypt";

// Helper to read app.config.json
const getAppConfig = () => {
  try {
    const configPath = path.join(process.cwd(), "app.config.json");
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, "utf-8"));
    }
  } catch (error) {
    console.warn("⚠️  Could not read app.config.json for seeding");
  }
  return null;
};

const appConfig = getAppConfig();

const JSON_DIR = path.join(__dirname, "dataToSeed");

const loadSeedJson = <T>(fileName: string): T => {
  const filePath = path.join(JSON_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  Seed JSON file not found: ${filePath}`);
    return [] as unknown as T;
  }
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw) as T;
};

// ============ SQL para crear tablas ============

const CREATE_TABLES_SQL = `
-- Tabla de personas
CREATE TABLE IF NOT EXISTS persons (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  dni VARCHAR(50) NULL,
  phone VARCHAR(50) NULL,
  mail VARCHAR(255) NULL,
  address VARCHAR(500) NULL,
  bankAccounts JSON NULL,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  deletedAt DATETIME(6) NULL,
  INDEX idx_persons_dni (dni),
  INDEX idx_persons_name (name),
  INDEX idx_persons_deletedAt (deletedAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  userName VARCHAR(255) NOT NULL UNIQUE,
  pass VARCHAR(255) NOT NULL,
  mail VARCHAR(255) NULL,
  rol ENUM('ADMIN', 'OPERATOR') NOT NULL DEFAULT 'OPERATOR',
  personId VARCHAR(36) NULL,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  deletedAt DATETIME(6) NULL,
  INDEX idx_users_userName (userName),
  INDEX idx_users_personId (personId),
  INDEX idx_users_deletedAt (deletedAt),
  CONSTRAINT fk_users_person FOREIGN KEY (personId) REFERENCES persons(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de permisos de usuario
CREATE TABLE IF NOT EXISTS user_permissions (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  userId VARCHAR(36) NOT NULL,
  ability VARCHAR(100) NOT NULL,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE KEY unique_user_ability (userId, ability),
  INDEX idx_user_permissions_userId (userId),
  CONSTRAINT fk_user_permissions_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de unidades productivas (simplificada: solo id, name, location)
-- Debe crearse ANTES de producers para la FK
CREATE TABLE IF NOT EXISTS productive_units (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(500) NULL,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  deletedAt DATETIME(6) NULL,
  INDEX idx_productive_units_name (name),
  INDEX idx_productive_units_deletedAt (deletedAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de productores
CREATE TABLE IF NOT EXISTS producers (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  dni VARCHAR(50) NOT NULL,
  phone VARCHAR(50) NULL,
  mail VARCHAR(255) NULL,
  address VARCHAR(500) NULL,
  personId VARCHAR(36) NULL,
  productiveUnitId VARCHAR(36) NULL,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  deletedAt DATETIME(6) NULL,
  INDEX idx_producers_dni (dni),
  INDEX idx_producers_name (name),
  INDEX idx_producers_personId (personId),
  INDEX idx_producers_productiveUnitId (productiveUnitId),
  INDEX idx_producers_deletedAt (deletedAt),
  CONSTRAINT fk_producers_person FOREIGN KEY (personId) REFERENCES persons(id) ON DELETE SET NULL,
  CONSTRAINT fk_producers_productive_unit FOREIGN KEY (productiveUnitId) REFERENCES productive_units(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de clientes
CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  dni VARCHAR(50) NOT NULL,
  phone VARCHAR(50) NULL,
  mail VARCHAR(255) NULL,
  address VARCHAR(500) NULL,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  deletedAt DATETIME(6) NULL,
  INDEX idx_customers_dni (dni),
  INDEX idx_customers_name (name),
  INDEX idx_customers_deletedAt (deletedAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de temporadas
CREATE TABLE IF NOT EXISTS seasons (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  startDate DATE NOT NULL,
  endDate DATE NOT NULL,
  description TEXT NULL,
  active TINYINT(1) NOT NULL DEFAULT 0,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  deletedAt DATETIME(6) NULL,
  INDEX idx_seasons_name (name),
  INDEX idx_seasons_active (active),
  INDEX idx_seasons_deletedAt (deletedAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de variedades
CREATE TABLE IF NOT EXISTS varieties (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT NULL,
  priceCLP DECIMAL(10, 2) NOT NULL DEFAULT 0,
  priceUSD DECIMAL(10, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'CLP',
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  deletedAt DATETIME(6) NULL,
  INDEX idx_varieties_name (name),
  INDEX idx_varieties_deletedAt (deletedAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de formatos
CREATE TABLE IF NOT EXISTS formats (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  deletedAt DATETIME(6) NULL,
  INDEX idx_formats_name (name),
  INDEX idx_formats_deletedAt (deletedAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de bandejas
CREATE TABLE IF NOT EXISTS trays (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  weight DECIMAL(10, 2) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  deletedAt DATETIME(6) NULL,
  INDEX idx_trays_name (name),
  INDEX idx_trays_deletedAt (deletedAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de almacenamiento
CREATE TABLE IF NOT EXISTS storages (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(500) NULL,
  capacity INT NULL,
  description TEXT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  deletedAt DATETIME(6) NULL,
  INDEX idx_storages_name (name),
  INDEX idx_storages_deletedAt (deletedAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de recepciones
CREATE TABLE IF NOT EXISTS receptions (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  date DATETIME NOT NULL,
  producerId VARCHAR(36) NULL,
  seasonId VARCHAR(36) NULL,
  varietyId INT NULL,
  formatId INT NULL,
  trayId VARCHAR(36) NULL,
  storageId VARCHAR(36) NULL,
  grossWeight DECIMAL(10, 2) NOT NULL DEFAULT 0,
  traysQuantity INT NOT NULL DEFAULT 0,
  impurityPercent DECIMAL(5, 2) NOT NULL DEFAULT 0,
  netWeight DECIMAL(10, 2) NOT NULL DEFAULT 0,
  priceCLP DECIMAL(10, 2) NOT NULL DEFAULT 0,
  priceUSD DECIMAL(10, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'CLP',
  totalCLP DECIMAL(12, 2) NOT NULL DEFAULT 0,
  totalUSD DECIMAL(12, 2) NOT NULL DEFAULT 0,
  notes TEXT NULL,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  deletedAt DATETIME(6) NULL,
  INDEX idx_receptions_date (date),
  INDEX idx_receptions_producerId (producerId),
  INDEX idx_receptions_seasonId (seasonId),
  INDEX idx_receptions_deletedAt (deletedAt),
  CONSTRAINT fk_receptions_producer FOREIGN KEY (producerId) REFERENCES producers(id) ON DELETE SET NULL,
  CONSTRAINT fk_receptions_season FOREIGN KEY (seasonId) REFERENCES seasons(id) ON DELETE SET NULL,
  CONSTRAINT fk_receptions_variety FOREIGN KEY (varietyId) REFERENCES varieties(id) ON DELETE SET NULL,
  CONSTRAINT fk_receptions_format FOREIGN KEY (formatId) REFERENCES formats(id) ON DELETE SET NULL,
  CONSTRAINT fk_receptions_tray FOREIGN KEY (trayId) REFERENCES trays(id) ON DELETE SET NULL,
  CONSTRAINT fk_receptions_storage FOREIGN KEY (storageId) REFERENCES storages(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de despachos
CREATE TABLE IF NOT EXISTS dispatches (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  date DATETIME NOT NULL,
  customerId VARCHAR(36) NULL,
  seasonId VARCHAR(36) NULL,
  totalWeight DECIMAL(12, 2) NOT NULL DEFAULT 0,
  totalBoxes INT NOT NULL DEFAULT 0,
  priceCLP DECIMAL(10, 2) NOT NULL DEFAULT 0,
  priceUSD DECIMAL(10, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'CLP',
  totalCLP DECIMAL(12, 2) NOT NULL DEFAULT 0,
  totalUSD DECIMAL(12, 2) NOT NULL DEFAULT 0,
  status ENUM('DRAFT', 'CONFIRMED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
  notes TEXT NULL,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  deletedAt DATETIME(6) NULL,
  INDEX idx_dispatches_date (date),
  INDEX idx_dispatches_customerId (customerId),
  INDEX idx_dispatches_status (status),
  INDEX idx_dispatches_deletedAt (deletedAt),
  CONSTRAINT fk_dispatches_customer FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE SET NULL,
  CONSTRAINT fk_dispatches_season FOREIGN KEY (seasonId) REFERENCES seasons(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de pallets en despacho
CREATE TABLE IF NOT EXISTS dispatch_pallets (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  dispatchId VARCHAR(36) NOT NULL,
  palletId VARCHAR(36) NOT NULL,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  INDEX idx_dispatch_pallets_dispatchId (dispatchId),
  INDEX idx_dispatch_pallets_palletId (palletId),
  CONSTRAINT fk_dispatch_pallets_dispatch FOREIGN KEY (dispatchId) REFERENCES dispatches(id) ON DELETE CASCADE,
  CONSTRAINT fk_dispatch_pallets_pallet FOREIGN KEY (palletId) REFERENCES pallets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de anticipos
CREATE TABLE IF NOT EXISTS advances (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  date DATETIME NOT NULL,
  producerId VARCHAR(36) NULL,
  amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'CLP',
  description TEXT NULL,
  status ENUM('PENDING', 'APPLIED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  settlementId VARCHAR(36) NULL,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  deletedAt DATETIME(6) NULL,
  INDEX idx_advances_date (date),
  INDEX idx_advances_producerId (producerId),
  INDEX idx_advances_status (status),
  INDEX idx_advances_deletedAt (deletedAt),
  CONSTRAINT fk_advances_producer FOREIGN KEY (producerId) REFERENCES producers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de liquidaciones
CREATE TABLE IF NOT EXISTS settlements (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  date DATETIME NOT NULL,
  producerId VARCHAR(36) NULL,
  seasonId VARCHAR(36) NULL,
  totalReceptions DECIMAL(12, 2) NOT NULL DEFAULT 0,
  totalAdvances DECIMAL(12, 2) NOT NULL DEFAULT 0,
  netAmount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'CLP',
  status ENUM('DRAFT', 'CONFIRMED', 'PAID', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
  notes TEXT NULL,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  deletedAt DATETIME(6) NULL,
  INDEX idx_settlements_date (date),
  INDEX idx_settlements_producerId (producerId),
  INDEX idx_settlements_status (status),
  INDEX idx_settlements_deletedAt (deletedAt),
  CONSTRAINT fk_settlements_producer FOREIGN KEY (producerId) REFERENCES producers(id) ON DELETE SET NULL,
  CONSTRAINT fk_settlements_season FOREIGN KEY (seasonId) REFERENCES seasons(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de transacciones de bandejas
CREATE TABLE IF NOT EXISTS tray_transactions (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  date DATETIME NOT NULL,
  trayId VARCHAR(36) NOT NULL,
  producerId VARCHAR(36) NULL,
  type ENUM('DELIVERY', 'RETURN', 'ADJUSTMENT', 'INITIAL') NOT NULL,
  quantity INT NOT NULL DEFAULT 0,
  previousStock INT NOT NULL DEFAULT 0,
  newStock INT NOT NULL DEFAULT 0,
  notes TEXT NULL,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  INDEX idx_tray_transactions_trayId (trayId),
  INDEX idx_tray_transactions_producerId (producerId),
  INDEX idx_tray_transactions_type (type),
  INDEX idx_tray_transactions_date (date),
  CONSTRAINT fk_tray_transactions_tray FOREIGN KEY (trayId) REFERENCES trays(id) ON DELETE CASCADE,
  CONSTRAINT fk_tray_transactions_producer FOREIGN KEY (producerId) REFERENCES producers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de cuentas bancarias administrativas
CREATE TABLE IF NOT EXISTS admin_bank_accounts (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  bankName VARCHAR(100) NOT NULL,
  accountType VARCHAR(50) NOT NULL,
  accountNumber VARCHAR(50) NOT NULL,
  holderName VARCHAR(255) NOT NULL,
  holderDni VARCHAR(50) NOT NULL,
  email VARCHAR(255) NULL,
  isDefault TINYINT(1) NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  deletedAt DATETIME(6) NULL,
  INDEX idx_admin_bank_accounts_deletedAt (deletedAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de auditoría
CREATE TABLE IF NOT EXISTS audits (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  entityName VARCHAR(255) NOT NULL,
  entityId VARCHAR(255) NOT NULL,
  userId VARCHAR(36) NULL,
  action ENUM('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'UPDATE_PASSWORD') NOT NULL,
  changes JSON NULL,
  oldValues JSON NULL,
  newValues JSON NULL,
  description TEXT NULL,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  deletedAt DATETIME(6) NULL,
  INDEX idx_audits_entityName (entityName),
  INDEX idx_audits_entityId (entityId),
  INDEX idx_audits_userId (userId),
  INDEX idx_audits_action (action),
  INDEX idx_audits_createdAt (createdAt),
  CONSTRAINT fk_audits_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de transacciones
CREATE TABLE IF NOT EXISTS transactions (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  type ENUM('TRAY_ADJUSTMENT', 'TRAY_IN_FROM_PRODUCER', 'TRAY_OUT_TO_PRODUCER', 'TRAY_OUT_TO_CLIENT', 'TRAY_IN_FROM_CLIENT', 'TRAY_RECEPTION_FROM_PRODUCER', 'TRAY_RECEPTION_FROM_CLIENT', 'TRAY_DELIVERY_TO_PRODUCER', 'TRAY_DELIVERY_TO_CLIENT', 'RECEPTION', 'PALLET_TRAY_ASSIGNMENT', 'PALLET_TRAY_RELEASE', 'ADVANCE', 'SETTLEMENT', 'DISPATCH') NOT NULL,
  seasonId VARCHAR(36) NULL,
  producerId VARCHAR(36) NULL,
  clientId VARCHAR(36) NULL,
  userId VARCHAR(36) NULL,
  formatId INT NULL,
  direction ENUM('IN', 'OUT') NOT NULL,
  amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  unit ENUM('TRAY', 'PALLET', 'KG', 'CLP', 'USD') NOT NULL,
  metadata JSON NULL,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  deletedAt DATETIME(6) NULL,
  INDEX idx_transactions_type (type),
  INDEX idx_transactions_seasonId (seasonId),
  INDEX idx_transactions_producerId (producerId),
  INDEX idx_transactions_clientId (clientId),
  INDEX idx_transactions_deletedAt (deletedAt),
  CONSTRAINT fk_transactions_season FOREIGN KEY (seasonId) REFERENCES seasons(id) ON DELETE SET NULL,
  CONSTRAINT fk_transactions_producer FOREIGN KEY (producerId) REFERENCES producers(id) ON DELETE SET NULL,
  CONSTRAINT fk_transactions_client FOREIGN KEY (clientId) REFERENCES customers(id) ON DELETE SET NULL,
  CONSTRAINT fk_transactions_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_transactions_format FOREIGN KEY (formatId) REFERENCES formats(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de reception_packs
CREATE TABLE IF NOT EXISTS reception_packs (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  receptionTransactionId BIGINT NULL,
  varietyId INT NOT NULL,
  varietyName VARCHAR(255) NOT NULL,
  formatId INT NOT NULL,
  formatName VARCHAR(255) NOT NULL,
  trayId VARCHAR(255) NULL,
  trayLabel VARCHAR(255) NULL,
  traysQuantity INT NOT NULL DEFAULT 0,
  unitTrayWeight DECIMAL(12, 3) NOT NULL DEFAULT 0,
  traysTotalWeight DECIMAL(12, 3) NOT NULL DEFAULT 0,
  grossWeight DECIMAL(12, 3) NOT NULL DEFAULT 0,
  netWeightBeforeImpurities DECIMAL(12, 3) NOT NULL DEFAULT 0,
  impurityPercent DECIMAL(5, 2) NOT NULL DEFAULT 0,
  netWeight DECIMAL(12, 3) NOT NULL DEFAULT 0,
  pricePerKg DECIMAL(12, 3) NOT NULL DEFAULT 0,
  currency ENUM('CLP', 'USD') NOT NULL DEFAULT 'CLP',
  totalToPay DECIMAL(14, 3) NOT NULL DEFAULT 0,
  palletAssignments JSON NULL,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  deletedAt DATETIME(6) NULL,
  INDEX idx_reception_packs_receptionTransactionId (receptionTransactionId),
  INDEX idx_reception_packs_varietyId (varietyId),
  INDEX idx_reception_packs_deletedAt (deletedAt),
  CONSTRAINT fk_reception_packs_transaction FOREIGN KEY (receptionTransactionId) REFERENCES transactions(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de transaction_relations
CREATE TABLE IF NOT EXISTS transaction_relations (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  parentTransactionId BIGINT NULL,
  childTransactionId BIGINT NULL,
  childReceptionPackId INT UNSIGNED NULL,
  relationType ENUM('RECEPTION_PACK', 'TRAY_RECEPTION', 'TRAY_DEVOLUTION', 'PALLET_ASSIGNMENT', 'TRAY_ADJUSTMENT', 'PALLET_RELEASE', 'ADVANCE_TO_SETTLEMENT', 'RECEPTION_TO_SETTLEMENT') NOT NULL,
  context VARCHAR(255) NULL,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  deletedAt DATETIME(6) NULL,
  INDEX idx_transaction_relations_parentId (parentTransactionId),
  INDEX idx_transaction_relations_childId (childTransactionId),
  INDEX idx_transaction_relations_packId (childReceptionPackId),
  CONSTRAINT fk_transaction_relations_parent FOREIGN KEY (parentTransactionId) REFERENCES transactions(id) ON DELETE SET NULL,
  CONSTRAINT fk_transaction_relations_child FOREIGN KEY (childTransactionId) REFERENCES transactions(id) ON DELETE SET NULL,
  CONSTRAINT fk_transaction_relations_pack FOREIGN KEY (childReceptionPackId) REFERENCES reception_packs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de pallets (actualizada)
CREATE TABLE IF NOT EXISTS pallets (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  storageId VARCHAR(36) NULL,
  trayId VARCHAR(36) NULL,
  traysQuantity INT NOT NULL DEFAULT 0,
  capacity INT NOT NULL DEFAULT 0,
  weight DECIMAL(10, 3) NOT NULL DEFAULT 0,
  dispatchWeight DECIMAL(10, 3) NOT NULL DEFAULT 0,
  metadata JSON NULL,
  status ENUM('AVAILABLE', 'CLOSED', 'FULL', 'DISPATCHED') NOT NULL DEFAULT 'AVAILABLE',
  transactionId BIGINT NULL,
  varietyId INT NULL,
  formatId INT NULL,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  deletedAt DATETIME(6) NULL,
  INDEX idx_pallets_storageId (storageId),
  INDEX idx_pallets_status (status),
  INDEX idx_pallets_deletedAt (deletedAt),
  CONSTRAINT fk_pallets_storage FOREIGN KEY (storageId) REFERENCES storages(id) ON DELETE SET NULL,
  CONSTRAINT fk_pallets_tray FOREIGN KEY (trayId) REFERENCES trays(id) ON DELETE SET NULL,
  CONSTRAINT fk_pallets_transaction FOREIGN KEY (transactionId) REFERENCES transactions(id) ON DELETE SET NULL,
  CONSTRAINT fk_pallets_variety FOREIGN KEY (varietyId) REFERENCES varieties(id) ON DELETE SET NULL,
  CONSTRAINT fk_pallets_format FOREIGN KEY (formatId) REFERENCES formats(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

// ============ Main Seed Function ============

async function runSeed() {
  console.log("🚀 Iniciando seed de base de datos limpia...\n");
  console.log(`   Host: ${appConfig?.database?.host}`);
  console.log(`   Database: ${appConfig?.database?.database}`);
  console.log("");

  let connection: mysql.Connection | null = null;

  try {
    // Conectar a MySQL
    connection = await mysql.createConnection({
      host: appConfig?.database?.host,
      port: appConfig?.database?.port || 3306,
      user: appConfig?.database?.username,
      password: appConfig?.database?.password,
      database: appConfig?.database?.database,
      multipleStatements: true,
    });

    console.log("✅ Conexión establecida\n");

    // Crear tablas
    console.log("📝 Creando tablas...");
    const statements = CREATE_TABLES_SQL.split(";").filter((s) => s.trim());
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await connection.execute(statement);
        } catch (err: any) {
          // Ignorar errores de tabla ya existe
          if (!err.message.includes("already exists")) {
            console.warn(`   ⚠️  ${err.message}`);
          }
        }
      }
    }
    console.log("✅ Tablas creadas\n");

    // Seed usuario admin
    console.log("👤 Creando usuario administrador...");
    const personId = randomUUID();
    const userId = "5a8b58a0-4444-4f77-a007-000000000003";
    const hashedPassword = await bcrypt.hash("890890", 10);

    try {
      await connection.execute(
        `INSERT INTO persons (id, name, dni, createdAt, updatedAt) VALUES (?, ?, ?, NOW(), NOW())`,
        [personId, "Administrador", "99.999.999-9"]
      );
      await connection.execute(
        `INSERT INTO users (id, userName, pass, mail, rol, personId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [userId, "admin", hashedPassword, "admin@berriesapp.cl", "ADMIN", personId]
      );
      console.log("   ✓ Usuario admin creado (admin / 890890)\n");
    } catch (err: any) {
      if (err.message.includes("Duplicate")) {
        console.log("   ℹ️  Usuario admin ya existe\n");
      } else {
        throw err;
      }
    }

    // Seed temporadas
    console.log("🌱 Creando temporadas...");
    type SeasonRow = { id: string; name: string; startDate: string; endDate: string; active?: boolean };
    const seasons = loadSeedJson<SeasonRow[]>("seasons.json");
    let seasonsInserted = 0;
    for (const season of seasons) {
      try {
        await connection.execute(
          `INSERT INTO seasons (id, name, startDate, endDate, active, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
          [season.id || randomUUID(), season.name, season.startDate, season.endDate, season.active ? 1 : 0]
        );
        seasonsInserted++;
      } catch (err: any) {
        if (!err.message.includes("Duplicate")) {
          console.warn(`   ⚠️  ${err.message}`);
        }
      }
    }
    console.log(`   ✓ ${seasonsInserted} temporadas creadas\n`);

    console.log("═══════════════════════════════════════════════");
    console.log("✅ Seed completado exitosamente!");
    console.log("═══════════════════════════════════════════════");
    console.log("\n📋 Resumen:");
    console.log(`   • Usuario admin: admin / 890890`);
    console.log(`   • Temporadas: ${seasonsInserted}`);
    console.log("\n   ⚠️  No se crearon productores, personas, clientes,");
    console.log("       variedades, formatos ni bandejas");
    console.log("   ⚠️  La tabla productive_units está lista para usar\n");

  } catch (error) {
    console.error("❌ Error en seed:", error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runSeed();
