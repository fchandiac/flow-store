#!/usr/bin/env node

/**
 * Script to synchronize databases between test and production environments
 * Usage: npm run sync-db -- --from=test --to=production
 * Or: npm run sync-db -- --from=production --to=test
 */

import { createConnection } from 'mysql2/promise';
import * as fs from 'fs';
import * as path from 'path';

interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

const configs = {
  test: {
    host: 'localhost',
    port: 3306,
    username: 'root',
    password: 'redbull90',
    database: 'electnextstart_test'
  },
  production: {
    host: '72.61.6.232',
    port: 3306,
    username: 'next-elect',
    password: 'redbull90',
    database: 'next-start'
  }
};

const tables = [
  'users',
  'persons',
  'audits',
  'varieties',
  'formats',
  'seasons',
  'producers',
  'customers',
  'storages',
  'trays',
  'pallets',
  'transactions'
];

async function getConnection(config: DatabaseConfig) {
  return await createConnection({
    host: config.host,
    port: config.port,
    user: config.username,
    password: config.password,
    database: config.database
  });
}

async function exportTable(connection: any, tableName: string): Promise<any[]> {
  // Check if table has deletedAt column
  const [columns] = await connection.execute(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = 'deletedAt'",
    [tableName]
  );
  
  const hasDeletedAt = columns.length > 0;
  const whereClause = hasDeletedAt ? 'WHERE deletedAt IS NULL' : '';
  
  const [rows] = await connection.execute(`SELECT * FROM ${tableName} ${whereClause}`);
  return rows as any[];
}

async function importTable(connection: any, tableName: string, data: any[]) {
  if (data.length === 0) {
    console.log(`No data to import for table ${tableName}`);
    return;
  }

  // Get target table columns
  const [columns] = await connection.execute(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
    [tableName]
  );
  const targetColumns = columns.map((col: any) => col.COLUMN_NAME);

  // Disable foreign key checks
  await connection.execute('SET FOREIGN_KEY_CHECKS = 0');

  try {
    // Clear existing data
    await connection.execute(`DELETE FROM ${tableName}`);

    // Insert new data, only using columns that exist in target
    for (const row of data) {
      const existingColumns = Object.keys(row).filter(col => targetColumns.includes(col));
      if (existingColumns.length === 0) continue;

      const columns = existingColumns.join(', ');
      const placeholders = existingColumns.map(() => '?').join(', ');
      const values = existingColumns.map(col => row[col]);

      const query = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`;
      await connection.execute(query, values);
    }

    console.log(`Imported ${data.length} rows into ${tableName} (using ${targetColumns.length} columns)`);
  } finally {
    // Re-enable foreign key checks
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
  }
}

async function syncDatabases(from: 'test' | 'production', to: 'test' | 'production') {
  console.log(`Starting database synchronization from ${from} to ${to}...`);

  const sourceConfig = configs[from];
  const targetConfig = configs[to];

  let sourceConnection: any = null;
  let targetConnection: any = null;

  try {
    console.log(`Connecting to source database (${from})...`);
    sourceConnection = await getConnection(sourceConfig);

    console.log(`Connecting to target database (${to})...`);
    targetConnection = await getConnection(targetConfig);

    for (const table of tables) {
      console.log(`\nSyncing table: ${table}`);

      // Check if table exists in source
      const [sourceTables] = await sourceConnection.execute(
        "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
        [table]
      );
      if (sourceTables.length === 0) {
        console.log(`Table ${table} does not exist in source database, skipping...`);
        continue;
      }

      // Check if table exists in target
      const [targetTables] = await targetConnection.execute(
        "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
        [table]
      );
      if (targetTables.length === 0) {
        console.log(`Table ${table} does not exist in target database, skipping...`);
        continue;
      }

      // Export from source
      const data = await exportTable(sourceConnection, table);
      console.log(`Exported ${data.length} rows from ${table}`);

      // Import to target
      await importTable(targetConnection, table, data);
    }

    console.log('\n✅ Database synchronization completed successfully!');

  } catch (error) {
    console.error('❌ Database synchronization failed:', error);
    throw error;
  } finally {
    if (sourceConnection) await sourceConnection.end();
    if (targetConnection) await targetConnection.end();
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const fromIndex = args.indexOf('--from');
  const toIndex = args.indexOf('--to');

  if (fromIndex === -1 || toIndex === -1) {
    console.log('Usage: npm run sync-db -- --from=test --to=production');
    console.log('Or:    npm run sync-db -- --from=production --to=test');
    process.exit(1);
  }

  const from = args[fromIndex + 1] as 'test' | 'production';
  const to = args[toIndex + 1] as 'test' | 'production';

  if (!['test', 'production'].includes(from) || !['test', 'production'].includes(to)) {
    console.error('Invalid source or target. Must be "test" or "production"');
    process.exit(1);
  }

  if (from === to) {
    console.error('Source and target cannot be the same');
    process.exit(1);
  }

  try {
    await syncDatabases(from, to);
  } catch (error) {
    console.error('Synchronization failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}