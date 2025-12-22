import path from 'path';
import { getDb, closeDb } from '../../data/db';
import { resetReceptionDatabase, seedReceptionBaseData, ReceptionFixtures } from '../helpers/reception-db';
import { scenarioReceptionBasic } from '../scenarios/reception-basic.test';
import { scenarioReceptionMultiCurrency } from '../scenarios/reception-multi-currency.test';
import { scenarioReceptionTrayReturn } from '../scenarios/reception-tray-return.test';
import { scenarioReceptionMultiPallet } from '../scenarios/reception-multi-pallet.test';
import { scenarioReceptionErrorRollback } from '../scenarios/reception-error.test';
import { DataSource } from 'typeorm';

interface Scenario {
  name: string;
  run: (db: DataSource, fixtures: ReceptionFixtures) => Promise<void>;
}

const scenarios: Scenario[] = [
  { name: 'Escenario A · Recepción CLP simple', run: scenarioReceptionBasic },
  { name: 'Escenario B · Recepción mixta CLP + USD', run: scenarioReceptionMultiCurrency },
  { name: 'Escenario C · Devolución parcial de bandejas', run: scenarioReceptionTrayReturn },
  { name: 'Escenario D · Asignación múltiple a pallets', run: scenarioReceptionMultiPallet },
  { name: 'Escenario E · Rollback por pallet inexistente', run: scenarioReceptionErrorRollback },
];

const printDivider = () => console.log('------------------------------------------------------------');

async function ensureEnvironment() {
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'test';
  }
  if (!process.env.CONFIG_PATH) {
    process.env.CONFIG_PATH = path.join(process.cwd(), 'app.config.json');
  }
}

async function runScenario(db: DataSource, scenario: Scenario) {
  printDivider();
  console.log(`▶️  ${scenario.name}`);

  await resetReceptionDatabase(db);
  const fixtures = await seedReceptionBaseData(db);

  await scenario.run(db, fixtures);

  console.log(`✅ ${scenario.name}`);
}

async function main() {
  await ensureEnvironment();

  const db = await getDb();
  const results: { name: string; status: 'passed' | 'failed'; error?: Error }[] = [];

  for (const scenario of scenarios) {
    try {
      await runScenario(db, scenario);
      results.push({ name: scenario.name, status: 'passed' });
    } catch (error: any) {
      console.error(`❌ ${scenario.name}`);
      if (error?.stack) {
        console.error(error.stack);
      } else {
        console.error(error);
      }
      results.push({ name: scenario.name, status: 'failed', error });
    }
  }

  printDivider();
  console.log('\nResumen de escenarios:');
  for (const result of results) {
    if (result.status === 'passed') {
      console.log(`  ✓ ${result.name}`);
    } else {
      console.log(`  ✗ ${result.name}`);
      if (result.error) {
        console.log(`    → ${result.error.message ?? result.error}`);
      }
    }
  }

  await closeDb();

  const failed = results.filter((r) => r.status === 'failed').length;
  if (failed > 0) {
    process.exitCode = 1;
  } else {
    console.log('\n✅ Todos los escenarios de recepción pasaron correctamente');
  }
}

main().catch((error) => {
  console.error('❌ Error crítico ejecutando escenarios de recepción:', error);
  process.exitCode = 1;
});
