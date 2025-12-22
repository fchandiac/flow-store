/**
 * Script para poblar la tabla pallets con datos de ejemplo
 *
 * Uso: npx ts-node scripts/seed-pallets.ts
 */

import { createPallet } from '../app/actions/pallets';
import { getStorages } from '../app/actions/storages';
import { getTrays } from '../app/actions/trays';
import { PalletStatus } from '../data/entities/Pallet';

async function seedPallets() {
  try {
    console.log('🌱 Poblando tabla pallets con datos de ejemplo...');

    // Obtener listas de storages y trays existentes
    const storagesResult = await getStorages({ active: true });
    const traysResult = await getTrays({ active: true });

    if (!storagesResult.success || !storagesResult.data) {
      console.log('❌ No hay storages disponibles. Ejecuta seed-storages.ts primero.');
      return;
    }

    if (!traysResult.success || !traysResult.data) {
      console.log('❌ No hay trays disponibles. Ejecuta seed-trays.ts primero.');
      return;
    }

    const storages = Array.isArray(storagesResult.data) ? storagesResult.data : [storagesResult.data];
    const trays = Array.isArray(traysResult.data) ? traysResult.data : [traysResult.data];

    if (storages.length === 0) {
      console.log('❌ No hay storages disponibles. Ejecuta seed-storages.ts primero.');
      return;
    }

    if (trays.length === 0) {
      console.log('❌ No hay trays disponibles. Ejecuta seed-trays.ts primero.');
      return;
    }

    const palletsData = [
      {
        storageId: storages[0].id,
        trayId: trays[0].id,
        traysQuantity: 40,
        capacity: 40,
        weight: 35.5,
        dispatchWeight: 32.2,
        status: PalletStatus.FULL,
      },
      {
        storageId: storages[0].id,
        trayId: trays[0].id,
        traysQuantity: 30,
        capacity: 40,
        weight: 33.75,
        dispatchWeight: 30.0,
        status: PalletStatus.CLOSED,
      },
      {
        storageId: storages.length > 1 ? storages[1].id : storages[0].id,
        trayId: trays.length > 1 ? trays[1].id : trays[0].id,
        traysQuantity: 50,
        capacity: 60,
        weight: 38.75,
        dispatchWeight: 35.0,
        status: PalletStatus.AVAILABLE,
      },
    ];

    for (const palletData of palletsData) {
      try {
        const result = await createPallet(palletData);
        if (result.success) {
          console.log(`✅ Pallet creado exitosamente`);
        } else {
          console.log(`⚠️  Error al crear pallet: ${result.error}`);
        }
      } catch (error) {
        console.log(`❌ Error al crear pallet:`, error);
      }
    }

    console.log('🎉 Poblado de pallets completado!');

  } catch (error) {
    console.error('❌ Error en el poblado de pallets:', error);
    process.exit(1);
  }
}

seedPallets();