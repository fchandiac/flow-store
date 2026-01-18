import { NativeModules } from 'react-native';

import { formatCurrency } from '../utils/formatCurrency';
import type { CartItem } from '../store/usePosStore';

type CustomerDisplayMode = 'cart' | 'promo';

type NativeDisplayDescriptor = {
  id?: string;
  displayId?: number;
  name?: string;
  width?: number;
  height?: number;
  isMainScreen?: boolean;
  flags?: number;
  type?: number;
  isValid?: boolean;
  rotation?: number;
};

type CustomerScreenNativeModule = {
  initialize(): Promise<void>;
  clear(): Promise<void>;
  displayText(text: string): Promise<void>;
  displayDoubleLine(top: string, bottom: string): Promise<void>;
  displayLines(lines: string[], align?: number[]): Promise<void>;
  setTextSize(size: number): Promise<void>;
  fetchDisplays(): Promise<NativeDisplayDescriptor[]>;
  canDrawOverlays(): Promise<boolean>;
  openOverlaySettings(): Promise<boolean>;
};

const module =
  NativeModules.CustomerScreenModule as CustomerScreenNativeModule | undefined;
const isAvailable = Boolean(module);

let isInitialized = false;
let initPromise: Promise<void> | null = null;

async function ensureInitialized() {
  if (!isAvailable || !module) {
    return;
  }

  if (isInitialized) {
    return;
  }

  if (!initPromise) {
    const nativeModule = module;

    initPromise = nativeModule
      .initialize()
      .then(() => nativeModule.setTextSize(48))
      .then(() => {
        isInitialized = true;
      })
      .catch((error: unknown) => {
        initPromise = null;
        throw error;
      });
  }

  return initPromise;
}

function buildCartLines(items: CartItem[], total: number): string[] {
  const maxLines = 7;
  const lines: string[] = [];

  lines.push('Ticket actual');

  items.forEach(item => {
    if (lines.length >= maxLines - 2) {
      return;
    }
    const qty = item.qty.toString().padStart(2, '0');
    const name = item.name.length > 14 ? `${item.name.slice(0, 13)}…` : item.name;
    const price = formatCurrency(item.total);
    lines.push(`${qty} ${name}`);
    lines.push(`   ${price}`);
  });

  lines.push('----------------');
  lines.push(`Total: ${formatCurrency(total)}`);

  return lines.slice(0, maxLines);
}

function buildPromoLines(): string[] {
  return [
    'Promoción del día',
    'Café + Croissant',
    'Ahorra 20%',
    'Válido hoy',
    'Consulta términos en caja'
  ];
}

export async function syncCustomerDisplay(
  items: CartItem[],
  total: number,
  mode: CustomerDisplayMode
): Promise<void> {
  if (!isAvailable) {
    return;
  }

  await ensureInitialized();

  if (!module) {
    return;
  }

  const lines = mode === 'cart' ? buildCartLines(items, total) : buildPromoLines();
  const align = lines.map((_, index) => (index === 0 ? 1 : 0));

  await module.displayLines(lines, align);
}

export async function clearCustomerDisplay(): Promise<void> {
  if (!isAvailable) {
    return;
  }

  await ensureInitialized();

  if (!module) {
    return;
  }

  await module.clear();
}

export type CustomerExternalDisplay = {
  id: string;
  displayId?: number;
  name?: string;
  width?: number;
  height?: number;
  isMainScreen?: boolean;
  flags?: number;
  type?: number;
  isValid?: boolean;
  rotation?: number;
};

function normalizeDisplay(entry: NativeDisplayDescriptor): CustomerExternalDisplay | null {
  if (!entry) {
    return null;
  }

  const identifier = entry.id ?? (entry.displayId != null ? String(entry.displayId) : undefined);
  if (!identifier) {
    return null;
  }

  return {
    id: identifier,
    displayId: entry.displayId,
    name: entry.name,
    width: entry.width,
    height: entry.height,
    isMainScreen: entry.isMainScreen,
    flags: entry.flags,
    type: entry.type,
    isValid: entry.isValid,
    rotation: entry.rotation
  };
}

export async function fetchExternalDisplays(): Promise<CustomerExternalDisplay[]> {
  if (!isAvailable || !module) {
    return [];
  }

  await ensureInitialized();

  const response = await module.fetchDisplays();
  if (!Array.isArray(response)) {
    return [];
  }

  return response
    .map(normalizeDisplay)
    .filter((item): item is CustomerExternalDisplay => Boolean(item));
}

export async function hasOverlayPermission(): Promise<boolean> {
  if (!isAvailable || !module) {
    return false;
  }

  try {
    return await module.canDrawOverlays();
  } catch (error) {
    return false;
  }
}

export async function requestOverlayPermission(): Promise<void> {
  if (!isAvailable || !module) {
    return;
  }

  await module.openOverlaySettings();
}

export const isCustomerScreenAvailable = isAvailable;
