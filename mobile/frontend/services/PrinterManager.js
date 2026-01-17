import PrinterImin from 'react-native-printer-imin';
import * as UsbPrinterModule from 'react-native-usb-printer';

import { formatCurrency } from '../utils/formatCurrency';

const LINE_WIDTH = 32;

function formatLine(label = '', value = '') {
  const trimmedLabel = `${label}`.slice(0, LINE_WIDTH);
  const trimmedValue = `${value}`.slice(0, LINE_WIDTH);
  if (!trimmedValue) {
    return trimmedLabel;
  }

  const available = LINE_WIDTH - trimmedValue.length - 1;
  const left = trimmedLabel.slice(0, Math.max(0, available));
  const padding = ' '.repeat(Math.max(1, LINE_WIDTH - (left.length + trimmedValue.length)));
  return `${left}${padding}${trimmedValue}`;
}

function serializeTicket(data) {
  const { saleId, items = [], total = 0, createdAt } = data;
  const lines = [
    formatLine('iMin POS Dev Build'),
    formatLine('Venta', saleId || 'NA'),
    formatLine('Fecha', createdAt || new Date().toISOString()),
    ''.padEnd(LINE_WIDTH, '-'),
  ];

  items.forEach(item => {
    lines.push(formatLine(item.name, `x${item.qty}`));
    lines.push(formatLine('  ', formatCurrency(item.total ?? 0)));
  });

  lines.push(''.padEnd(LINE_WIDTH, '-'));
  lines.push(formatLine('TOTAL', formatCurrency(total)));
  lines.push(''.padEnd(LINE_WIDTH, '-'));
  lines.push(formatLine('Gracias por su compra'));
  return `${lines.join('\n')}\n\n`;
}

class PrinterManager {
  constructor() {
    this.currentUsbPrinter = null;
    this.usbPrinter =
      UsbPrinterModule.RNUSBPrinter ||
      UsbPrinterModule.USBPrinter ||
      UsbPrinterModule.default ||
      null;
  }

  async connectUsbPrinter() {
    if (!this.usbPrinter) {
      throw new Error('El módulo de impresora USB no está disponible.');
    }

    const discovered = await this.usbPrinter.getUSBDeviceList();
    if (!Array.isArray(discovered) || !discovered.length) {
      throw new Error('No se detectaron impresoras USB disponibles.');
    }

    const printer = discovered[0];
    await this.usbPrinter.connectPrinter(printer.vendor_id, printer.product_id);
    this.currentUsbPrinter = printer;
    return printer;
  }

  async listUsbPrinters() {
    if (!this.usbPrinter) {
      throw new Error('El módulo de impresora USB no está disponible.');
    }

    const discovered = await this.usbPrinter.getUSBDeviceList();
    if (!Array.isArray(discovered)) {
      return [];
    }

    return discovered;
  }

  async printOnImin(ticketText) {
    try {
      await PrinterImin.printText(ticketText);
      if (typeof PrinterImin.feedPaper === 'function') {
        await PrinterImin.feedPaper(80);
      }
    } catch (error) {
      throw new Error(`Error al imprimir en la impresora iMin: ${error.message || error}`);
    }
  }

  async printOnUsb(ticketText) {
    try {
      if (!this.usbPrinter) {
        throw new Error('El módulo de impresora USB no está disponible.');
      }

      if (!this.currentUsbPrinter) {
        await this.connectUsbPrinter();
      }
      await this.usbPrinter.printText(ticketText);
      if (typeof this.usbPrinter.cutPaper === 'function') {
        await this.usbPrinter.cutPaper();
      }
    } catch (error) {
      throw new Error(`Error al imprimir en la impresora USB: ${error.message || error}`);
    }
  }

  async printDoubleTicket(data) {
    const ticketText = serializeTicket(data);
    await Promise.all([this.printOnImin(ticketText), this.printOnUsb(ticketText)]);
  }
}

export default new PrinterManager();
