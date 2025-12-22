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

export const scenarioReceptionBasic = async (
  db: DataSource,
  fixtures: ReceptionFixtures,
) => {
  const packNetWeight = 91.5;
  const packGrossWeight = 95;
  const traysQuantity = 10;
  const totalToPay = 915000;

  const payload: ProcessReceptionInput = {
    producer: { id: fixtures.producer.id, label: fixtures.producer.name },
    guide: 'G-CLP-001',
    exchangeRate: 0,
    userId: fixtures.user.id,
    totals: {
      totalPacks: 1,
      totalTraysInPacks: traysQuantity,
      totalTraysDevolved: 0,
      totalGrossWeight: packGrossWeight,
      totalNetWeight: packNetWeight,
      totalToPayUSD: 0,
      totalToPayCLP: totalToPay,
      totalCLPToPay: totalToPay,
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
        traysQuantity,
        unitTrayWeight: 0.35,
        traysTotalWeight: 3.5,
        grossWeight: packGrossWeight,
        netWeightBeforeImpurities: packNetWeight,
        netWeight: packNetWeight,
        impurityPercent: 0,
        price: 10000,
        currency: Currency.CLP,
        totalToPay,
        palletAssignments: [
          {
            palletId: fixtures.pallets[0].id,
            traysAssigned: traysQuantity,
          },
        ],
      },
    ],
    trayDevolutions: [],
  };

  const result = await processReception(payload);
  assert.equal(result.success, true, result.error ?? 'processReception devolvió error inesperado');
  const receptionId = result.data?.receptionTransactionId;
  assert(receptionId, 'processReception no entregó receptionTransactionId');

  const metadata = await assertReceptionTransaction(db, receptionId, {
    amount: totalToPay,
    exchangeRate: 0,
    totalCLPToPay: totalToPay,
    payableCLP: totalToPay,
    payableUSD: 0,
  });

  assert.equal(metadata?.totals?.packsCount, 1, 'packsCount incorrecto en metadata');

  const packs = await assertReceptionPackCount(db, receptionId, 1);
  const savedPackNumericId = Number(packs[0].id);
  const savedPackId = String(packs[0].id);
  assert.equal(Number(packs[0].traysQuantity), traysQuantity, 'Cantidad de bandejas del pack incorrecta');

  await assertRelationCounts(db, receptionId, {
    [TransactionRelationType.RECEPTION_PACK]: 1,
    [TransactionRelationType.TRAY_RECEPTION]: 1,
    [TransactionRelationType.PALLET_ASSIGNMENT]: 1,
    [TransactionRelationType.TRAY_DEVOLUTION]: 0,
  });

  const trayReceptionTxs = await fetchChildTransactionsByRelation(db, receptionId, TransactionRelationType.TRAY_RECEPTION);
  assert.equal(trayReceptionTxs.length, 1, 'Debe existir una transacción TRAY_RECEPTION');
  assert.equal(trayReceptionTxs[0].amount, traysQuantity, 'Cantidad de bandejas ingresadas incorrecta');
  assert.equal(trayReceptionTxs[0].metadata?.quantity, traysQuantity, 'Metadata quantity incorrecta en TRAY_RECEPTION');
  assert.deepEqual(trayReceptionTxs[0].metadata?.packReceptionIds, [savedPackNumericId], 'packReceptionIds incorrectos');

  await assertPalletState(db, fixtures.pallets[0].id, {
    traysQuantity,
    metadataLength: 1,
    receptionPackId: savedPackId,
    quantityAssigned: traysQuantity,
  });
};
