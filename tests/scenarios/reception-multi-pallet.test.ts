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

export const scenarioReceptionMultiPallet = async (
  db: DataSource,
  fixtures: ReceptionFixtures,
) => {
  const traysQuantity = 30;
  const totalToPay = 2250000;
  const palletOne = fixtures.pallets[0];
  const palletTwo = fixtures.pallets[1];

  const payload: ProcessReceptionInput = {
    producer: { id: fixtures.producer.id, label: fixtures.producer.name },
    guide: 'G-PAL-004',
    exchangeRate: 0,
    userId: fixtures.user.id,
    totals: {
      totalPacks: 1,
      totalTraysInPacks: traysQuantity,
      totalTraysDevolved: 0,
      totalGrossWeight: 240,
      totalNetWeight: 230,
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
        traysTotalWeight: 10.5,
        grossWeight: 240,
        netWeightBeforeImpurities: 230,
        netWeight: 230,
        impurityPercent: 0,
        price: 9750,
        currency: Currency.CLP,
        totalToPay,
        palletAssignments: [
          { palletId: palletOne.id, traysAssigned: 15 },
          { palletId: palletTwo.id, traysAssigned: 15 },
        ],
      },
    ],
    trayDevolutions: [],
  };

  const result = await processReception(payload);
  assert.equal(result.success, true, result.error ?? 'processReception devolvió error inesperado');
  const receptionId = result.data?.receptionTransactionId;
  assert(receptionId, 'processReception no entregó receptionTransactionId');

  await assertReceptionTransaction(db, receptionId, {
    amount: totalToPay,
    exchangeRate: 0,
    totalCLPToPay: totalToPay,
    payableCLP: totalToPay,
    payableUSD: 0,
  });

  const packs = await assertReceptionPackCount(db, receptionId, 1);
  const savedPackId = String(packs[0].id);

  await assertRelationCounts(db, receptionId, {
    [TransactionRelationType.RECEPTION_PACK]: 1,
    [TransactionRelationType.TRAY_RECEPTION]: 1,
    [TransactionRelationType.PALLET_ASSIGNMENT]: 2,
    [TransactionRelationType.TRAY_DEVOLUTION]: 0,
  });

  const assignments = await fetchChildTransactionsByRelation(db, receptionId, TransactionRelationType.PALLET_ASSIGNMENT);
  assert.equal(assignments.length, 2, 'Deben existir dos asignaciones de pallet');
  const traysAssigned = assignments.map((item) => item.metadata?.traysAssigned).sort((a, b) => Number(a) - Number(b));
  assert.deepEqual(traysAssigned, [15, 15], 'Las asignaciones de bandejas no coinciden');

  await assertPalletState(db, palletOne.id, {
    traysQuantity: 15,
    metadataLength: 1,
    receptionPackId: savedPackId,
    quantityAssigned: 15,
  });

  await assertPalletState(db, palletTwo.id, {
    traysQuantity: 15,
    metadataLength: 1,
    receptionPackId: savedPackId,
    quantityAssigned: 15,
  });
};
