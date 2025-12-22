import mysql, { FieldPacket, ResultSetHeader } from 'mysql2/promise';
import bcrypt from 'bcryptjs';

type InsertResult = ResultSetHeader;

export interface ReceptionUiSeedData {
  adminUser: { id: string; userName: string; };
  testUser: { id: string; userName: string; };
  season: { id: string; name: string; };
  producer: { id: string; name: string; label: string; };
  tray: { id: string; name: string; weight: number; };
  storage: { id: string; name: string; };
  pallets: Array<{ id: number }>;
  format: { id: number; name: string; };
  varietyClp: { id: number; name: string; priceCLP: number; };
  varietyUsd: { id: number; name: string; priceUSD: number; };
}

const TABLES_TO_TRUNCATE = [
  'transaction_relations',
  'reception_packs',
  'transactions',
  'pallets',
  'storages',
  'trays',
  'varieties',
  'formats',
  'producers',
  'seasons',
  'users',
  'persons',
];

export const resetReceptionUiState = async (connection: mysql.Connection): Promise<void> => {
  await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
  for (const table of TABLES_TO_TRUNCATE) {
    await connection.execute(`TRUNCATE TABLE ${table}`);
  }
  await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
};

export const seedReceptionUiData = async (connection: mysql.Connection): Promise<ReceptionUiSeedData> => {
  const hashedPassword = await bcrypt.hash('test123456', 10);
  const adminPasswordHash = await bcrypt.hash('1234', 10);

  await connection.execute(
    `INSERT INTO persons (id, name, dni, phone, mail, createdAt, updatedAt)
     VALUES
       (?, ?, ?, ?, ?, NOW(), NOW()),
       (?, ?, ?, ?, ?, NOW(), NOW()),
       (?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      '550e8400-e29b-41d4-a716-446655440010',
      'Admin Test',
      '12345678',
      '+56911111111',
      'admin@test.com',
      '550e8400-e29b-41d4-a716-446655440011',
      'User Test',
      '87654321',
      '+56922222222',
      'user@test.com',
      '550e8400-e29b-41d4-a716-446655440012',
      'Administrador Manual',
      '99999999',
      '+56999999999',
      'admin@example.com',
    ]
  );

  await connection.execute(
    `INSERT INTO persons (id, name, dni, phone, mail, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      '550e8400-e29b-41d4-a716-446655440013',
      'Productor Test UI',
      'PRD-0001',
      '+56933333333',
      'productor@test.com',
    ]
  );

  await connection.execute(
    `INSERT INTO users (id, userName, mail, pass, rol, personId, createdAt, updatedAt)
     VALUES
       (?, ?, ?, ?, 'ADMIN', ?, NOW(), NOW()),
       (?, ?, ?, ?, 'OPERATOR', ?, NOW(), NOW()),
       (?, ?, ?, ?, 'ADMIN', ?, NOW(), NOW())`,
    [
      '550e8400-e29b-41d4-a716-446655440000',
      'test_admin',
      'admin@test.com',
      hashedPassword,
      '550e8400-e29b-41d4-a716-446655440010',
      '550e8400-e29b-41d4-a716-446655440001',
      'test_user',
      'user@test.com',
      hashedPassword,
      '550e8400-e29b-41d4-a716-446655440011',
      '550e8400-e29b-41d4-a716-446655440002',
      'admin',
      'admin@example.com',
      adminPasswordHash,
      '550e8400-e29b-41d4-a716-446655440012',
    ]
  );

  await connection.execute(
    `INSERT INTO seasons (id, name, startDate, endDate, description, active, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, true, NOW(), NOW())`,
    [
      '11111111-1111-1111-1111-111111111111',
      'Temporada Test 2025',
      '2025-01-01',
      '2025-12-31',
      'Temporada activa para pruebas de recepción',
    ]
  );

  await connection.execute(
    `INSERT INTO producers (id, name, dni, phone, mail, personId, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      '33333333-3333-3333-3333-333333333333',
      'Productor Test UI',
      'PRD-0001',
      '+56933333333',
      'productor@test.com',
      '550e8400-e29b-41d4-a716-446655440013',
    ]
  );

  const [formatResult] = await connection.execute(
    `INSERT INTO formats (name, description, active, createdAt, updatedAt)
     VALUES (?, ?, true, NOW(), NOW())`,
    ['Formato QA 10kg', 'Formato estándar de prueba']
  ) as [InsertResult, FieldPacket[]];
  const formatId = formatResult.insertId;

  const [varietyClpResult] = await connection.execute(
    `INSERT INTO varieties (name, priceCLP, priceUSD, currency, createdAt, updatedAt)
     VALUES (?, ?, ?, 'CLP', NOW(), NOW())`,
    ['Arándano CLP Test', 1000, 0]
  ) as [InsertResult, FieldPacket[]];
  const varietyClpId = varietyClpResult.insertId;

  const [varietyUsdResult] = await connection.execute(
    `INSERT INTO varieties (name, priceCLP, priceUSD, currency, createdAt, updatedAt)
     VALUES (?, ?, ?, 'USD', NOW(), NOW())`,
    ['Frambuesa USD Test', 0, 5]
  ) as [InsertResult, FieldPacket[]];
  const varietyUsdId = varietyUsdResult.insertId;

  await connection.execute(
    `INSERT INTO trays (id, name, weight, stock, active, createdAt, updatedAt)
     VALUES (?, ?, ?, 0, true, NOW(), NOW())`,
    ['44444444-4444-4444-4444-444444444444', 'Bandeja Liviana 0.5kg', 0.5]
  );

  await connection.execute(
    `INSERT INTO storages (id, name, type, capacityPallets, location, active, createdAt, updatedAt)
     VALUES (?, ?, 'COLD_ROOM', ?, ?, true, NOW(), NOW())`,
    ['55555555-5555-5555-5555-555555555555', 'Cámara Fría Test', 200, 'Planta Principal']
  );

  const pallets: Array<{ id: number }> = [];
  for (let index = 0; index < 3; index += 1) {
    const [palletResult] = await connection.execute(
      `INSERT INTO pallets (storageId, trayId, traysQuantity, capacity, weight, dispatchWeight, metadata, status, createdAt, updatedAt)
       VALUES (?, ?, 0, 120, 0, 0, NULL, 'AVAILABLE', NOW(), NOW())`,
      ['55555555-5555-5555-5555-555555555555', '44444444-4444-4444-4444-444444444444']
    ) as [InsertResult, FieldPacket[]];
    pallets.push({ id: palletResult.insertId });
  }

  return {
    adminUser: { id: '550e8400-e29b-41d4-a716-446655440000', userName: 'test_admin' },
    testUser: { id: '550e8400-e29b-41d4-a716-446655440001', userName: 'test_user' },
    season: { id: '11111111-1111-1111-1111-111111111111', name: 'Temporada Test 2025' },
    producer: { id: '33333333-3333-3333-3333-333333333333', name: 'Productor Test UI', label: 'Productor Test UI - PRD-0001' },
    tray: { id: '44444444-4444-4444-4444-444444444444', name: 'Bandeja Liviana 0.5kg', weight: 0.5 },
    storage: { id: '55555555-5555-5555-5555-555555555555', name: 'Cámara Fría Test' },
    pallets,
    format: { id: formatId, name: 'Formato QA 10kg' },
    varietyClp: { id: varietyClpId, name: 'Arándano CLP Test', priceCLP: 1000 },
    varietyUsd: { id: varietyUsdId, name: 'Frambuesa USD Test', priceUSD: 5 },
  };
};
