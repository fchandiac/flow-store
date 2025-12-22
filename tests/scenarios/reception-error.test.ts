import assert from 'node:assert/strict';
import { DataSource } from 'typeorm';
import { processReception, ProcessReceptionInput } from '../../app/actions/receptions';
import { Currency } from '../../data/entities/Variety';
import { ReceptionFixtures } from '../helpers/reception-db';

export const scenarioReceptionErrorRollback = async (
  db: DataSource,
  fixtures: ReceptionFixtures,
) => {
  const invalidPalletId = 999999;
  const traysQuantity = 8;
  const totalToPay = 520000;

  const payload: ProcessReceptionInput = {
    producer: { id: fixtures.producer.id, label: fixtures.producer.name },
    guide: 'G-ERR-005',
    exchangeRate: 0,
    userId: fixtures.user.id,
    totals: {
      totalPacks: 1,
      totalTraysInPacks: traysQuantity,
      totalTraysDevolved: 0,
      totalGrossWeight: 120,
      totalNetWeight: 110,
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
        traysTotalWeight: 2.8,
        grossWeight: 120,
        netWeightBeforeImpurities: 110,
        netWeight: 110,
        impurityPercent: 0,
        price: 9750,
        currency: Currency.CLP,
        totalToPay,
        palletAssignments: [
          { palletId: invalidPalletId, traysAssigned: traysQuantity },
        ],
      },
    ],
    trayDevolutions: [],
  };

  const result = await processReception(payload);
  assert.equal(result.success, false, 'processReception debió fallar con pallet inexistente');
  assert(result.error?.includes(`El pallet ${invalidPalletId} no existe`), 'El mensaje de error no menciona el pallet inexistente');

  const [transactionsCountRow] = await db.manager.query('SELECT COUNT(*) as count FROM transactions');
  const [packsCountRow] = await db.manager.query('SELECT COUNT(*) as count FROM reception_packs');
  const [relationsCountRow] = await db.manager.query('SELECT COUNT(*) as count FROM transaction_relations');

  assert.equal(Number(transactionsCountRow.count), 0, 'No deben existir transacciones tras el rollback');
  assert.equal(Number(packsCountRow.count), 0, 'No deben existir reception_packs tras el rollback');
  assert.equal(Number(relationsCountRow.count), 0, 'No deben existir relaciones tras el rollback');
};
