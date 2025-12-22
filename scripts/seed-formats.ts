/**
 * Script para poblar la tabla formats con datos de ejemplo
 *
 * Uso: npx ts-node scripts/seed-formats.ts
 */

import { createFormat } from '../app/actions/formats';

async function seedFormats() {
  try {
    console.log('🌱 Poblando tabla formats con datos de ejemplo...');

    const formatsData = [
      { name: 'IQF', description: 'Congelado individual rápido' },
      { name: 'BLOCK', description: 'Producto congelado en bloque' },
      { name: 'JUGO', description: 'Producto destinado a jugo o pulpa' },
      { name: 'FRESCO', description: 'Producto fresco sin congelar' },
      { name: 'PURE', description: 'Pulpa o puré de fruta' },
    ];

    for (const formatData of formatsData) {
      try {
        const result = await createFormat(formatData);
        if (result.success) {
          console.log(`✅ Formato '${formatData.name}' creado exitosamente`);
        } else {
          console.log(`⚠️  Error al crear formato '${formatData.name}': ${result.error}`);
        }
      } catch (error) {
        console.log(`❌ Error al crear formato '${formatData.name}':`, error);
      }
    }

    console.log('🎉 Poblado de formatos completado!');

  } catch (error) {
    console.error('❌ Error en el poblado de formatos:', error);
    process.exit(1);
  }
}

seedFormats();