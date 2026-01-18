import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const DEFAULT_PORT_PATH = process.env.SCALE_SERIAL_PORT ?? '/dev/cu.usbserial-FTB6SPL3';
const DEFAULT_VENDOR_ID = (process.env.SCALE_VENDOR_ID ?? '0403').toLowerCase();
const DEFAULT_PRODUCT_ID = (process.env.SCALE_PRODUCT_ID ?? '6001').toLowerCase();

interface SerialPortListItem {
    path?: string;
    manufacturer?: string;
    serialNumber?: string;
    vendorId?: string;
    productId?: string;
    locationId?: string;
}

type DetectionSuccess = {
    connected: true;
    message: string;
    matchedDevice: {
        path: string;
        manufacturer?: string;
        vendorId?: string;
        productId?: string;
        serialNumber?: string;
        locationId?: string;
    };
    scannedPorts: Array<{
        path: string;
        manufacturer?: string;
        vendorId?: string;
        productId?: string;
    }>;
};

type DetectionError = {
    connected: false;
    message: string;
    details?: string;
    scannedPorts?: Array<{
        path: string;
        manufacturer?: string;
        vendorId?: string;
        productId?: string;
    }>;
};

export async function GET() {
    let SerialPortCtor: any;
    try {
        const serialModule = await import('serialport');
        SerialPortCtor = serialModule.SerialPort ?? serialModule.default;
    } catch (error) {
        const details = error instanceof Error ? error.message : String(error);
        return NextResponse.json<DetectionError>(
            {
                connected: false,
                message:
                    'No fue posible cargar los módulos de comunicación serial. Verifica la instalación de "serialport".',
                details,
            },
            { status: 500 },
        );
    }

    if (!SerialPortCtor?.list) {
        return NextResponse.json<DetectionError>(
            {
                connected: false,
                message: 'La librería serialport cargada no expone el método list().',
            },
            { status: 500 },
        );
    }

    try {
        const ports: SerialPortListItem[] = await SerialPortCtor.list();
        const normalizedPorts = ports.map((port) => ({
            path: port.path ?? '',
            manufacturer: port.manufacturer ?? undefined,
            vendorId: port.vendorId ? port.vendorId.toLowerCase() : undefined,
            productId: port.productId ? port.productId.toLowerCase() : undefined,
            serialNumber: port.serialNumber ?? undefined,
            locationId: port.locationId ?? undefined,
        }));

        const matched = normalizedPorts.find((port) => {
            const matchesPath = port.path === DEFAULT_PORT_PATH;
            const matchesVendorProduct =
                (port.vendorId ?? '') === DEFAULT_VENDOR_ID && (port.productId ?? '') === DEFAULT_PRODUCT_ID;
            return matchesPath || matchesVendorProduct;
        });

        if (matched) {
            const payload: DetectionSuccess = {
                connected: true,
                message: 'Dispositivo FTDI detectado correctamente.',
                matchedDevice: {
                    path: matched.path,
                    manufacturer: matched.manufacturer,
                    vendorId: matched.vendorId,
                    productId: matched.productId,
                    serialNumber: normalizedPorts.find((port) => port.path === matched.path)?.serialNumber,
                    locationId: normalizedPorts.find((port) => port.path === matched.path)?.locationId,
                },
                scannedPorts: normalizedPorts.map((port) => ({
                    path: port.path,
                    manufacturer: port.manufacturer,
                    vendorId: port.vendorId,
                    productId: port.productId,
                })),
            };
            return NextResponse.json(payload, { status: 200 });
        }

        return NextResponse.json<DetectionError>(
            {
                connected: false,
                message: 'No se encontró el convertidor FTDI esperado. Revisa la conexión o los IDs configurados.',
                scannedPorts: normalizedPorts.map((port) => ({
                    path: port.path,
                    manufacturer: port.manufacturer,
                    vendorId: port.vendorId,
                    productId: port.productId,
                })),
            },
            { status: 200 },
        );
    } catch (error) {
        const details = error instanceof Error ? error.message : String(error);
        return NextResponse.json<DetectionError>(
            {
                connected: false,
                message: 'Error al listar los puertos seriales disponibles.',
                details,
            },
            { status: 500 },
        );
    }
}
