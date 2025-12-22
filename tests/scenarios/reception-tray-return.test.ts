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
} from '../helpers/reception-assertions';

export const scenarioReceptionTrayReturn = async (
  db: DataSource,
  fixtures: ReceptionFixtures,
) => {
  const traysQuantity = 20;
  const trayReturnQuantity = 5;
  const totalToPay = 1200000;

  const payload: ProcessReceptionInput = {
    producer: { id: fixtures.producer.id, label: fixtures.producer.name },
    guide: 'G-DEV-003',
    exchangeRate: 0,
    userId: fixtures.user.id,
    totals: {
      totalPacks: 1,
      totalTraysInPacks: traysQuantity,
      totalTraysDevolved: trayReturnQuantity,
      totalGrossWeight: 180,
      totalNetWeight: 170,
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
        traysTotalWeight: 7,
        grossWeight: 180,
        netWeightBeforeImpurities: 170,
        netWeight: 170,
        impurityPercent: 0,
        price: 10000,
        currency: Currency.CLP,
        totalToPay,
        palletAssignments: [],
      },
    ],
    trayDevolutions: [
      {
        trayId: fixtures.tray.id,
        trayLabel: fixtures.tray.name,
        quantity: trayReturnQuantity,
      },
    ],
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

  assert.equal(metadata?.totals?.trayReturns, trayReturnQuantity, 'La metadata no refleja la devolución de bandejas');
  assert.equal((metadata?.trayReturns ?? []).length, 1, 'Debe existir una devolución registrada en metadata');
  assert.equal(metadata.trayReturns[0]?.quantityReturned, trayReturnQuantity, 'Cantidad devuelta incorrecta en metadata');

  await assertReceptionPackCount(db, receptionId, 1);

  await assertRelationCounts(db, receptionId, {
    [TransactionRelationType.RECEPTION_PACK]: 1,
    [TransactionRelationType.TRAY_RECEPTION]: 1,
    [TransactionRelationType.TRAY_DEVOLUTION]: 1,
    [TransactionRelationType.PALLET_ASSIGNMENT]: 0,
  });

  const trayDevolutions = await fetchChildTransactionsByRelation(db, receptionId, TransactionRelationType.TRAY_DEVOLUTION);
  assert.equal(trayDevolutions.length, 1, 'Debe existir una transacción de devolución de bandejas');
  assert.equal(trayDevolutions[0].amount, trayReturnQuantity, 'La cantidad devuelta difiere');
  assert.equal(trayDevolutions[0].metadata?.quantityReturned, trayReturnQuantity, 'Metadata de devolución incorrecta');

  const trayReceptionTxs = await fetchChildTransactionsByRelation(db, receptionId, TransactionRelationType.TRAY_RECEPTION);
  assert.equal(trayReceptionTxs.length, 1, 'Debe existir una transacción de recepción de bandejas');
  assert.equal(trayReceptionTxs[0].amount, traysQuantity, 'Cantidad de bandejas ingresadas incorrecta');
};
