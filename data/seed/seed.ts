import * as fs from "fs";
import * as path from "path";
import * as mysql from "mysql2/promise";
import type { RowDataPacket } from "mysql2";
import { randomUUID } from "crypto";
import * as bcrypt from "bcrypt";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

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

interface SeedConfig {
  host: string;
  user: string;
  password: string;
  database: string;
  port?: number;
  ssl?: boolean;
}

const ENVIRONMENTS: Record<string, SeedConfig> = {
  test: {
    host: appConfig?.database?.host || process.env.DB_HOST_TEST || "192.168.1.73",
    user: appConfig?.database?.username || process.env.DB_USER_TEST || "root",
    password: appConfig?.database?.password || process.env.DB_PASSWORD_TEST || "berries1234",
    database: appConfig?.database?.database || process.env.DB_NAME_TEST || "berries-app-2",
    port: appConfig?.database?.port || parseInt(process.env.DB_PORT_TEST || "3306"),
  },
  production: {
    host: process.env.DB_HOST || "192.168.1.73",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "berries1234",
    database: process.env.DB_NAME || "berries-app-2",
    port: parseInt(process.env.DB_PORT || "3306"),
  },
  local: {
    host: appConfig?.database?.host || "192.168.1.73",
    user: appConfig?.database?.username || "root",
    password: appConfig?.database?.password || "berries1234",
    database: appConfig?.database?.database || "berries-app-2",
    port: appConfig?.database?.port || 3306,
    ssl: false,
  },
};

const RUN_SEED_TIMEOUT_MS = 120000;
const JSON_DIR = path.join(__dirname, "dataToSeed");

// ============ Types ============

type UserSeedRow = {
  id: string;
  userName: string;
  pass: string;
  mail?: string;
  rol: string;
};

type ProducerSeedRow = {
  name: string;
  dni: string;
  phone?: string;
  mail?: string;
};

type TraySeedRow = {
  name: string;
  weight: number;
  stock?: number;
  active?: boolean;
};

type FormatSeedRow = {
  name: string;
  description?: string | null;
  active?: boolean;
};

type VarietySeedRow = {
  name: string;
  description?: string;
};

type SeasonSeedRow = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  description?: string;
  active?: boolean;
};

type CustomerSeedRow = {
  name: string;
  dni: string;
  phone?: string;
  mail?: string;
};

type SupplierSeedRow = {
  name: string;
  dni: string;
  phone?: string;
  mail?: string;
  address?: string;
  alias?: string;
  supplierType?: "MANUFACTURER" | "DISTRIBUTOR" | "WHOLESALER" | "LOCAL";
  defaultPaymentTermDays?: number;
  notes?: string;
  bankAccounts: Array<{
    bankName: string;
    accountType: string;
    accountNumber: string;
    accountHolderName?: string;
    isPrimary?: boolean;
    notes?: string;
  }>;
};

// ============ Helpers ============

const loadSeedJson = <T>(fileName: string): T => {
  const filePath = path.join(JSON_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Seed JSON file not found: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, "utf8");
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    throw new Error(`Invalid JSON in ${filePath}: ${(error as Error).message}`);
  }
};

// ============ Seed Functions ============

/**
 * Seed admin user with their person
 */
const seedAdminUser = async (connection: mysql.Connection) => {
  console.log("\n👤 Seeding admin user...");

  const users = loadSeedJson<UserSeedRow[]>("users.json");
  
  if (users.length === 0) {
    console.warn("   ⚠️  No users found in users.json");
    return;
  }

  const admin = users[0]; // Solo el primer usuario (admin)
  
  const userId = admin.id || randomUUID();
  const userName = (admin.userName || "").trim();
  const plainPassword = (admin.pass || "").trim();
  const mail = (admin.mail || "").trim() || null;
  const rol = (admin.rol || "ADMIN").trim();

  if (!userName || !plainPassword) {
    console.warn("   ⚠️  Admin user missing userName or password");
    return;
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  // Create person for admin
  const personId = randomUUID();
  await connection.execute(
    `INSERT INTO persons (id, name, dni, phone, mail, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
    [personId, "Administrador", "99.999.999-9", null, mail]
  );

  // Create admin user
  await connection.execute(
    `INSERT INTO users (id, userName, pass, mail, rol, personId, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [userId, userName, hashedPassword, mail, rol, personId]
  );

  console.log(`   ✓ Created admin user: ${userName}`);
};

/**
 * Seed seasons from JSON
 */
const seedSeasons = async (connection: mysql.Connection) => {
  console.log("\n🌱 Seeding seasons...");

  const seasons = loadSeedJson<SeasonSeedRow[]>("seasons.json");

  let inserted = 0;

  for (const season of seasons) {
    const id = (season.id || randomUUID()).trim();
    const name = (season.name || "").trim();
    const startDate = (season.startDate || "").trim();
    const endDate = (season.endDate || "").trim();
    
    if (!name || !startDate || !endDate) {
      continue;
    }

    const description = (season.description || "").trim() || null;
    const active = season.active !== undefined ? Boolean(season.active) : false;

    await connection.execute(
      `INSERT INTO seasons (id, name, startDate, endDate, description, active, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [id, name, startDate, endDate, description, active]
    );

    inserted++;
  }

  console.log(`   ✓ Inserted ${inserted} seasons`);
};

/**
 * Seed trays from JSON
 */
const seedTrays = async (connection: mysql.Connection) => {
  console.log("\n🧺 Seeding trays...");

  const trays = loadSeedJson<TraySeedRow[]>("trays.json");

  let inserted = 0;
  const seenNames = new Set<string>();

  for (const tray of trays) {
    const name = (tray.name || "").trim();
    if (!name) continue;

    const key = name.toLowerCase();
    if (seenNames.has(key)) continue;

    const weight = Number(tray.weight);
    if (!Number.isFinite(weight) || weight <= 0) {
      console.warn(`   ⚠️  Skipping tray '${name}': invalid weight`);
      continue;
    }

    const stock = Number.isFinite(tray.stock) ? Number(tray.stock) : 0;
    const active = tray.active !== undefined ? Boolean(tray.active) : true;
    const id = randomUUID();

    await connection.execute(
      `INSERT INTO trays (id, name, weight, stock, active, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [id, name, weight, stock, active]
    );

    seenNames.add(key);
    inserted++;
  }

  console.log(`   ✓ Inserted ${inserted} trays`);
};

/**
 * Seed varieties from JSON (with price 0)
 */
const seedVarieties = async (connection: mysql.Connection) => {
  console.log("\n🍇 Seeding varieties...");

  const varieties = loadSeedJson<VarietySeedRow[]>("varieties.json");

  let inserted = 0;
  const seenNames = new Set<string>();

  for (const variety of varieties) {
    const name = (variety.name || "").trim();
    if (!name) continue;

    const key = name.toLowerCase();
    if (seenNames.has(key)) continue;

    // All prices set to 0 as requested
    const priceCLP = 0;
    const priceUSD = 0;
    const currency = "CLP";

    await connection.execute(
      `INSERT INTO varieties (name, priceCLP, priceUSD, currency, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, NOW(), NOW())`,
      [name, priceCLP, priceUSD, currency]
    );

    seenNames.add(key);
    inserted++;
  }

  console.log(`   ✓ Inserted ${inserted} varieties`);
};

/**
 * Seed formats from JSON (with price 0)
 */
const seedFormats = async (connection: mysql.Connection) => {
  console.log("\n📦 Seeding formats...");

  const formats = loadSeedJson<FormatSeedRow[]>("formats.json");

  let inserted = 0;
  const seenNames = new Set<string>();

  for (const format of formats) {
    const name = (format.name || "").trim();
    if (!name) continue;

    const key = name.toLowerCase();
    if (seenNames.has(key)) continue;

    const description = typeof format.description === "string" ? format.description.trim() : null;
    const active = format.active !== undefined ? Boolean(format.active) : true;

    await connection.execute(
      `INSERT INTO formats (name, description, active, createdAt, updatedAt)
       VALUES (?, ?, ?, NOW(), NOW())`,
      [name, description || null, active]
    );

    seenNames.add(key);
    inserted++;
  }

  console.log(`   ✓ Inserted ${inserted} formats`);
};

/**
 * Seed producers from JSON (creating persons first)
 */
const seedProducers = async (connection: mysql.Connection) => {
  console.log("\n👨‍🌾 Seeding producers...");

  const producers = loadSeedJson<ProducerSeedRow[]>("producers.json");

  let inserted = 0;
  const seenDnis = new Set<string>();

  for (const producer of producers) {
    const name = (producer.name || "").trim();
    const dni = (producer.dni || "").trim();
    
    if (!name || !dni) continue;

    // Skip duplicates by DNI
    const dniKey = dni.toLowerCase();
    if (seenDnis.has(dniKey)) continue;

    const phone = (producer.phone || "").trim() || null;
    const mail = (producer.mail || "").trim() || null;

    // Create person first
    const personId = randomUUID();
    await connection.execute(
      `INSERT INTO persons (id, name, dni, phone, mail, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [personId, name, dni, phone, mail]
    );

    // Create producer linked to person
    const producerId = randomUUID();
    await connection.execute(
      `INSERT INTO producers (id, name, dni, phone, mail, personId, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [producerId, name, dni, phone, mail, personId]
    );

    seenDnis.add(dniKey);
    inserted++;
  }

  console.log(`   ✓ Inserted ${inserted} producers (with persons)`);
};

/**
 * Seed customers from JSON (creating persons first)
 */
const seedCustomers = async (connection: mysql.Connection) => {
  console.log("\n🛒 Seeding customers...");

  const customers = loadSeedJson<CustomerSeedRow[]>("customers.json");

  let inserted = 0;
  const seenDnis = new Set<string>();

  for (const customer of customers) {
    const name = (customer.name || "").trim();
    const dni = (customer.dni || "").trim();
    
    if (!name || !dni) continue;

    // Skip duplicates by DNI
    const dniKey = dni.toLowerCase();
    if (seenDnis.has(dniKey)) continue;

    const phone = (customer.phone || "").trim() || null;
    const mail = (customer.mail || "").trim() || null;

    // Check if person already exists (might have been created as producer)
    const [existingPerson] = await connection.execute(
      "SELECT id FROM persons WHERE dni = ? LIMIT 1",
      [dni]
    ) as [RowDataPacket[], any];

    let personId: string;
    
    if (existingPerson.length > 0) {
      personId = existingPerson[0].id;
    } else {
      // Create person first
      personId = randomUUID();
      await connection.execute(
        `INSERT INTO persons (id, name, dni, phone, mail, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
        [personId, name, dni, phone, mail]
      );
    }

    // Create customer linked to person
    const customerId = randomUUID();
    await connection.execute(
      `INSERT INTO customers (id, personId, createdAt, updatedAt)
       VALUES (?, ?, NOW(), NOW())`,
      [customerId, personId]
    );

    seenDnis.add(dniKey);
    inserted++;
  }

  console.log(`   ✓ Inserted ${inserted} customers (with persons)`);
};

const seedSuppliers = async (connection: mysql.Connection) => {
  console.log("\n🏭 Seeding suppliers...");

  const suppliers: SupplierSeedRow[] = [
    {
      name: "Distribuidora Andes SpA",
      dni: "76.123.456-7",
      phone: "+56 2 2345 6789",
      mail: "contacto@andesdistrib.cl",
      address: "Av. Apoquindo 4501, Las Condes, Santiago",
      alias: "Andes Distrib",
      supplierType: "DISTRIBUTOR",
      defaultPaymentTermDays: 30,
      notes: "Proveedor principal de insumos de embalaje.",
      bankAccounts: [
        {
          bankName: "Banco Santander Chile",
          accountType: "Cuenta Corriente",
          accountNumber: "12345678-9",
          accountHolderName: "Distribuidora Andes SpA",
          isPrimary: true,
          notes: "Cuenta operaciones nacionales",
        },
      ],
    },
    {
      name: "Agroinsumos del Sur Ltda.",
      dni: "77.987.654-3",
      phone: "+56 9 8765 4321",
      mail: "ventas@agroinsumos-sur.cl",
      address: "Camino Viejo a Talca KM 4, Chillán",
      alias: "Agro Sur",
      supplierType: "MANUFACTURER",
      defaultPaymentTermDays: 45,
      notes: "Especialistas en fertilizantes orgánicos.",
      bankAccounts: [
        {
          bankName: "Banco de Crédito e Inversiones",
          accountType: "Cuenta Corriente",
          accountNumber: "87654321-0",
          accountHolderName: "Agroinsumos del Sur Ltda.",
          isPrimary: true,
        },
        {
          bankName: "Banco del Estado de Chile",
          accountType: "Cuenta Vista",
          accountNumber: "90012345",
          accountHolderName: "Agroinsumos del Sur Ltda.",
          notes: "Cuenta para pagos rápidos",
        },
      ],
    },
    {
      name: "Servicios Logísticos Cordillera EIRL",
      dni: "78.654.321-5",
      phone: "+56 72 234 5566",
      mail: "facturas@logisticacordillera.cl",
      address: "Ruta 5 Sur KM 284, Linares",
      alias: "Logística Cordillera",
      supplierType: "LOCAL",
      defaultPaymentTermDays: 15,
      notes: "Transporte regional para entregas urgentes.",
      bankAccounts: [
        {
          bankName: "Scotiabank Chile",
          accountType: "Cuenta Corriente",
          accountNumber: "44556677-1",
          accountHolderName: "Servicios Logísticos Cordillera EIRL",
          isPrimary: true,
        },
      ],
    },
  ];

  let inserted = 0;

  for (const supplier of suppliers) {
    const name = (supplier.name || "").trim();
    const dni = (supplier.dni || "").trim();

    if (!name || !dni) {
      continue;
    }

    const phone = (supplier.phone || "").trim() || null;
    const mail = (supplier.mail || "").trim() || null;
    const address = (supplier.address || "").trim() || null;
    const alias = (supplier.alias || "").trim() || null;
    const supplierType = supplier.supplierType || "LOCAL";
    const defaultPaymentTermDays = Number.isFinite(supplier.defaultPaymentTermDays)
      ? Number(supplier.defaultPaymentTermDays)
      : 0;
    const notes = (supplier.notes || "").trim() || null;
    const bankAccountsJson = supplier.bankAccounts && supplier.bankAccounts.length
      ? JSON.stringify(supplier.bankAccounts)
      : null;

    const [existingPersonRows] = (await connection.execute(
      "SELECT id FROM persons WHERE dni = ? LIMIT 1",
      [dni]
    )) as [RowDataPacket[], any];

    let personId: string;

    if (existingPersonRows.length > 0) {
      personId = existingPersonRows[0].id;
      await connection.execute(
        `UPDATE persons
         SET name = ?, phone = ?, mail = ?, address = ?, bankAccounts = ?, updatedAt = NOW()
         WHERE id = ?`,
        [name, phone, mail, address, bankAccountsJson, personId]
      );
    } else {
      personId = randomUUID();
      await connection.execute(
        `INSERT INTO persons (id, name, dni, phone, mail, address, bankAccounts, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [personId, name, dni, phone, mail, address, bankAccountsJson]
      );
    }

    const [existingSupplierRows] = (await connection.execute(
      "SELECT id FROM suppliers WHERE personId = ? LIMIT 1",
      [personId]
    )) as [RowDataPacket[], any];

    if (existingSupplierRows.length > 0) {
      await connection.execute(
        `UPDATE suppliers
         SET supplierType = ?, alias = ?, defaultPaymentTermDays = ?, isActive = 1, notes = ?, updatedAt = NOW()
         WHERE id = ?`,
        [supplierType, alias, defaultPaymentTermDays, notes, existingSupplierRows[0].id]
      );
      continue;
    }

    const supplierId = randomUUID();
    await connection.execute(
      `INSERT INTO suppliers (id, personId, supplierType, alias, defaultPaymentTermDays, isActive, notes, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, 1, ?, NOW(), NOW())`,
      [supplierId, personId, supplierType, alias, defaultPaymentTermDays, notes]
    );

    inserted++;
  }

  console.log(`   ✓ Inserted or updated ${inserted} suppliers`);
};

// ============ SQL File Execution ============

const executeSqlFile = async (
  connection: mysql.Connection,
  filePath: string,
  name: string
): Promise<void> => {
  try {
    console.log(`\n📄 Executing ${name}...`);
    const sql = fs.readFileSync(filePath, "utf8");

    // Remove comments and split by semicolon
    const lines = sql.split("\n");
    let cleanedSql = "";
    
    for (const line of lines) {
      const commentIndex = line.indexOf("--");
      if (commentIndex === -1) {
        cleanedSql += line + "\n";
      } else if (commentIndex > 0) {
        cleanedSql += line.substring(0, commentIndex) + "\n";
      }
    }

    // Split by semicolon and filter out empty statements
    const statements = cleanedSql
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0);

    let executedCount = 0;
    for (const statement of statements) {
      try {
        await connection.execute(statement);
        executedCount++;
      } catch (error: any) {
        if (!statement.includes("SHOW TABLES") && !statement.includes("SELECT")) {
          console.warn(`⚠️  Statement failed: ${statement.substring(0, 50)}...`);
          console.warn(`   Error: ${error.message}`);
        }
      }
    }

    console.log(`✓ ${name} completed (${executedCount} statements)`);
  } catch (error: any) {
    console.error(`❌ Error reading/executing ${name}:`, error.message);
    throw error;
  }
};

// ============ Main Seed Runner ============

const runSeed = async (environment: "test" | "production" | "local" = "test") => {
  const config = ENVIRONMENTS[environment];

  if (!config) {
    console.error(`❌ Unknown environment: ${environment}`);
    console.error(`Available environments: ${Object.keys(ENVIRONMENTS).join(", ")}`);
    process.exit(1);
  }

  let connection: mysql.Connection | null = null;

  try {
    console.log(`\n🚀 Starting seed process for [${environment.toUpperCase()}]`);
    console.log(`📍 Database: ${config.database} @ ${config.host}:${config.port || 'default'}`);
    console.log(`�� User: ${config.user}`);
    console.log("───────────────────────────────────────────────────────────");

    // Create connection
    console.log("\n🔗 Connecting to database...");
    connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
    });
    console.log("✓ Connected to database");

    // Disable foreign key checks for seeding
    console.log("\n🔒 Disabling foreign key checks...");
    await connection.execute("SET FOREIGN_KEY_CHECKS = 0");

    // Execute SQL files to create all tables
    const sqlDir = path.join(__dirname, "sql");

    await executeSqlFile(
      connection,
      path.join(sqlDir, "drop-all-tables.sql"),
      "Drop All Tables"
    );

    await executeSqlFile(
      connection,
      path.join(sqlDir, "create-tables.sql"),
      "Create Tables"
    );

    // Seed data in order
    console.log("\n📚 Loading seed data from JSON files...");
    
    // 1. Admin user (with person)
    await seedAdminUser(connection);
    
    // 2. Season (active)
    await seedSeasons(connection);
    
    // 3. Trays
    await seedTrays(connection);
    
    // 4. Varieties (price 0)
    await seedVarieties(connection);
    
    // 5. Formats (price 0)
    await seedFormats(connection);
    
    // 6. Producers (with persons)
    await seedProducers(connection);
    
    // 7. Customers (with persons)
    await seedCustomers(connection);

    // 8. Suppliers (with persons + bank accounts)
    await seedSuppliers(connection);

    // Re-enable foreign key checks
    console.log("\n🔓 Re-enabling foreign key checks...");
    await connection.execute("SET FOREIGN_KEY_CHECKS = 1");

    console.log("\n───────────────────────────────────────────────────────────");
    console.log("✅ Seed process completed successfully!");
    console.log(`📊 Database [${environment.toUpperCase()}] is now ready`);
    console.log("\n📋 Seeded data summary:");
    console.log("   - 1 Admin user (admin)");
    console.log("   - Seasons from seasons.json");
    console.log("   - Trays from trays.json");
    console.log("   - Varieties from varieties.json (price 0)");
    console.log("   - Formats from formats.json");
    console.log("   - Producers from producers.json (with persons)");
    console.log("   - Customers from customers.json (with persons)");
    console.log("   - Suppliers (3 predefined, with bank accounts)");
    console.log("\n📭 Empty tables:");
    console.log("   - transactions, reception_packs, transaction_relations");
    console.log("   - audits, permissions, admin_bank_accounts");
    console.log("   - storages, pallets, producer_bank_accounts");

    await connection.end();
    process.exit(0);
  } catch (error: any) {
    console.error("\n───────────────────────────────────────────────────────────");
    console.error("❌ Seed process failed:");
    console.error(error.message);
    console.error(error.stack);

    if (connection) {
      try {
        await connection.end();
      } catch (closeError) {
        console.error("Error closing connection:", closeError);
      }
    }

    process.exit(1);
  }
};

// Parse command line arguments
const environment = (process.argv[2] || "test") as "test" | "production" | "local";

// Set process timeout
setTimeout(() => {
  console.error(`\n❌ Seed execution timeout (${RUN_SEED_TIMEOUT_MS / 1000} seconds)`);
  process.exit(1);
}, RUN_SEED_TIMEOUT_MS);

runSeed(environment);
