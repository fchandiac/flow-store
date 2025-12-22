/**
 * Setup para tests E2E
 * Se ejecuta una vez antes de todos los tests
 */

import { DataSource } from 'typeorm';
import path from 'path';
import fs from 'fs';
import { User } from '../data/entities/User';
import { Person } from '../data/entities/Person';
import { Audit } from '../data/entities/Audit';

// Leer configuración de test
function readTestConfig() {
  const configPath = path.join(process.cwd(), 'app.config.test.json');
  if (!fs.existsSync(configPath)) {
    throw new Error('app.config.test.json no encontrado');
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

/**
 * Recrear la base de datos de test
 */
async function setupTestDatabase() {
  const config = readTestConfig();

  const datasource = new DataSource({
    type: 'mysql',
    host: config.database.host,
    port: config.database.port,
    username: config.database.username,
    password: config.database.password,
    database: config.database.database,
    synchronize: false,
    logging: false,
    entities: [User, Person, Audit],
  });

  try {
    await datasource.initialize();
    console.log('✓ Conectado a base de datos de test');

    // Eliminar todas las tablas para recrearlas desde cero
    console.log('🔄 Limpiando base de datos de test...');
    await datasource.dropDatabase().catch(() => {
      // Si la BD no existe, eso está OK
    });

    // Recrear la base de datos (ya fue creada por dropDatabase)
    console.log('[Setup] ✨ Base de datos recreada');

    // Crear las tablas nuevamente
    const dataSourceWithSync = new DataSource({
      type: 'mysql',
      host: config.database.host,
      port: config.database.port,
      username: config.database.username,
      password: config.database.password,
      database: config.database.database,
      synchronize: true, // Sincronizar esquema
      logging: false,
      entities: [User, Person, Audit],
    });

    await dataSourceWithSync.initialize();
    console.log('✓ Base de datos de test preparada');
    await dataSourceWithSync.destroy();
  } catch (error) {
    console.error('❌ Error preparando base de datos de test:', error);
    throw error;
  } finally {
    await datasource.destroy();
  }
}

// Ejecutar setup
setupTestDatabase()
  .then(() => {
    console.log('✓ Setup completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('✗ Setup falló:', error);
    process.exit(1);
  });
