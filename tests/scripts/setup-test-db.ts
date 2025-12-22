import mysql from 'mysql2/promise';
import path from 'path';
import fs from 'fs';
import { DataSource } from 'typeorm';

/**
 * Script para configurar la base de datos de test
 * 
 * Ejecuta:
 * 1. Drop de la base de datos de test si existe
 * 2. Creación de la base de datos de test
 * 3. Ejecución de migraciones de TypeORM
 * 
 * Uso: npm run test:setup
 */

interface Config {
  database: {
    type: string;
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    synchronize: boolean;
    logging: boolean;
  };
}

async function setupTestDatabase() {
  console.log('🚀 Iniciando configuración de base de datos de test...\n');

  // 1. Leer configuración de test
  const configPath = path.join(process.cwd(), 'app.config.json');
  if (!fs.existsSync(configPath)) {
    console.error('❌ Error: app.config.json no encontrado');
    process.exit(1);
  }

  const config: Config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  const dbConfig = config.database;

  console.log(`📋 Configuración:`);
  console.log(`   Host: ${dbConfig.host}`);
  console.log(`   Port: ${dbConfig.port}`);
  console.log(`   Database: ${dbConfig.database}`);
  console.log(`   User: ${dbConfig.username}\n`);

  // 2. Conectar a MySQL (sin especificar base de datos)
  let connection: mysql.Connection | null = null;
  try {
    console.log('🔌 Conectando a MySQL...');
    connection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.username,
      password: dbConfig.password,
    });
    console.log('✅ Conectado a MySQL\n');

    // 3. Drop database si existe
    console.log(`🗑️  Eliminando base de datos '${dbConfig.database}' si existe...`);
    await connection.query(`DROP DATABASE IF EXISTS \`${dbConfig.database}\``);
    console.log('✅ Base de datos eliminada (si existía)\n');

    // 4. Crear database
    console.log(`📦 Creando base de datos '${dbConfig.database}'...`);
    await connection.query(`CREATE DATABASE \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log('✅ Base de datos creada\n');

    await connection.end();
    connection = null;

    // 5. Ejecutar migraciones con TypeORM
    console.log('🔄 Ejecutando migraciones de TypeORM...');

    // Importar entidades
    const User = require('../../data/entities/User').User;
    const Person = require('../../data/entities/Person').Person;
    const Audit = require('../../data/entities/Audit').Audit;
    const Formats = require('../../data/entities/Formats').Formats;

    // Crear DataSource para migraciones
    const dataSource = new DataSource({
      type: 'mysql',
      host: dbConfig.host,
      port: dbConfig.port,
      username: dbConfig.username,
      password: dbConfig.password,
      database: dbConfig.database,
      synchronize: true, // En test usamos synchronize para crear tablas automáticamente
      logging: false,
      entities: [User, Person, Audit, Formats],
    });

    await dataSource.initialize();
    console.log('✅ DataSource inicializado');

    // TypeORM con synchronize: true creará las tablas automáticamente
    console.log('✅ Tablas creadas\n');

    await dataSource.destroy();

    console.log('✅ Base de datos de test configurada exitosamente!\n');
    console.log('📝 Próximo paso: npm run test:seed\n');

  } catch (error) {
    console.error('❌ Error durante la configuración:', error);
    if (connection) {
      await connection.end();
    }
    process.exit(1);
  }
}

// Ejecutar script
setupTestDatabase();
