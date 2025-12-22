import assert from 'node:assert/strict';
import { DataSource } from 'typeorm';
import { processReception, ProcessReceptionInput } from '../../app/actions/receptions';
import { Currency } from '../../data/entities/Variety';
import { TransactionRelationType } from '../../data/entities/TransactionRelation';
import { ReceptionFixtures } from '../helpers/reception-db';
import {
  assertReceptionTransaction,
  assertReceptionPackCount,
  assertRelationCounts,
  fetchChildTransactionsByRelation,
  assertPalletState,
} from '../helpers/reception-assertions';

export const scenarioReceptionMultiCurrency = async (
  db: DataSource,
  fixtures: ReceptionFixtures,
) => {
  const exchangeRate = 850;
  const clpPackTotal = 500000;
  const usdPackTotal = 5400;
  const expectedAmount = clpPackTotal + usdPackTotal * exchangeRate;

  const payload: ProcessReceptionInput = {
    producer: { id: fixtures.producer.id, label: fixtures.producer.name },
    guide: 'G-MIX-002',
    exchangeRate,
    userId: fixtures.user.id,
    totals: {
      totalPacks: 2,
      totalTraysInPacks: 27,
      totalTraysDevolved: 0,
      totalGrossWeight: 330,
      totalNetWeight: 300,
      totalToPayUSD: usdPackTotal,
      totalToPayCLP: clpPackTotal,
      totalCLPToPay: expectedAmount,
    },
    packs: [
      {
        packNumber: 1,
        varietyId: fixtures.varietyClp.id,
        varietyName: fixtures.varietyClp.name,
        formatId: fixtures.format.id,
        formatName: fixtures.format.name,
        trayId: fixtures.tray.id,
        trayLabel: fixtures.tray.name,
        traysQuantity: 12,
        unitTrayWeight: 0.35,
        traysTotalWeight: 4.2,
        grossWeight: 150,
        netWeightBeforeImpurities: 140,
        netWeight: 140,
        impurityPercent: 0,
        price: 10500,
        currency: Currency.CLP,
        totalToPay: clpPackTotal,
        palletAssignments: [],
      },
      {
        packNumber: 2,
        varietyId: fixtures.varietyUsd.id,
        varietyName: fixtures.varietyUsd.name,
        formatId: fixtures.format.id,
        formatName: fixtures.format.name,
        trayId: fixtures.tray.id,
        trayLabel: fixtures.tray.name,
        traysQuantity: 15,
        unitTrayWeight: 0.35,
        traysTotalWeight: 5.25,
        grossWeight: 180,
        netWeightBeforeImpurities: 160,
        netWeight: 160,
        impurityPercent: 0,
        price: 3,
        currency: Currency.USD,
        totalToPay: usdPackTotal,
        palletAssignments: [],
      },
    ],
    trayDevolutions: [],
  };

  const result = await processReception(payload);
  assert.equal(result.success, true, result.error ?? 'processReception devolvió error inesperado');
  const receptionId = result.data?.receptionTransactionId;
  assert(receptionId, 'processReception no entregó receptionTransactionId');

  const metadata = await assertReceptionTransaction(db, receptionId, {
    amount: expectedAmount,
    exchangeRate,
    totalCLPToPay: expectedAmount,
    payableCLP: clpPackTotal,
    payableUSD: usdPackTotal,
  });

  assert.equal(metadata?.totals?.traysInPacks, 27, 'Total de bandejas incorrecto en metadata');

  const packs = await assertReceptionPackCount(db, receptionId, 2);
  const packIds = packs.map((pack) => Number(pack.id)).sort((a, b) => a - b);

  await assertRelationCounts(db, receptionId, {
    [TransactionRelationType.RECEPTION_PACK]: 2,
    [TransactionRelationType.TRAY_RECEPTION]: 1,
    [TransactionRelationType.PALLET_ASSIGNMENT]: 0,
    [TransactionRelationType.TRAY_DEVOLUTION]: 0,
  });

  const trayReceptionTxs = await fetchChildTransactionsByRelation(db, receptionId, TransactionRelationType.TRAY_RECEPTION);
  assert.equal(trayReceptionTxs.length, 1, 'Debe existir una transacción TRAY_RECEPTION agregada');
  assert.equal(trayReceptionTxs[0].amount, 27, 'Cantidad total de bandejas incorrecta');
  const recordedPackIds = [...(trayReceptionTxs[0].metadata?.packReceptionIds ?? [])].sort((a: number, b: number) => a - b);
  assert.deepEqual(recordedPackIds, packIds, 'Los packs asociados a TRAY_RECEPTION no coinciden');

  // Confirmar que ningún pallet recibió asignaciones
  await assertPalletState(db, fixtures.pallets[0].id, {
    traysQuantity: 0,
    metadataLength: 0,
  });
};
