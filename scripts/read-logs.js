#!/usr/bin/env node
/**
 * Script para leer logs de la aplicación empaquetada
 * 
 * Uso:
 *   node scripts/read-logs.js
 *   node scripts/read-logs.js main
 *   node scripts/read-logs.js next
 *   node scripts/read-logs.js both
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Determinar la ruta de logs según el sistema operativo
function getLogPath() {
  const appName = 'electnextstart';
  let basePath;

  switch (process.platform) {
    case 'win32':
      basePath = path.join(process.env.APPDATA || '', appName);
      break;
    case 'darwin':
      basePath = path.join(os.homedir(), 'Library', 'Application Support', appName);
      break;
    case 'linux':
      basePath = path.join(os.homedir(), '.config', appName);
      break;
    default:
      basePath = path.join(os.homedir(), '.config', appName);
  }

  return basePath;
}

function readLog(logName) {
  const logPath = path.join(getLogPath(), logName);
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📄 Leyendo: ${logPath}`);
  console.log('='.repeat(80));
  
  if (!fs.existsSync(logPath)) {
    console.log(`❌ Archivo no encontrado: ${logPath}`);
    return;
  }

  try {
    const content = fs.readFileSync(logPath, 'utf8');
    const lines = content.split('\n');
    
    console.log(`📊 Total de líneas: ${lines.length}`);
    console.log('='.repeat(80));
    console.log(content);
    console.log('='.repeat(80));
    
    // Contar errores
    const errors = lines.filter(line => line.includes('ERROR') || line.includes('Error') || line.includes('❌'));
    if (errors.length > 0) {
      console.log(`\n⚠️  ERRORES ENCONTRADOS (${errors.length}):`);
      console.log('='.repeat(80));
      errors.slice(-10).forEach(err => console.log(err));
    }
  } catch (err) {
    console.error(`❌ Error leyendo archivo:`, err.message);
  }
}

function showLogLocation() {
  const logPath = getLogPath();
  console.log(`\n📂 Ubicación de logs:`);
  console.log(`   ${logPath}`);
  console.log(`\n📝 Archivos de log disponibles:`);
  console.log(`   - main.log: Logs del proceso principal de Electron`);
  console.log(`   - next-server.log: Logs del servidor Next.js`);
  
  if (fs.existsSync(logPath)) {
    const files = fs.readdirSync(logPath).filter(f => f.endsWith('.log'));
    if (files.length > 0) {
      console.log(`\n✅ Archivos encontrados:`);
      files.forEach(file => {
        const filePath = path.join(logPath, file);
        const stats = fs.statSync(filePath);
        const size = (stats.size / 1024).toFixed(2);
        console.log(`   - ${file} (${size} KB)`);
      });
    }
  } else {
    console.log(`\n⚠️  Carpeta de logs no existe todavía. Ejecuta la aplicación empaquetada primero.`);
  }
}

// Main
const arg = process.argv[2] || 'location';

switch (arg.toLowerCase()) {
  case 'main':
    readLog('main.log');
    break;
  case 'next':
    readLog('next-server.log');
    break;
  case 'both':
    readLog('main.log');
    readLog('next-server.log');
    break;
  case 'location':
  default:
    showLogLocation();
    console.log(`\n💡 Uso:`);
    console.log(`   node scripts/read-logs.js          # Muestra ubicación`);
    console.log(`   node scripts/read-logs.js main     # Lee main.log`);
    console.log(`   node scripts/read-logs.js next     # Lee next-server.log`);
    console.log(`   node scripts/read-logs.js both     # Lee ambos logs`);
    break;
}

console.log('');
