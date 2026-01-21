import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';
import type {
  CartItem,
  CashSessionClosingDetails,
  CashSessionSummary,
  CashSessionTenderBreakdown,
  PointOfSaleSummary,
  ProductSearchResult,
} from '../store/usePosStore';
import { usePosStore } from '../store/usePosStore';

type HttpMethod = 'GET' | 'POST';

export type ApiSuccessResponse<T> = {
  success: true;
} & T;

type ApiErrorResponse = {
  success: false;
  message?: string;
};

type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export function normalizeBaseUrl(input?: string | null): string | null {
  if (!input) {
    return null;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    if (!url.hostname) {
      return null;
    }

    const protocol = url.protocol.toLowerCase();
    if (protocol !== 'http:' && protocol !== 'https:') {
      return null;
    }

    const pathname = url.pathname.replace(/\/+$/, '');
    const normalizedPath = pathname === '' ? '' : pathname;
    const base = `${protocol}//${url.host}${normalizedPath}`;
    return base;
  } catch {
    return null;
  }
}

const API_PORT = process.env.EXPO_PUBLIC_API_PORT ?? '3010';
const REQUEST_TIMEOUT_MS = 15000;
const HEALTHCHECK_TIMEOUT_MS = 7000;
const isDevEnvironment = Boolean((globalThis as { __DEV__?: boolean }).__DEV__);

function extractHostname(candidate?: string | null): string | null {
  if (!candidate) {
    return null;
  }

  try {
    const normalized = candidate.match(/^https?:\/\//)
      ? candidate
      : `http://${candidate}`;
    const url = new URL(normalized);
    return url.hostname;
  } catch {
    return null;
  }
}

function inferDevServerHost(): string | null {
  if (!isDevEnvironment) {
    return null;
  }

  const constantsInspectable = Constants as unknown as {
    expoGoConfig?: { hostUri?: string | null };
    expoConfig?: { hostUri?: string | null };
    manifest?: { debuggerHost?: string | null };
  };

  const expoHostCandidates: Array<string | null | undefined> = [
    constantsInspectable.expoGoConfig?.hostUri ?? undefined,
    constantsInspectable.expoConfig?.hostUri ?? undefined,
    // `manifest` remains for backwards compatibility with older Expo/Metro flows.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    constantsInspectable.manifest?.debuggerHost ?? undefined,
    NativeModules?.SourceCode?.scriptURL,
  ];

  for (const candidate of expoHostCandidates) {
    const host = extractHostname(typeof candidate === 'string' ? candidate : null);
    if (host) {
      return host;
    }
  }

  return null;
}

function resolveDefaultBaseUrl(): string {
  const hostFromExpo = inferDevServerHost();
  const defaultHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  const host = hostFromExpo ?? defaultHost;

  if (Platform.OS === 'android' && (host === 'localhost' || host === '127.0.0.1')) {
    return `http://10.0.2.2:${API_PORT}`;
  }

  return `http://${host}:${API_PORT}`;
}

const DEFAULT_BASE_URL = normalizeBaseUrl(resolveDefaultBaseUrl()) ?? resolveDefaultBaseUrl();
const ENV_BASE_URL = normalizeBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL);

function resolveApiBaseUrl(): string {
  const configured = normalizeBaseUrl(usePosStore.getState().backendBaseUrl);
  if (configured) {
    return configured;
  }

  if (ENV_BASE_URL) {
    return ENV_BASE_URL;
  }

  return DEFAULT_BASE_URL;
}

function buildUrl(baseUrl: string, path: string): string {
  const trimmedBase = baseUrl.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${trimmedBase}${normalizedPath}`;
}

async function request<T>(
  path: string,
  init: RequestInit & { method?: HttpMethod } = {},
): Promise<ApiSuccessResponse<T>> {
  const baseUrl = resolveApiBaseUrl();
  const url = buildUrl(baseUrl, path);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(init.headers ?? {}),
      },
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('No se pudo contactar al servidor POS. Intenta nuevamente.');
    }

    if (
      error instanceof Error &&
      typeof error.message === 'string' &&
      error.message.toLowerCase().includes('network request failed')
    ) {
      throw new Error('No se pudo conectar con el servidor POS. Revisa tu red.');
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  let payload: ApiResponse<T> | null = null;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch (error) {
    payload = null;
  }

  if (!response.ok || !payload || !('success' in payload) || payload.success !== true) {
    const message = (payload as ApiErrorResponse | null)?.message ?? `Error HTTP ${response.status}`;
    throw new Error(message);
  }

  return payload as ApiSuccessResponse<T>;
}

export type BackendHealthResult = {
  resolvedUrl: string;
  latencyMs: number;
  payload: unknown;
};

export async function testBackendHealth(baseUrlInput?: string | null): Promise<BackendHealthResult> {
  const candidate = typeof baseUrlInput === 'string' ? baseUrlInput.trim() : '';
  let overrideUrl: string | null = null;

  if (candidate.length > 0) {
    overrideUrl = normalizeBaseUrl(candidate);
    if (!overrideUrl) {
      throw new Error('Ingresa una URL válida (http:// o https://) para el servidor POS.');
    }
  }

  const baseUrl = overrideUrl ?? resolveApiBaseUrl();
  const healthUrl = buildUrl(baseUrl, '/api/health');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, HEALTHCHECK_TIMEOUT_MS);

  const startedAt = Date.now();

  try {
    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Respuesta inesperada del servidor (${response.status}).`);
    }

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    return {
      resolvedUrl: healthUrl,
      latencyMs: Date.now() - startedAt,
      payload,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('La verificación excedió el tiempo de espera.');
      }

      if (error.message.toLowerCase().includes('network request failed')) {
        throw new Error('No se pudo contactar al servidor POS. Revisa la red o la URL configurada.');
      }

      throw error;
    }

    throw new Error('No se pudo verificar el estado del servidor POS.');
  } finally {
    clearTimeout(timeoutId);
  }
}

export type LoginResult = {
  id: string;
  userName: string;
  personId: string | null;
  personName: string | null;
  role: string | null;
};

export async function login(userName: string, password: string): Promise<LoginResult> {
  const payload = await request<{ user: { id: string; userName: string; rol?: string | null; personId?: string | null } }>(
    '/api/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ userName, password }),
    },
  );

  const user = payload.user;

  return {
    id: user.id,
    userName: user.userName,
    personId: user.personId ?? null,
    personName: null,
    role: user.rol ?? null,
  };
}

type PointsOfSalePayload = {
  pointsOfSale: Array<{
    id: string;
    name: string;
    deviceId: string | null;
    branchId: string | null;
    branchName: string | null;
    isActive: boolean;
  }>;
};

export async function fetchPointsOfSale(): Promise<PointOfSaleSummary[]> {
  const payload = await request<PointsOfSalePayload>('/api/points-of-sale', {
    method: 'GET',
  });

  return payload.pointsOfSale.map((pos) => ({
    id: pos.id,
    name: pos.name,
    deviceId: pos.deviceId,
    branchId: pos.branchId,
    branchName: pos.branchName,
  }));
}

type CreateCashSessionInput = {
  userName: string;
  pointOfSaleId: string;
  openingAmount?: number;
};

type CreateCashSessionPayload = {
  cashSession: {
    id: string;
    pointOfSaleId: string | null;
    openedById: string | null;
    status: CashSessionSummary['status'];
    openingAmount: number;
    openedAt: string;
    createdAt: string;
    updatedAt: string;
    expectedAmount: number | null;
    closingAmount?: number | null;
    closedAt?: string | null;
    difference?: number | null;
    notes?: string | null;
    closingDetails?: CashSessionClosingDetails | null;
  };
  suggestedOpeningAmount?: number;
  pointOfSale?: {
    id: string;
    name: string;
    deviceId: string | null;
    branchId: string | null;
  };
};

export type CashSessionOwnerSummary = {
  id: string;
  userName: string;
  personName: string | null;
};

export type CashSessionClosingSummary = {
  session: CashSessionSummary;
  closing: {
    actual: CashSessionTenderBreakdown;
    expected: CashSessionTenderBreakdown;
    difference: {
      cash: number;
      total: number;
    };
  };
};

type ActiveCashSessionPayload = {
  cashSession: {
    id: string;
    pointOfSaleId: string | null;
    openedById: string | null;
    status: CashSessionSummary['status'];
    openingAmount: number;
    openedAt: string;
    createdAt: string;
    updatedAt: string;
    expectedAmount: number | null;
    closingAmount?: number | null;
    closedAt?: string | null;
    difference?: number | null;
    notes?: string | null;
    closingDetails?: CashSessionClosingDetails | null;
  } | null;
  openedByUser: CashSessionOwnerSummary | null;
};

export async function fetchActiveCashSession(pointOfSaleId: string): Promise<{
  session: CashSessionSummary | null;
  openedByUser: CashSessionOwnerSummary | null;
}> {
  const params = new URLSearchParams({ pointOfSaleId });
  const payload = await request<ActiveCashSessionPayload>(`/api/cash-sessions?${params.toString()}`, {
    method: 'GET',
  });

  const session: CashSessionSummary | null = payload.cashSession
    ? {
        id: payload.cashSession.id,
        status: payload.cashSession.status,
        pointOfSaleId: payload.cashSession.pointOfSaleId ?? pointOfSaleId,
        openedById: payload.cashSession.openedById ?? null,
        openedAt: payload.cashSession.openedAt,
        openingAmount: payload.cashSession.openingAmount,
        expectedAmount: payload.cashSession.expectedAmount ?? null,
        createdAt: payload.cashSession.createdAt,
        updatedAt: payload.cashSession.updatedAt,
        closingAmount: payload.cashSession.closingAmount ?? null,
        closedAt: payload.cashSession.closedAt ?? null,
        difference: payload.cashSession.difference ?? null,
        notes: payload.cashSession.notes ?? null,
        closingDetails: payload.cashSession.closingDetails ?? null,
      }
    : null;

  return {
    session,
    openedByUser: payload.openedByUser ?? null,
  };
}

export async function createCashSession(input: CreateCashSessionInput): Promise<{
  session: CashSessionSummary;
  pointOfSale: PointOfSaleSummary | null;
  suggestedOpeningAmount: number | undefined;
}> {
  const payload = await request<CreateCashSessionPayload>('/api/cash-sessions', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  const session: CashSessionSummary = {
    id: payload.cashSession.id,
    status: payload.cashSession.status,
    pointOfSaleId: payload.cashSession.pointOfSaleId ?? input.pointOfSaleId,
    openedById: payload.cashSession.openedById ?? null,
    openedAt: payload.cashSession.openedAt,
    openingAmount: payload.cashSession.openingAmount,
    expectedAmount: payload.cashSession.expectedAmount ?? null,
    createdAt: payload.cashSession.createdAt,
    updatedAt: payload.cashSession.updatedAt,
    closingAmount: payload.cashSession.closingAmount ?? null,
    closedAt: payload.cashSession.closedAt ?? null,
    difference: payload.cashSession.difference ?? null,
    notes: payload.cashSession.notes ?? null,
    closingDetails: payload.cashSession.closingDetails ?? null,
  };

  const pointOfSale = payload.pointOfSale
    ? {
        id: payload.pointOfSale.id,
        name: payload.pointOfSale.name,
        deviceId: payload.pointOfSale.deviceId,
        branchId: payload.pointOfSale.branchId,
        branchName: null,
      }
    : null;

  return {
    session,
    pointOfSale,
    suggestedOpeningAmount: payload.suggestedOpeningAmount,
  };
}

type OpeningTransactionInput = {
  cashSessionId: string;
  userName: string;
  openingAmount: number;
};

type OpeningTransactionPayload = {
  transaction: {
    id: string;
    documentNumber: string;
    createdAt: string;
    total: number;
  };
  cashSession: {
    id: string;
    openedById: string | null;
    pointOfSaleId: string | null;
    status: CashSessionSummary['status'];
    openingAmount: number;
    openedAt: string;
    expectedAmount: number | null;
    createdAt: string;
    updatedAt: string;
    closingAmount?: number | null;
    closedAt?: string | null;
    difference?: number | null;
    notes?: string | null;
    closingDetails?: CashSessionClosingDetails | null;
  };
};

export async function registerOpeningTransaction(input: OpeningTransactionInput): Promise<{
  session: CashSessionSummary;
  transaction: {
    id: string;
    documentNumber: string;
    createdAt: string;
    total: number;
  };
}> {
  const payload = await request<OpeningTransactionPayload>(
    '/api/cash-sessions/opening-transaction',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );

  const session: CashSessionSummary = {
    id: payload.cashSession.id,
    status: payload.cashSession.status,
    pointOfSaleId: payload.cashSession.pointOfSaleId ?? input.cashSessionId,
    openedById: payload.cashSession.openedById ?? null,
    openedAt: payload.cashSession.openedAt,
    openingAmount: payload.cashSession.openingAmount,
    expectedAmount: payload.cashSession.expectedAmount ?? null,
    createdAt: payload.cashSession.createdAt,
    updatedAt: payload.cashSession.updatedAt,
    closingAmount: payload.cashSession.closingAmount ?? null,
    closedAt: payload.cashSession.closedAt ?? null,
    difference: payload.cashSession.difference ?? null,
    notes: payload.cashSession.notes ?? null,
    closingDetails: payload.cashSession.closingDetails ?? null,
  };

  return {
    session,
    transaction: payload.transaction,
  };
}

type CashMovementInput = {
  userName: string;
  pointOfSaleId: string;
  cashSessionId: string;
  amount: number;
  reason?: string;
};

type CashMovementPayload = {
  transaction: {
    id: string;
    documentNumber: string;
    createdAt: string;
    total: number;
  };
  expectedAmount: number;
};

export async function registerCashDeposit(input: CashMovementInput): Promise<CashMovementPayload> {
  const payload = await request<CashMovementPayload>('/api/cash-sessions/cash-deposits', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  return {
    transaction: payload.transaction,
    expectedAmount: payload.expectedAmount,
  };
}

export async function registerCashWithdrawal(input: CashMovementInput): Promise<CashMovementPayload> {
  const payload = await request<CashMovementPayload>('/api/cash-sessions/cash-withdrawals', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  return {
    transaction: payload.transaction,
    expectedAmount: payload.expectedAmount,
  };
}

export type CloseCashSessionInput = {
  userName: string;
  pointOfSaleId: string;
  cashSessionId: string;
  actualCash: number;
  voucherDebitAmount: number;
  voucherCreditAmount: number;
  transferAmount?: number;
  checkAmount?: number;
  otherAmount?: number;
  notes?: string;
};

type CloseCashSessionPayload = {
  session: {
    id: string;
    status: CashSessionSummary['status'];
    pointOfSaleId: string | null;
    openedById: string | null;
    openedAt: string | null;
    openingAmount: number;
    expectedAmount: number | null;
    closingAmount: number | null;
    difference: number | null;
    closedAt: string | null;
    createdAt: string | null;
    updatedAt: string | null;
    notes: string | null;
    closingDetails: CashSessionClosingDetails | null;
  };
  closing: {
    actual: CashSessionTenderBreakdown;
    expected: CashSessionTenderBreakdown;
    difference: {
      cash: number;
      total: number;
    };
  };
};

export async function closeCashSession(
  input: CloseCashSessionInput,
): Promise<CashSessionClosingSummary> {
  const payload = await request<CloseCashSessionPayload>('/api/cash-sessions/close', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  const sessionPayload = payload.session;

  const session: CashSessionSummary = {
    id: sessionPayload.id,
    status: sessionPayload.status,
    pointOfSaleId: sessionPayload.pointOfSaleId ?? input.pointOfSaleId,
    openedById: sessionPayload.openedById ?? null,
    openedAt: sessionPayload.openedAt ?? new Date().toISOString(),
    openingAmount: Number(sessionPayload.openingAmount ?? 0),
    expectedAmount: sessionPayload.expectedAmount ?? null,
    createdAt: sessionPayload.createdAt ?? new Date().toISOString(),
    updatedAt: sessionPayload.updatedAt ?? new Date().toISOString(),
    closingAmount: sessionPayload.closingAmount ?? null,
    closedAt: sessionPayload.closedAt ?? null,
    difference: sessionPayload.difference ?? null,
    notes: sessionPayload.notes ?? null,
    closingDetails: sessionPayload.closingDetails ?? null,
  };

  return {
    session,
    closing: {
      actual: normalizeTenderBreakdown(payload.closing.actual),
      expected: normalizeTenderBreakdown(payload.closing.expected),
      difference: {
        cash: Number((payload.closing.difference.cash ?? 0).toFixed(2)),
        total: Number((payload.closing.difference.total ?? 0).toFixed(2)),
      },
    },
  };
}

function normalizeTenderBreakdown(
  breakdown: CashSessionTenderBreakdown,
): CashSessionTenderBreakdown {
  return {
    cash: roundAmount(breakdown.cash),
    debitCard: roundAmount(breakdown.debitCard),
    creditCard: roundAmount(breakdown.creditCard),
    transfer: roundAmount(breakdown.transfer),
    check: roundAmount(breakdown.check),
    other: roundAmount(breakdown.other),
  };
}

function roundAmount(value: number | null | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0;
  }

  return Number(value.toFixed(2));
}

type ProductSearchPayload = {
  products: Array<{
    productId: string | null;
    productName: string;
    productDescription: string | null;
    productImagePath: string | null;
    variantId: string;
    sku: string;
    barcode: string | null;
    unitSymbol: string | null;
    unitId: string | null;
    unitPrice: number;
    unitTaxRate: number;
    unitTaxAmount: number;
    unitPriceWithTax: number;
    trackInventory: boolean;
    availableStock: number | null;
    availableStockBase: number | null;
    attributes: Array<{
      attributeId: string;
      attributeName: string | null;
      attributeValue: string;
    }>;
    metadata: Record<string, unknown> | null;
  }>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  query: string;
};

export type ProductSearchResultPage = {
  products: ProductSearchResult[];
  pagination: ProductSearchPayload['pagination'];
  query: string;
};

type CustomerSearchPayload = {
  customers: Array<{
    customerId: string;
    personId: string | null;
    displayName: string;
    documentType: string | null;
    documentNumber: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    creditLimit: number;
    currentBalance: number;
    availableCredit: number;
    paymentDayOfMonth: number;
    createdAt: string;
    updatedAt: string;
  }>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  query: string;
};

export type CustomerSearchResult = CustomerSearchPayload['customers'][number];

export type CustomerSearchResultPage = {
  customers: CustomerSearchResult[];
  pagination: CustomerSearchPayload['pagination'];
  query: string;
};

export type CreateCustomerInput = {
  firstName: string;
  personType: 'NATURAL' | 'COMPANY';
  lastName?: string;
  documentType?: string;
  documentNumber?: string;
  email?: string;
  phone?: string;
  address?: string;
};

type CreateCustomerPayload = {
  success: true;
  customer: CustomerSearchPayload['customers'][number];
};

export async function searchProducts(params: {
  query: string;
  page?: number;
  pageSize?: number;
}): Promise<ProductSearchResultPage> {
  const searchParams = new URLSearchParams();
  if (params.query) {
    searchParams.set('query', params.query);
  }
  if (params.page) {
    searchParams.set('page', String(params.page));
  }
  if (params.pageSize) {
    searchParams.set('pageSize', String(params.pageSize));
  }

  const payload = await request<ProductSearchPayload>(
    `/api/products/search?${searchParams.toString()}`,
    {
      method: 'GET',
    },
  );

  return {
    query: payload.query,
    pagination: payload.pagination,
    products: payload.products.map((product) => ({
      productId: product.productId,
      productName: product.productName,
      variantId: product.variantId,
      sku: product.sku,
      barcode: product.barcode,
      unitSymbol: product.unitSymbol,
      unitPrice: product.unitPrice,
      unitTaxRate: product.unitTaxRate,
      unitTaxAmount: product.unitTaxAmount,
      unitPriceWithTax: product.unitPriceWithTax,
      trackInventory: product.trackInventory,
      availableStock: product.availableStock,
      attributes: (product.attributes ?? []).map((attribute) => ({
        id: attribute.attributeId,
        name: attribute.attributeName,
        value: attribute.attributeValue,
      })),
    })),
  };
}

export async function searchCustomers(params: {
  query: string;
  page?: number;
  pageSize?: number;
}): Promise<CustomerSearchResultPage> {
  const searchParams = new URLSearchParams();
  if (typeof params.query === 'string') {
    searchParams.set('query', params.query);
  }
  if (params.page) {
    searchParams.set('page', String(params.page));
  }
  if (params.pageSize) {
    searchParams.set('pageSize', String(params.pageSize));
  }

  const payload = await request<CustomerSearchPayload>(
    `/api/customers/search?${searchParams.toString()}`,
    { method: 'GET' },
  );

  return {
    query: payload.query,
    pagination: payload.pagination,
    customers: payload.customers.map((customer) => ({
      customerId: customer.customerId,
      personId: customer.personId,
      displayName: customer.displayName,
      documentType: customer.documentType,
      documentNumber: customer.documentNumber,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      creditLimit: Number(customer.creditLimit ?? 0),
      currentBalance: Number(customer.currentBalance ?? 0),
      availableCredit: Number(customer.availableCredit ?? 0),
      paymentDayOfMonth: customer.paymentDayOfMonth,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    })),
  };
}

export async function createCustomer(input: CreateCustomerInput): Promise<CustomerSearchResult> {
  const payload = await request<CreateCustomerPayload>('/api/customers', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  const customer = payload.customer;
  return {
    customerId: customer.customerId,
    personId: customer.personId,
    displayName: customer.displayName,
    documentType: customer.documentType,
    documentNumber: customer.documentNumber,
    email: customer.email,
    phone: customer.phone,
    address: customer.address,
    creditLimit: Number(customer.creditLimit ?? 0),
    currentBalance: Number(customer.currentBalance ?? 0),
    availableCredit: Number(customer.availableCredit ?? 0),
    paymentDayOfMonth: customer.paymentDayOfMonth,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  };
}

export type SaleLineInput = {
  productVariantId: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  taxAmount?: number;
};

export type CreateSaleInput = {
  userName: string;
  pointOfSaleId: string;
  cashSessionId: string;
  paymentMethod: 'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'TRANSFER' | 'CHECK' | 'CREDIT' | 'INTERNAL_CREDIT' | 'MIXED';
  amountPaid: number;
  lines: SaleLineInput[];
};

type CreateSalePayload = {
  transaction: {
    id: string;
    documentNumber: string;
    transactionType: string;
    status: string;
    total: number;
    createdAt: string;
  };
  lines: Array<{
    id: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    taxAmount: number;
    total: number;
  }>;
};

export async function createSale(input: CreateSaleInput): Promise<CreateSalePayload> {
  const payload = await request<CreateSalePayload>('/api/cash-sessions/sales', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  return payload;
}

export type CheckoutResult = {
  transaction: CreateSalePayload['transaction'];
  lines: CreateSalePayload['lines'];
};

export async function checkoutSale(
  params: {
    cartItems: CartItem[];
    userName: string;
    pointOfSaleId: string;
    cashSessionId: string;
  },
): Promise<CheckoutResult> {
  const lines: SaleLineInput[] = params.cartItems.map((item) => ({
    productVariantId: item.variantId,
    quantity: item.qty,
    unitPrice: item.unitPrice,
    taxRate: item.unitTaxRate,
    taxAmount: item.taxAmount,
  }));

  const amountPaid = params.cartItems.reduce((total, line) => total + line.total, 0);

  const response = await createSale({
    userName: params.userName,
    pointOfSaleId: params.pointOfSaleId,
    cashSessionId: params.cashSessionId,
    paymentMethod: 'CASH',
    amountPaid: Number(amountPaid.toFixed(2)),
    lines,
  });

  return response;
}

// Treasury accounts
export type TreasuryAccountResponse = {
  id: string;
  name: string;
  bankName?: string;
  accountNumber?: string;
  type: string;
};

export async function getTreasuryAccounts(): Promise<TreasuryAccountResponse[]> {
  const payload = await request<TreasuryAccountResponse[]>(
    '/api/treasury-accounts',
    { method: 'GET' },
  );
  return payload.data;
}

// Multiple payments
export type CreateMultiplePaymentsInput = {
  saleTransactionId: string;
  payments: Array<{
    paymentMethod: 'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'TRANSFER' | 'CREDIT' | 'INTERNAL_CREDIT' | 'MIXED';
    amount: number;
    bankAccountId?: string;
    subPayments?: Array<{
      amount: number;
      dueDate: string;
    }>;
  }>;
};

export type MultiplePaymentsResult = {
  payments: Array<{
    id: string;
    paymentMethod: string;
    amount: number;
    transactionId: string;
  }>;
  totalPaid: number;
  change: number;
};

export async function createMultiplePayments(
  input: CreateMultiplePaymentsInput,
): Promise<MultiplePaymentsResult> {
  const payload = await request<MultiplePaymentsResult>(
    '/api/payments/multiple',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
  return payload;
}

export default {
  login,
  fetchPointsOfSale,
  createCashSession,
  registerOpeningTransaction,
  registerCashDeposit,
  registerCashWithdrawal,
  closeCashSession,
  searchProducts,
  searchCustomers,
  createCustomer,
  createSale,
  checkoutSale,
  getTreasuryAccounts,
  createMultiplePayments,
};
