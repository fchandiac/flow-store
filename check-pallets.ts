import { getDb } from './data/db';

async function checkPalletsTable() {
  const db = await getDb();
  const result = await db.query('DESCRIBE pallets');
  console.log(result);
}

checkPalletsTable();