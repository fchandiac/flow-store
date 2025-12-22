const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function checkTable() {
  const configPath = path.resolve(process.cwd(), 'app.config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  
  const connection = await mysql.createConnection({
    host: config.dataBase.host,
    port: config.dataBase.port,
    user: config.dataBase.username,
    password: config.dataBase.password,
    database: config.dataBase.name
  });
  
  try {
    const [rows] = await connection.execute('DESCRIBE transactions');
    console.log('Columnas actuales en tabla transactions:');
    rows.forEach((row) => {
      console.log(`- ${row.Field}: ${row.Type} ${row.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${row.Default ? 'DEFAULT ' + row.Default : ''}`);
    });
  } finally {
    await connection.end();
  }
}

checkTable().catch(console.error);
