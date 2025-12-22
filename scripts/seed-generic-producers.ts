/**
 * Script para crear 10 productores genéricos"Productor 1" ... "Productor 10".
 *
 * Uso sugerido: npx ts-node scripts/seed-generic-producers.ts
 */

import 'reflect-metadata';
import { randomUUID } from 'crypto';
import { getDb } from '../data/db';
import { Person } from '../data/entities/Person';
import { Producer } from '../data/entities/Producer';

async function seedGenericProducers() {
  const db = await getDb();
  const personRepo = db.getRepository(Person);
  const producerRepo = db.getRepository(Producer);

  try {
    console.log('Iniciando seed de productores genericos...');

    let created = 0;
    let skipped = 0;

    for (let i = 1; i <= 10; i++) {
      const name = `Productor ${i}`;
      const dni = `TEST-PROD-${i.toString().padStart(2, '0')}`;
      const email = `productor${i}@example.com`;
      const phone = `+5690000000${i}`;

      const existingProducer = await producerRepo.findOne({ where: { dni } });
      if (existingProducer) {
        skipped++;
        continue;
      }

      let person = await personRepo.findOne({ where: { dni } });
      if (!person) {
        person = personRepo.create({
          id: randomUUID(),
          name,
          dni,
          mail: email,
          phone,
        });
        await personRepo.save(person);
      }

      const producer = producerRepo.create({
        id: randomUUID(),
        name,
        dni,
        phone,
        mail: email,
        personId: person.id,
      });

      await producerRepo.save(producer);
      created++;
      console.log(`   Productor creado: ${name}`);
    }

    console.log(`Seed finalizado. Productores creados: ${created}. Omitidos por duplicado: ${skipped}.`);
  } catch (error) {
    console.error('Error ejecutando el seed de productores genericos:', error);
    process.exitCode = 1;
  } finally {
    await db.destroy();
  }
}

seedGenericProducers().then(() => {
  console.log('Script completado.');
  process.exit();
}).catch((error) => {
  console.error('Error inesperado en el script:', error);
  process.exit(1);
});
