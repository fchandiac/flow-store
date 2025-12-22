import { test, expect } from '@playwright/test';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { AppHelper } from '../../helpers/app-helper';
import { AuthHelper } from '../../helpers/auth-helper';
import { ReceptionsPage } from './helpers/receptions-page';
import { resetReceptionUiState, seedReceptionUiData, ReceptionUiSeedData } from './helpers/reception-fixtures';
import {
  assertReceptionTransaction,
  assertReceptionPackCount,
  assertRelationCounts,
  assertPalletState,
  fetchChildTransactionsByRelation,
  TransactionRelationType,
} from '../../helpers/reception-assertions';

const CLP_GUIDE = 'G-CLP-100';
const MIXED_GUIDE = 'G-MIX-200';
const DEV_GUIDE = 'G-DEV-300';
const MULTI_PALLET_GUIDE = 'G-MULTI-400';

test.describe('Recepciones UI', () => {
  let appHelper: AppHelper;
  let authHelper: AuthHelper;
  let receptionsPage: ReceptionsPage;
  let db: mysql.Connection;
  let seedData: ReceptionUiSeedData;

  test.beforeAll(async () => {
    appHelper = new AppHelper();
    await appHelper.launch();
    const configPath = path.join(process.cwd(), 'app.config.test.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    db = await mysql.createConnection({
      host: config.database.host,
      port: config.database.port,
      user: config.database.username,
      password: config.database.password,
      database: config.database.database,
    });
  });

  test.afterAll(async () => {
    await appHelper.close();
    if (db) {
      await db.end();
    }
  });

  test.beforeEach(async () => {
    const page = appHelper.getWindow();
    authHelper = new AuthHelper(page);
    receptionsPage = new ReceptionsPage(page);

    await resetReceptionUiState(db);
    seedData = await seedReceptionUiData(db);

    await page.context().clearCookies();
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
    await authHelper.login('test_admin', 'test123456');
    await receptionsPage.stubSilentPrint();
  });

  test.afterEach(async () => {
    try {
      await authHelper.logout();
    } catch (error) {
      // Ignore logout failures in teardown to avoid masking test results
    }
  });

  test('procesa una recepción simple en CLP', async () => {
    await receptionsPage.goto();
    await receptionsPage.selectProducer(seedData.producer.label);
    await receptionsPage.setGuide(CLP_GUIDE);

    const packIndex = await receptionsPage.addPack();
    await receptionsPage.configurePack(packIndex, {
      varietyLabel: seedData.varietyClp.name,
      formatLabel: seedData.format.name,
      trayLabel: seedData.tray.name,
      traysQuantity: 10,
      grossWeightKg: 100,
      palletId: seedData.pallets[0].id,
      palletTrays: 10,
    });

    await receptionsPage.openSummary();
    await receptionsPage.expectSummaryContains(seedData.producer.name);
    await receptionsPage.expectSummaryContains('Total a pagar');

    await receptionsPage.submitReception();

    const [rows] = await db.execute(
      `SELECT id, amount, metadata FROM transactions WHERE type = 'RECEPTION' ORDER BY createdAt DESC LIMIT 1`
    );
    const receptionRow = (rows as Array<{ id: string; amount: number; metadata: any }>)[0];

    expect(receptionRow).toBeTruthy();
    const receptionId = receptionRow.id;

    const trayWeight = Number(seedData.tray.weight);
    const netWeight = 100 - (10 * trayWeight);
    const expectedTotalClp = Number((netWeight * seedData.varietyClp.priceCLP).toFixed(2));

    await assertReceptionTransaction(db, receptionId, {
      amount: expectedTotalClp,
      totalCLPToPay: expectedTotalClp,
      payableCLP: expectedTotalClp,
      payableUSD: 0,
    });

    const packs = await assertReceptionPackCount(db, receptionId, 1);
    const savedPack = packs[0];
    expect(Number(savedPack.traysQuantity)).toBe(10);

    await assertRelationCounts(db, receptionId, {
      [TransactionRelationType.RECEPTION_PACK]: 1,
      [TransactionRelationType.PALLET_ASSIGNMENT]: 1,
      [TransactionRelationType.TRAY_RECEPTION]: 1,
    });

    await assertPalletState(db, seedData.pallets[0].id, {
      traysQuantity: 10,
      metadataLength: 1,
    });
  });

  test('procesa recepción mixta CLP + USD sin aplicar tipo de cambio', async () => {
    await receptionsPage.goto();
    await receptionsPage.selectProducer(seedData.producer.label);
    await receptionsPage.setGuide(MIXED_GUIDE);

    const firstPack = await receptionsPage.addPack();
    await receptionsPage.configurePack(firstPack, {
      varietyLabel: seedData.varietyClp.name,
      formatLabel: seedData.format.name,
      trayLabel: seedData.tray.name,
      traysQuantity: 8,
      grossWeightKg: 90,
      palletId: seedData.pallets[0].id,
      palletTrays: 8,
    });

    const secondPack = await receptionsPage.addPack();
    await receptionsPage.configurePack(secondPack, {
      varietyLabel: seedData.varietyUsd.name,
      formatLabel: seedData.format.name,
      trayLabel: seedData.tray.name,
      traysQuantity: 6,
      grossWeightKg: 70,
      palletId: seedData.pallets[1].id,
      palletTrays: 6,
    });

    await receptionsPage.openSummary();
    await receptionsPage.expectSummaryContains('Total a pagar usd');
    await receptionsPage.expectSummaryContains('Cambio pendiente');

    await receptionsPage.submitReception();

    const [rows] = await db.execute(
      `SELECT id FROM transactions WHERE type = 'RECEPTION' ORDER BY createdAt DESC LIMIT 1`
    );
    const receptionRow = (rows as Array<{ id: string }>)[0];

    expect(receptionRow).toBeTruthy();
    const receptionId = receptionRow.id;

    const trayWeight = Number(seedData.tray.weight);

    const netClp = 90 - (8 * trayWeight);
    const totalClp = Number((netClp * seedData.varietyClp.priceCLP).toFixed(2));

    const netUsd = 70 - (6 * trayWeight);
    const totalUsd = Number((netUsd * seedData.varietyUsd.priceUSD).toFixed(2));

    const exchangeRate = 0;
    const totalClpToPay = totalClp;

    await assertReceptionTransaction(db, receptionId, {
      amount: totalClpToPay,
      exchangeRate,
      totalCLPToPay: totalClpToPay,
      payableCLP: totalClp,
      payableUSD: totalUsd,
    });

    await assertReceptionPackCount(db, receptionId, 2);

    await assertRelationCounts(db, receptionId, {
      [TransactionRelationType.RECEPTION_PACK]: 2,
      [TransactionRelationType.PALLET_ASSIGNMENT]: 2,
      [TransactionRelationType.TRAY_RECEPTION]: 1,
    });

    await assertPalletState(db, seedData.pallets[0].id, {
      traysQuantity: 8,
      metadataLength: 1,
    });

    await assertPalletState(db, seedData.pallets[1].id, {
      traysQuantity: 6,
      metadataLength: 1,
    });
  });

  test('procesa recepción con devolución de bandejas y resetea formulario', async () => {
    await receptionsPage.goto();
    await receptionsPage.selectProducer(seedData.producer.label);
    await receptionsPage.setGuide(DEV_GUIDE);

    const packIndex = await receptionsPage.addPack();
    await receptionsPage.configurePack(packIndex, {
      varietyLabel: seedData.varietyClp.name,
      formatLabel: seedData.format.name,
      trayLabel: seedData.tray.name,
      traysQuantity: 20,
      grossWeightKg: 180,
    });

    await receptionsPage.addTrayDevolution(seedData.tray.name, 5);

    await receptionsPage.openSummary();
    await receptionsPage.expectSummaryContains('Devolución de bandejas');

    await receptionsPage.submitReception();

    const [rows] = await db.execute(
      `SELECT id FROM transactions WHERE type = 'RECEPTION' ORDER BY createdAt DESC LIMIT 1`
    );
    const receptionRow = (rows as Array<{ id: string }>)[0];

    expect(receptionRow).toBeTruthy();
    const receptionId = receptionRow.id;

    const trayWeight = Number(seedData.tray.weight);
    const netWeight = 180 - (20 * trayWeight);
    const expectedTotalClp = Number((netWeight * seedData.varietyClp.priceCLP).toFixed(2));

    const metadata = await assertReceptionTransaction(db, receptionId, {
      amount: expectedTotalClp,
      exchangeRate: 0,
      totalCLPToPay: expectedTotalClp,
      payableCLP: expectedTotalClp,
      payableUSD: 0,
    });

    expect(metadata?.totals?.trayReturns).toBe(5);
    expect(Array.isArray(metadata?.trayReturns)).toBe(true);
    expect(metadata?.trayReturns?.[0]?.quantityReturned).toBe(5);

    await assertReceptionPackCount(db, receptionId, 1);

    await assertRelationCounts(db, receptionId, {
      [TransactionRelationType.RECEPTION_PACK]: 1,
      [TransactionRelationType.TRAY_RECEPTION]: 1,
      [TransactionRelationType.TRAY_DEVOLUTION]: 1,
      [TransactionRelationType.PALLET_ASSIGNMENT]: 0,
    });

    const trayDevolutions = await fetchChildTransactionsByRelation(db, receptionId, TransactionRelationType.TRAY_DEVOLUTION);
    expect(trayDevolutions).toHaveLength(1);
    expect(trayDevolutions[0].amount).toBe(5);
  });

  test('procesa recepción asignando un pack a múltiples pallets', async () => {
    await receptionsPage.goto();
    await receptionsPage.selectProducer(seedData.producer.label);
    await receptionsPage.setGuide(MULTI_PALLET_GUIDE);

    const packIndex = await receptionsPage.addPack();
    await receptionsPage.configurePack(packIndex, {
      varietyLabel: seedData.varietyClp.name,
      formatLabel: seedData.format.name,
      trayLabel: seedData.tray.name,
      traysQuantity: 10,
      grossWeightKg: 120,
    });

    await receptionsPage.assignPallets(packIndex, [
      { palletId: seedData.pallets[0].id, trays: 6 },
      { palletId: seedData.pallets[1].id, trays: 4 },
    ]);

    await receptionsPage.openSummary();
    await receptionsPage.expectSummaryContains(`Pallet #${seedData.pallets[0].id}`);

    await receptionsPage.submitReception();

    const [rows] = await db.execute(
      `SELECT id FROM transactions WHERE type = 'RECEPTION' ORDER BY createdAt DESC LIMIT 1`
    );
    const receptionRow = (rows as Array<{ id: string }>)[0];

    expect(receptionRow).toBeTruthy();
    const receptionId = receptionRow.id;

    const trayWeight = Number(seedData.tray.weight);
    const netWeight = 120 - (10 * trayWeight);
    const expectedTotalClp = Number((netWeight * seedData.varietyClp.priceCLP).toFixed(2));

    await assertReceptionTransaction(db, receptionId, {
      amount: expectedTotalClp,
      exchangeRate: 0,
      totalCLPToPay: expectedTotalClp,
      payableCLP: expectedTotalClp,
      payableUSD: 0,
    });

    const packs = await assertReceptionPackCount(db, receptionId, 1);
    const savedPack = packs[0];
    const assignments = Array.isArray(savedPack.palletAssignments) ? savedPack.palletAssignments : [];
    expect(assignments).toHaveLength(2);

    await assertRelationCounts(db, receptionId, {
      [TransactionRelationType.RECEPTION_PACK]: 1,
      [TransactionRelationType.TRAY_RECEPTION]: 1,
      [TransactionRelationType.PALLET_ASSIGNMENT]: 2,
    });

    await assertPalletState(db, seedData.pallets[0].id, {
      traysQuantity: 6,
      metadataLength: 1,
    });

    await assertPalletState(db, seedData.pallets[1].id, {
      traysQuantity: 4,
      metadataLength: 1,
    });
  });
});
