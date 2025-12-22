import net from 'net';
import http from 'http';
import { ChildProcess } from 'child_process';

/**
 * Mata un proceso hijo de forma segura.
 * @param process Proceso a matar
 */
export function killChildProcess(process: ChildProcess | null): void {
  if (process) {
    try {
      process.kill();
      console.log('[processUtils] Child process killed');
    } catch (e) {
      console.error('[processUtils] Error killing child process:', e);
    }
  }
}

/**
 * Busca un puerto disponible a partir de basePort.
 * @param basePort Puerto inicial a probar (por defecto 3000)
 * @param maxPort Puerto máximo a probar (por defecto 3050)
 * @returns Promise<number> Puerto disponible encontrado
 */
export async function getAvailablePort(basePort = 3000, maxPort = 3050): Promise<number> {
  for (let port = basePort; port <= maxPort; port++) {
    const isFree = await isPortFree(port);
    if (isFree) return port;
  }
  throw new Error(`No se encontró puerto disponible entre ${basePort} y ${maxPort}`);
}

/**
 * Verifica si un puerto está libre en localhost.
 * Intenta abrir un servidor en el puerto especificado:
 *   - Si ocurre un error, el puerto está ocupado (devuelve false).
 *   - Si logra escuchar, el puerto está libre (devuelve true).
 * El servidor se cierra inmediatamente después de la verificación.
 * Esta función es interna y solo es usada por getAvailablePort.
 * @param port Puerto a verificar
 * @returns Promise<boolean> true si el puerto está libre, false si está ocupado
 */
function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => {
      resolve(false);
    });
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port);
  });
}

/**
 * Espera que el servidor Next.js esté listo en el puerto indicado.
 * @param port Puerto donde se espera Next.js
 * @param timeoutMs Tiempo máximo de espera en ms (default 120000)
 * @returns Promise<boolean> true si está listo, false si timeout
 */
export async function waitForNextReady(port: number, timeoutMs = 120000): Promise<boolean> {
  const start = Date.now();
  console.log(`[processUtils] Waiting for Next.js on port ${port}...`);
  
  while (Date.now() - start < timeoutMs) {
    const ready = await new Promise<boolean>((resolve) => {
      const req = http.get({
        host: '127.0.0.1',
        port,
        path: '/',
      }, (res) => {
        res.resume();
        const status = res.statusCode ?? 0;
        // console.log(`[processUtils] Check status: ${status}`);
        resolve(status >= 200 && status < 500);
      });
      req.on('error', (err) => {
        // console.log(`[processUtils] Check error: ${err.message}`);
        resolve(false);
      });
      req.setTimeout(3000, () => {
        req.destroy();
        resolve(false);
      });
    });
    if (ready) {
      console.log('[processUtils] Next.js is ready!');
      return true;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  console.error('[processUtils] Timeout waiting for Next.js');
  return false;
}
