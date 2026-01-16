import "reflect-metadata";
import { DataSource } from "typeorm";
// FlowStore Entities
import { User } from "./entities/User";
import { Person } from "./entities/Person";
import { Audit } from "./entities/Audit";
import { Permission } from "./entities/Permission";
import { Company } from "./entities/Company";
import { Branch } from "./entities/Branch";
import { Storage } from "./entities/Storage";
import { PointOfSale } from "./entities/PointOfSale";
import { CashSession } from "./entities/CashSession";
import { Customer } from "./entities/Customer";
import { Supplier } from "./entities/Supplier";
import { Category } from "./entities/Category";
import { Product } from "./entities/Product";
import { ProductVariant } from "./entities/ProductVariant";
import { Unit } from "./entities/Unit";
import { Attribute } from "./entities/Attribute";
import { PriceList } from "./entities/PriceList";
import { PriceListItem } from "./entities/PriceListItem";
import { Tax } from "./entities/Tax";
import { Transaction } from "./entities/Transaction";
import { TransactionLine } from "./entities/TransactionLine";
import { CostCenter } from "./entities/CostCenter";
import { Budget } from "./entities/Budget";
import { AccountingAccount } from "./entities/AccountingAccount";
import { AccountingRule } from "./entities/AccountingRule";
import { ExpenseCategory } from "./entities/ExpenseCategory";
import { AccountingPeriod } from "./entities/AccountingPeriod";
import { Employee } from "./entities/Employee";
import { OrganizationalUnit } from "./entities/OrganizationalUnit";
import { AuditSubscriber } from "./subscribers/AuditSubscriber";
import fs from "fs";
import path from "path";

const getConfigPath = (): string => {
  // Determine config file based on environment
  const nodeEnv = process.env.NODE_ENV;
  let configFileName = 'app.config.json'; // default for development
  
  if (nodeEnv === 'test') {
    configFileName = 'app.config.json';
  } else if (nodeEnv === 'production') {
    configFileName = 'app.config.prod.json';
  }
  
  console.log(`[DB] Starting... NODE_ENV=${nodeEnv}, looking for: ${configFileName}`);
  console.log(`[DB] CWD: ${process.cwd()}`);
  console.log(`[DB] CONFIG_PATH env: ${process.env.CONFIG_PATH}`);
  
  // Check if CONFIG_PATH is set (for tests)
  if (process.env.CONFIG_PATH && fs.existsSync(process.env.CONFIG_PATH)) {
    console.log(`[DB] Using CONFIG_PATH: ${process.env.CONFIG_PATH}`);
    return process.env.CONFIG_PATH;
  }
  
  const possiblePaths = [
    path.resolve(process.cwd(), configFileName),
    path.resolve(process.cwd(), "..", configFileName),
    path.resolve(process.cwd(), "..", "..", configFileName),
  ];
  
  console.log(`[DB] Checking paths:`, possiblePaths.map(p => ({ path: p, exists: fs.existsSync(p) })));
  
  for (const configPath of possiblePaths) {
    if (fs.existsSync(configPath)) {
      console.log(`[DB] ✓ Found ${configFileName} at: ${configPath}`);
      return configPath;
    }
  }
  
  console.warn(`[DB] ✗ ${configFileName} not found, using fallback`);
  return path.resolve(process.cwd(), configFileName); // Fallback
};

const readAppConfig = (): any => {
  try {
    const configPath = getConfigPath();
    console.log(`[DB] Reading config from: ${configPath}`);
    const raw = fs.readFileSync(configPath, "utf-8");
    const config = JSON.parse(raw);
    console.log(`[DB] Database name: ${config?.dataBase?.name || 'undefined'}`);
    console.log(`[DB] NODE_ENV: ${process.env.NODE_ENV}`);
    return config;
  } catch (err) {
    console.error("Error leyendo app.config.json:", err);
    return null;
  }
};

const appConfig = readAppConfig();

/**
 * 🔥 SINGLETON GLOBAL PARA TYPEORM
 * 
 * CRÍTICO EN NEXT.JS:
 * - Evita "ER_CON_COUNT_ERROR: Too many connections"
 * - Previene múltiples inicializaciones del DataSource
 * - Previene registros duplicados del subscriber
 * - Aumenta estabilidad en serverless y edge functions
 * 
 * Next.js re-ejecuta módulos en:
 * - dev mode (hot reload)
 * - Server Actions
 * - Route Handlers
 * - SSR/RSC
 * 
 * Sin singleton = 5-60 conexiones abiertas y crashes
 */
// Usar variables de módulo para singleton (más confiable que globalThis en Next.js)
let globalDataSource: DataSource | null = null;
let initializationPromise: Promise<DataSource> | null = null;

/**
 * Obtiene la conexión a la base de datos (singleton seguro para Next.js)
 * 
 * IMPORTANTE:
 * - Se crea una única vez en todo el ciclo de vida de la aplicación
 * - Se inicializa una única vez aunque se llame múltiples veces
 * - Maneja reintentos automáticos en caso de desconexión
 * - Compatible con dev mode, producción, serverless y cold starts
 * 
 * @returns {Promise<DataSource>} - La misma instancia de conexión siempre
 */
export const getDb = async (retries: number = 0): Promise<DataSource> => {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000 * Math.pow(2, retries); // Exponential backoff: 1s, 2s, 4s

  try {
    // 1️⃣ CREA EL DATASOURCE SI NO EXISTE (singleton)
    if (!globalDataSource) {
      console.log("[DB] Creando nueva instancia de DataSource (singleton)...");
      globalDataSource = new DataSource({
        type: "mysql",
        host: appConfig?.dataBase?.host || "localhost",
        port: appConfig?.dataBase?.port || 3306,
        username: appConfig?.dataBase?.username || "root",
        password: appConfig?.dataBase?.password || "",
        database: appConfig?.dataBase?.name || "next-start",
        synchronize: process.env.NODE_ENV === 'test' ? false : (appConfig?.database?.synchronize ?? false), // Desactivar synchronize en tests
        logging: appConfig?.database?.logging ?? false,
        ssl: appConfig?.database?.ssl || appConfig?.dataBase?.ssl ? {
          rejectUnauthorized: appConfig?.database?.ssl?.rejectUnauthorized ?? false
        } : false,
        entities: [
          User, Person, Audit, Permission,
          Company, Branch, Storage, PointOfSale, CashSession,
          Customer, Supplier,
          Category, Product, ProductVariant, Unit, Attribute,
          PriceList, PriceListItem, Tax,
          Transaction, TransactionLine,
          CostCenter, Budget,
          Employee,
          OrganizationalUnit,
          AccountingAccount, AccountingRule, ExpenseCategory, AccountingPeriod
        ],
        subscribers: [AuditSubscriber],
        migrations: [],
        extra: {
          connectionLimit: 20,
          waitForConnections: true,
          queueLimit: 0,
          enableKeepAlive: true,
          keepAliveInitialDelay: 10000,
          decimalNumbers: true,
          connectTimeout: 20000,
          idleTimeout: 10000,
          authPlugins: {
            mysql_clear_password: () => () => appConfig?.dataBase?.password || "",
          }
        }
      });
    }

    // 2️⃣ INICIALIZA SI NO ESTÁ INICIALIZADO (solo UNA VEZ, con bloqueo de promesa)
    if (!globalDataSource.isInitialized) {
      if (!initializationPromise) {
        console.log("[DB] Inicializando DataSource...");
        initializationPromise = globalDataSource.initialize().then(ds => {
          console.log("[DB] ✅ DataSource inicializado correctamente");
          return ds;
        }).catch(err => {
          initializationPromise = null; // Resetear para permitir reintento
          throw err;
        });
      }
      await initializationPromise;
    } else {
      // Verificar si la conexión sigue viva (ping rápido) para evitar ECONNRESET
      try {
        await globalDataSource.query('SELECT 1');
      } catch (pingError: any) {
        console.warn("[DB] Conexión existente falló el ping, re-inicializando...", pingError?.message);
        try {
          initializationPromise = null; // Resetear promesa
          await globalDataSource.destroy();
          initializationPromise = globalDataSource.initialize();
          await initializationPromise;
          console.log("[DB] ✅ DataSource re-inicializado correctamente tras fallo de ping");
        } catch (reinitError) {
          console.error("[DB] Error crítico re-inicializando tras fallo de ping:", reinitError);
          throw reinitError;
        }
      }
    }

    return globalDataSource;
  } catch (error: any) {
    const errorCode = error?.code || error?.driverError?.code;
    const isConnectionError = 
      errorCode === 'ECONNRESET' || 
      errorCode === 'ENOTFOUND' || 
      errorCode === 'ETIMEDOUT' || 
      errorCode === 'PROTOCOL_CONNECTION_LOST' ||
      errorCode === 'ER_CON_COUNT_ERROR' ||
      error?.message?.includes('too many connections');

    // Reintentar si es error de conexión y tenemos reintentos disponibles
    if (isConnectionError && retries < MAX_RETRIES) {
      console.warn(
        `[DB] Error de conexión: ${errorCode}. Reintentando en ${RETRY_DELAY}ms... (Intento ${retries + 1}/${MAX_RETRIES})`
      );

      // Esperar antes de reintentar
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));

      // Destroy y reset si está inicializado pero falló
      if (globalDataSource?.isInitialized) {
        try {
          await globalDataSource.destroy();
          console.log("[DB] Conexión destruida después del error");
        } catch (destroyError) {
          console.warn("[DB] Error al destruir conexión:", destroyError);
        }
      }

      // Resetear el singleton para reintentar
      globalDataSource = null;

      // Reintentar recursivamente
      return getDb(retries + 1);
    }

    // Error sin recuperación
    console.error("[DB] ❌ Fallo de conexión sin recuperación:", error);
    throw error;
  }
};

/**
 * Limpia la conexión (útil para testing o shutdown)
 */
export const closeDb = async (): Promise<void> => {
  if (globalDataSource?.isInitialized) {
    await globalDataSource.destroy();
    globalDataSource = null;
    console.log("[DB] Conexión cerrada");
  }
};
