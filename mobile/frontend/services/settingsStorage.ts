import AsyncStorage from '@react-native-async-storage/async-storage';

import type { SecondaryDisplayMode, UsbPrinterSelection } from '../store/usePosStore';

const STORAGE_KEY = 'flowstore.pos.deviceSettings';

export type DeviceSettings = {
  preferredUsbPrinter?: UsbPrinterSelection | null;
  preferredCustomerDisplayId?: string | null;
  preferredCustomerDisplayWidth?: number | null;
  secondaryDisplayMode?: SecondaryDisplayMode;
};

const DEFAULT_SETTINGS: DeviceSettings = {
  preferredUsbPrinter: null,
  preferredCustomerDisplayId: null,
  preferredCustomerDisplayWidth: null,
  secondaryDisplayMode: 'cart',
};

async function readRawSettings(): Promise<Partial<DeviceSettings> | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as Partial<DeviceSettings>;
    }
  } catch {
    // Ignore malformed payloads and fall back to defaults.
  }
  return null;
}

export async function loadDeviceSettings(): Promise<DeviceSettings> {
  const stored = await readRawSettings();
  return {
    ...DEFAULT_SETTINGS,
    ...(stored ?? {}),
  };
}

export async function saveDeviceSettings(settings: DeviceSettings): Promise<DeviceSettings> {
  const merged = {
    ...DEFAULT_SETTINGS,
    ...settings,
  } satisfies DeviceSettings;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  return merged;
}

export async function updateDeviceSettings(
  patch: Partial<DeviceSettings>,
): Promise<DeviceSettings> {
  const current = await loadDeviceSettings();
  const next: DeviceSettings = {
    ...current,
    ...patch,
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export async function clearDeviceSettings(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
