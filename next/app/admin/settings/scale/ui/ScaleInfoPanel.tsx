export default function ScaleInfoPanel() {
    return (
        <section className="rounded-lg border border-border bg-card p-4 shadow-sm space-y-4">
            <div>
                <h2 className="text-lg font-semibold">Parámetros de comunicación</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    Usa esta configuración al abrir el puerto serial de la balanza modelo A6701979 (referencia P/6368).
                </p>
                <dl className="mt-3 grid grid-cols-1 gap-y-2 text-sm md:grid-cols-2">
                    <div className="flex items-center justify-between">
                        <dt className="text-muted-foreground">Baud rate</dt>
                        <dd className="font-medium">9600</dd>
                    </div>
                    <div className="flex items-center justify-between">
                        <dt className="text-muted-foreground">Data bits</dt>
                        <dd className="font-medium">8</dd>
                    </div>
                    <div className="flex items-center justify-between">
                        <dt className="text-muted-foreground">Parity</dt>
                        <dd className="font-medium">None</dd>
                    </div>
                    <div className="flex items-center justify-between">
                        <dt className="text-muted-foreground">Stop bits</dt>
                        <dd className="font-medium">1</dd>
                    </div>
                    <div className="flex items-center justify-between">
                        <dt className="text-muted-foreground">Flow control</dt>
                        <dd className="font-medium">None</dd>
                    </div>
                    <div className="flex items-center justify-between">
                        <dt className="text-muted-foreground">Puerto USB</dt>
                        <dd className="font-mono text-xs">/dev/cu.usbserial-FTB6SPL3</dd>
                    </div>
                </dl>
                <p className="mt-2 text-xs text-muted-foreground">
                    Personaliza la ruta con la variable de entorno <span className="font-mono">SCALE_SERIAL_PORT</span> si tu FTDI monta un nombre distinto.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                    Si tu balanza requiere un comando para enviar el peso, define <span className="font-mono">SCALE_REQUEST_COMMAND</span> (por ejemplo <span className="font-mono">"P\r\n"</span>). Deja vacía la variable para leer tras presionar PRINT manualmente.
                </p>
            </div>

            <div>
                <h3 className="text-base font-semibold">Formato de la trama</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    Cada lectura contiene 16 caracteres con signo, valor y unidad. Ejemplo:
                </p>
                <pre className="mt-3 overflow-x-auto rounded-md bg-muted p-3 text-sm font-mono">+000125.00 g\r\n</pre>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    <li>Posiciones 1-9: valor numérico con signo.</li>
                    <li>Posiciones 10-12: unidad reportada por la balanza (g, ct, oz).</li>
                    <li>Posiciones 13-16: caracteres de control (CR y LF).</li>
                </ul>
            </div>

            <div>
                <h3 className="text-base font-semibold">Ejemplo en Node.js</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    Conecta usando la librería <span className="font-mono">serialport</span> y limpia el valor recibido.
                </p>
                <pre className="mt-3 overflow-x-auto rounded-md bg-muted p-3 text-xs font-mono">
{`import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';

const port = new SerialPort({
  path: '/dev/cu.usbserial-FTB6SPL3',
  baudRate: 9600,
  dataBits: 8,
  parity: 'none',
  stopBits: 1,
});

const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

parser.on('data', (raw) => {
  const numeric = parseFloat(raw.replace(/[^\d.-]/g, ''));
  console.log('Lectura cruda:', raw, '→ Peso:', numeric);
});`}
                </pre>
            </div>

            <div>
                <h3 className="text-base font-semibold">Consejos de uso</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    <li>Presiona el botón <span className="font-semibold">PRINT</span> para forzar un envío manual.</li>
                    <li>Habilita el modo <span className="font-semibold">Continuous</span> en la balanza para lecturas automáticas.</li>
                    <li>Si usas control de flujo por hardware, puentear pines 4-6 y 7-8 en el convertidor FTDI.</li>
                </ul>
            </div>
        </section>
    );
}
