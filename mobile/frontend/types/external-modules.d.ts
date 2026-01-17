declare module 'react-native-printer-imin' {
  const PrinterImin: {
    printText(text: string): Promise<void>;
    feedPaper?(distance: number): Promise<void>;
  };

  export default PrinterImin;
}

declare module 'react-native-usb-printer' {
  type UsbPrinterDevice = {
    device_name: string;
    vendor_id: number;
    product_id: number;
  };

  export const USBPrinter: {
    init(): Promise<UsbPrinterDevice[]>;
    connectPrinter(vendorId: number, productId: number): Promise<void>;
    printText(content: string): Promise<void>;
    cutPaper?(): Promise<void>;
  };
}

declare module 'react-native-external-display' {
  import * as React from 'react';
  import { StyleProp, ViewStyle } from 'react-native';

  export type ScreenDescriptor = {
    id: string;
    name: string;
    width: number;
    height: number;
    isMainScreen: boolean;
  };

  type ExternalDisplayProps = {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    screen?: string;
  };

  export function useExternalDisplay(): {
    screens: ScreenDescriptor[];
  };

  const ExternalDisplay: React.FC<ExternalDisplayProps>;
  export default ExternalDisplay;
}
