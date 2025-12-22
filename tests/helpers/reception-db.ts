import { DataSource } from 'typeorm';
import { Person } from '../../data/entities/Person';
import { User, UserRole } from '../../data/entities/User';
import { Season } from '../../data/entities/Season';
import { Producer } from '../../data/entities/Producer';
import { Tray } from '../../data/entities/Tray';
import { Storage, StorageType } from '../../data/entities/Storage';
import { Pallet } from '../../data/entities/Pallet';
import { Format } from '../../data/entities/Format';
import { Variety, Currency } from '../../data/entities/Variety';

export interface ReceptionFixtures {
  person: Person;
  user: User;
  season: Season;
  producer: Producer;
  tray: Tray;
  storage: Storage;
  pallets: Pallet[];
  format: Format;
  varietyClp: Variety;
  varietyUsd: Variety;
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

export const resetReceptionDatabase = async (db: DataSource): Promise<void> => {
  const manager = db.manager;
  await manager.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const table of TABLES_TO_TRUNCATE) {
    await manager.query(`TRUNCATE TABLE ${table}`);
  }
  await manager.query('SET FOREIGN_KEY_CHECKS = 1');
};

export const seedReceptionBaseData = async (db: DataSource): Promise<ReceptionFixtures> => {
  // Ensure the test schema supports the reception-related transaction types before seeding data.
  await db.query(`
    ALTER TABLE transactions
    MODIFY COLUMN type ENUM(
      'TRAY_ADJUSTMENT',
      'TRAY_IN_FROM_PRODUCER',
      'TRAY_OUT_TO_PRODUCER',
      'TRAY_OUT_TO_CLIENT',
      'TRAY_IN_FROM_CLIENT',
      'RECEPTION',
      'PALLET_TRAY_ASSIGNMENT',
      'PALLET_TRAY_RELEASE'
    ) NOT NULL
  `);

  const personRepo = db.getRepository(Person);
  const userRepo = db.getRepository(User);
  const seasonRepo = db.getRepository(Season);
  const producerRepo = db.getRepository(Producer);
  const trayRepo = db.getRepository(Tray);
  const storageRepo = db.getRepository(Storage);
  const palletRepo = db.getRepository(Pallet);
  const formatRepo = db.getRepository(Format);
  const varietyRepo = db.getRepository(Variety);

  const person = await personRepo.save(
    personRepo.create({
      name: 'Test Reception Operator',
      dni: 'TST0001',
      phone: '+56000000000',
      mail: 'reception.operator@test.local',
    })
  );

  const user = await userRepo.save(
    userRepo.create({
      userName: 'reception_operator',
      pass: 'hashed-password',
      mail: 'reception.operator@test.local',
      rol: UserRole.OPERATOR,
      person,
    })
  );

  const season = await seasonRepo.save(
    seasonRepo.create({
      name: 'Test Season 2025',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-12-31'),
      description: 'Temporada de pruebas para recepciones',
      active: true,
    })
  );

  const producerPerson = await personRepo.save(
    personRepo.create({
      name: 'Productor Test',
      dni: 'PRD0001',
      phone: '+56000000001',
      mail: 'productor@test.local',
    })
  );

  const producer = await producerRepo.save(
    producerRepo.create({
      name: 'Productor Test',
      dni: 'PRD0001',
      phone: '+56000000001',
      mail: 'productor@test.local',
      personId: producerPerson.id,
      person: producerPerson,
    })
  );

  const tray = await trayRepo.save(
    trayRepo.create({
      name: 'Bandeja Test 35',
      weight: 0.35,
      stock: 0,
      active: true,
    })
  );

  const storage = await storageRepo.save(
    storageRepo.create({
      name: 'Cámara Test',
      type: StorageType.COLD_ROOM,
      capacityPallets: 200,
      location: 'Planta Test',
      active: true,
    })
  );

  const pallets: Pallet[] = [];
  for (let index = 0; index < 3; index += 1) {
    const pallet = await palletRepo.save(
      palletRepo.create({
        storageId: storage.id,
        trayId: tray.id,
        traysQuantity: 0,
        capacity: 120,
        weight: 0,
        dispatchWeight: 0,
        metadata: null,
      })
    );
    pallets.push(pallet);
  }

  const format = await formatRepo.save(
    formatRepo.create({
      name: 'Formato 10kg Test',
      description: 'Formato base para pruebas',
      active: true,
    })
  );

  const varietyClp = await varietyRepo.save(
    varietyRepo.create({
      name: 'Variedad Test CLP',
      priceCLP: 9500,
      priceUSD: 0,
      currency: Currency.CLP,
    })
  );

  const varietyUsd = await varietyRepo.save(
    varietyRepo.create({
      name: 'Variedad Test USD',
      priceCLP: 600000,
      priceUSD: 3,
      currency: Currency.USD,
    })
  );

  return {
    person,
    user,
    season,
    producer,
    tray,
    storage,
    pallets,
    format,
    varietyClp,
    varietyUsd,
  };
};
