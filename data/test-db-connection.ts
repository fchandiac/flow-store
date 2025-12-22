import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

const getConfigPath = (): string => {
  return path.resolve(process.cwd(), 'app.config.json');
};

const readAppConfig = (): any => {
  const configPath = getConfigPath();
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error leyendo app.config.json:', err);
    return null;
  }
};


(async () => {
  const config = readAppConfig();
  const db = config.dataBase;
  const start = Date.now();
  console.log('Intentando conectar a MySQL...');
  console.log('Host:', db.host);
  console.log('Puerto:', db.port);
  console.log('Usuario:', db.username);
  console.log('Base de datos:', db.name);
  try {
    const connection = await mysql.createConnection({
      host: db.host,
      port: db.port,
      user: db.username,
      password: db.password,
      database: db.name,
      connectTimeout: 5000,
    });
    await connection.ping();
    const elapsed = Date.now() - start;
    console.log('Conexión exitosa a la base de datos:', db.host);
    console.log('Tiempo de conexión:', elapsed, 'ms');
    await connection.end();
    process.exit(0);
  } catch (err) {
    const elapsed = Date.now() - start;
    const error = err as any;
    console.error('Error de conexión:', error);
    console.error('Tiempo de espera:', elapsed, 'ms');
    if (error.code) console.error('Código de error:', error.code);
    if (error.errno) console.error('Errno:', error.errno);
    if (error.sqlState) console.error('SQL State:', error.sqlState);
    process.exit(1);
  }
})();
