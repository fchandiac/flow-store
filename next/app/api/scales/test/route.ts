import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const DEFAULT_PORT_PATH = process.env.SCALE_SERIAL_PORT ?? '/dev/cu.usbserial-FTB6SPL3';
const DEFAULT_TIMEOUT_MS = Number(process.env.SCALE_READ_TIMEOUT_MS ?? 10000);
const REQUEST_COMMAND = process.env.SCALE_REQUEST_COMMAND ?? '';

type ScaleSuccessPayload = {
    connected: true;
    message: string;
    device: {
        manufacturer: string;
        productId: string;
        vendorId: string;
        serialNumber: string;
        maxSpeed: string;
        requiredCurrentmA: number;
    };
    timestamp: string;
    rawFrame: string;
    numericValue: number | null;
    unit: string | null;
    portPath: string;
    commandSent: string | null;
};

type ScaleErrorPayload = {
    connected: false;
    message: string;
    details?: string;
    portPath: string;
    commandSent: string | null;
};

type ScaleDevicePayload = ScaleSuccessPayload | ScaleErrorPayload;

export async function POST() {
    let SerialPortCtor: any;
    let ReadlineParserCtor: any;

    try {
        const serialModule = await import('serialport');
        SerialPortCtor = serialModule.SerialPort ?? serialModule.default;
        const parserModule = await import('@serialport/parser-readline');
        ReadlineParserCtor = parserModule.ReadlineParser ?? parserModule.default;
    } catch (error) {
        const message =
            'No fue posible cargar los módulos de comunicación serial. Instala "serialport" y "@serialport/parser-readline".';
        return NextResponse.json<ScaleErrorPayload>(
            {
                connected: false,
                message,
                details: error instanceof Error ? error.message : String(error),
                portPath: DEFAULT_PORT_PATH,
                commandSent: REQUEST_COMMAND ? Buffer.from(REQUEST_COMMAND, 'utf8').toString('utf8') : null,
            },
            { status: 500 },
        );
    }

    if (!SerialPortCtor || !ReadlineParserCtor) {
        return NextResponse.json<ScaleErrorPayload>(
            {
                connected: false,
                message: 'Los módulos seriales cargados no exponen los constructores esperados.',
                portPath: DEFAULT_PORT_PATH,
                commandSent: REQUEST_COMMAND ? Buffer.from(REQUEST_COMMAND, 'utf8').toString('utf8') : null,
            },
            { status: 500 },
        );
    }

    const port = new SerialPortCtor({
        path: DEFAULT_PORT_PATH,
        baudRate: 9600,
        dataBits: 8,
        parity: 'none',
        stopBits: 1,
        autoOpen: false,
    });

    let isOpen = false;

    try {
        await new Promise<void>((resolve, reject) => {
            port.open((error: unknown) => {
                if (error) {
                    reject(error instanceof Error ? error : new Error(String(error)));
                    return;
                }
                isOpen = true;
                resolve();
            });
        });
    } catch (error) {
        return NextResponse.json<ScaleErrorPayload>(
            {
                connected: false,
                message: 'No se pudo abrir el puerto serial de la balanza.',
                details: error instanceof Error ? error.message : String(error),
                portPath: DEFAULT_PORT_PATH,
                commandSent: REQUEST_COMMAND ? Buffer.from(REQUEST_COMMAND, 'utf8').toString('utf8') : null,
            },
            { status: 500 },
        );
    }

    const parser = port.pipe(new ReadlineParserCtor({ delimiter: '\r\n' }));

    const cleanup = async () =>
        new Promise<void>((resolve) => {
            parser.removeAllListeners();
            port.removeAllListeners();
            if (!isOpen) {
                resolve();
                return;
            }
            port.close(() => {
                isOpen = false;
                resolve();
            });
        });

    try {
        if (REQUEST_COMMAND) {
            await new Promise<void>((resolve, reject) => {
                port.write(REQUEST_COMMAND, (writeError: unknown) => {
                    if (writeError) {
                        reject(writeError instanceof Error ? writeError : new Error(String(writeError)));
                        return;
                    }
                    port.drain((drainError: unknown) => {
                        if (drainError) {
                            reject(drainError instanceof Error ? drainError : new Error(String(drainError)));
                            return;
                        }
                        resolve();
                    });
                });
            });
        }

        const rawFrame = await new Promise<string>((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                parser.removeListener('data', onData);
                parser.removeListener('error', onError);
                port.removeListener('error', onError);
                reject(new Error('Tiempo de espera agotado esperando datos de la balanza.'));
            }, DEFAULT_TIMEOUT_MS);

            const onData = (chunk: unknown) => {
                clearTimeout(timeoutId);
                parser.removeListener('data', onData);
                parser.removeListener('error', onError);
                port.removeListener('error', onError);
                const payload =
                    typeof chunk === 'string'
                        ? chunk
                        : Buffer.isBuffer(chunk)
                          ? chunk.toString('utf8')
                          : String(chunk ?? '');
                resolve(payload.trim());
            };

            const onError = (error: unknown) => {
                clearTimeout(timeoutId);
                parser.removeListener('data', onData);
                port.removeListener('error', onError);
                reject(error instanceof Error ? error : new Error(String(error)));
            };

            parser.once('data', onData);
            parser.once('error', onError);
            port.once('error', onError);
        });

        const numericCandidate = rawFrame.replace(/[^0-9+\-.,]/g, '').replace(',', '.');
        const numericValue = Number.isNaN(Number.parseFloat(numericCandidate))
            ? null
            : Number.parseFloat(numericCandidate);
        const unitMatch = rawFrame.match(/[A-Za-z]{1,3}$/);

        const payload: ScaleSuccessPayload = {
            connected: true,
            message: 'Lectura recibida correctamente.',
            device: {
                manufacturer: 'FTDI',
                productId: '0x6001',
                vendorId: '0x0403',
                serialNumber: 'FTB6SPL3',
                maxSpeed: 'Hasta 12 Mb/s',
                requiredCurrentmA: 44,
            },
            timestamp: new Date().toISOString(),
            rawFrame,
            numericValue,
            unit: unitMatch ? unitMatch[0] : null,
            portPath: DEFAULT_PORT_PATH,
            commandSent: REQUEST_COMMAND ? Buffer.from(REQUEST_COMMAND, 'utf8').toString('utf8') : null,
        };

        return NextResponse.json(payload, { status: 200 });
    } catch (error) {
        return NextResponse.json<ScaleErrorPayload>(
            {
                connected: false,
                message: 'Error al leer datos desde la balanza.',
                details: error instanceof Error ? error.message : String(error),
                portPath: DEFAULT_PORT_PATH,
                commandSent: REQUEST_COMMAND ? Buffer.from(REQUEST_COMMAND, 'utf8').toString('utf8') : null,
            },
            { status: 500 },
        );
    } finally {
        await cleanup();
    }
}
