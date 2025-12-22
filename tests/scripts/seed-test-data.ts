import mysql from 'mysql2/promise';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

/**
 * Script para poblar la base de datos de test con datos iniciales
 * 
 * Crea:
 * - 3 usuarios de test: test_admin, test_user, test_viewer
 * - Cada uno con su persona asociada
 * - Passwords conocidos para testing
 * 
 * Uso: npm run test:seed
 */

interface Config {
  database: {
    type: string;
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
  };
}

interface TestUser {
  userName: string;
  password: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

const TEST_USERS: TestUser[] = [
  {
    userName: 'test_admin',
    password: 'Admin123!',
    email: 'test.admin@example.com',
    firstName: 'Admin',
    lastName: 'Test',
    role: 'ADMIN',
  },
  {
    userName: 'test_user',
    password: 'User123!',
    email: 'test.user@example.com',
    firstName: 'User',
    lastName: 'Test',
    role: 'OPERATOR',
  },
  {
    userName: 'test_viewer',
    password: 'Viewer123!',
    email: 'test.viewer@example.com',
    firstName: 'Viewer',
    lastName: 'Test',
    role: 'OPERATOR',
  },
];

async function seedTestData() {
  console.log('🌱 Iniciando seed de datos de test...\n');

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
  console.log(`   Database: ${dbConfig.database}\n`);

  // 2. Conectar a la base de datos de test
  let connection: mysql.Connection | null = null;
  try {
    console.log('🔌 Conectando a la base de datos de test...');
    connection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.username,
      password: dbConfig.password,
      database: dbConfig.database,
    });
    console.log('✅ Conectado a la base de datos\n');

    // 3. Limpiar datos existentes
    console.log('🧹 Limpiando datos existentes...');
    try {
      await connection.query('DELETE FROM audits');
      await connection.query('DELETE FROM users');
      await connection.query('DELETE FROM persons');
      console.log('✅ Datos limpiados\n');
    } catch (error) {
      console.log('⚠️  Tablas no existen aún, continuando...\n');
    }

    // 4. Crear usuarios de test
    console.log('👥 Creando usuarios de test...\n');

    for (const testUser of TEST_USERS) {
      console.log(`   📝 Creando usuario: ${testUser.userName}`);

      // Generar IDs
      const personId = randomUUID();
      const userId = randomUUID();

      // Hash del password
      const hashedPassword = await bcrypt.hash(testUser.password, 10);

      // Crear persona
      await connection.query(
        `INSERT INTO persons (
          id, name, dni
        ) VALUES (?, ?, ?)`,
        [personId, `${testUser.firstName} ${testUser.lastName}`, `DNI${Math.floor(Math.random() * 10000000)}`]
      );

      // Crear usuario
      await connection.query(
        `INSERT INTO users (
          id, userName, pass, mail, rol, personId
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, testUser.userName, hashedPassword, testUser.email, testUser.role, personId]
      );

      console.log(`   ✅ Usuario creado: ${testUser.userName}`);
      console.log(`      Email: ${testUser.email}`);
      console.log(`      Password: ${testUser.password}`);
      console.log(`      Role: ${testUser.role}\n`);
    }

    // 4. Crear formatos de test
    console.log('📦 Creando formatos de test...');

    const formats = [
      { name: 'IQF', description: 'Congelado individual rápido' },
      { name: 'BLOCK', description: 'Producto congelado en bloque' },
      { name: 'JUGO', description: 'Producto destinado a jugo o pulpa' },
      { name: 'FRESCO', description: 'Producto fresco sin congelar' },
      { name: 'PURE', description: 'Pulpa o puré de fruta' },
    ];

    for (const format of formats) {
      await connection.query(
        'INSERT INTO formats (name, description, active, createdAt, updatedAt) VALUES (?, ?, true, NOW(), NOW()) ON DUPLICATE KEY UPDATE name = name',
        [format.name, format.description]
      );
      console.log(`   ✅ Formato '${format.name}' creado`);
    }

    // 5. Mostrar resumen
    const [userCount] = await connection.query('SELECT COUNT(*) as count FROM users');
    const [personCount] = await connection.query('SELECT COUNT(*) as count FROM persons');
    const [formatCount] = await connection.query('SELECT COUNT(*) as count FROM formats');

    console.log('📊 Resumen:');
    console.log(`   Usuarios creados: ${(userCount as any)[0].count}`);
    console.log(`   Personas creadas: ${(personCount as any)[0].count}`);
    console.log(`   Formatos creados: ${(formatCount as any)[0].count}\n`);

    console.log('✅ Seed completado exitosamente!\n');
    console.log('📝 Credenciales de test:');
    console.log('   test_admin / Admin123!');
    console.log('   test_user / User123!');
    console.log('   test_viewer / Viewer123!\n');

    console.log('📝 Próximo paso: npm run test:e2e\n');

    await connection.end();
  }
  catch (error) {
    console.error('❌ Error durante el seed:', error);
    if (connection) {
      await connection.end();
    }
    process.exit(1);
  }
}

// Ejecutar script
seedTestData();
