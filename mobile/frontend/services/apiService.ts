import { Platform } from 'react-native';
import type { CartItem, CashSessionSummary, PointOfSaleSummary, ProductSearchResult } from '../store/usePosStore';

type HttpMethod = 'GET' | 'POST';

export type ApiSuccessResponse<T> = {
  success: true;
} & T;

type ApiErrorResponse = {
  success: false;
  message?: string;
};

type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

const HOST_IP_FALLBACK = '192.168.0.132';

const DEFAULT_BASE_URL = Platform.select({
  android: `http://${HOST_IP_FALLBACK}:3010`,
  default: 'http://localhost:3010',
});

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? DEFAULT_BASE_URL ?? 'http://localhost:3010';

async function request<T>(
  path: string,
  init: RequestInit & { method?: HttpMethod } = {},
): Promise<ApiSuccessResponse<T>> {
  const url = `${API_BASE_URL.replace(/\/$/, '')}${path}`;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init.headers ?? {}),
    },
    ...init,
  });

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

type ProductSearchPayload = {
  products: Array<{
    productId: string | null;
    productName: string;
    productDescription: string | null;
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
    })),
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
  paymentMethod: 'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'TRANSFER' | 'CHECK' | 'CREDIT' | 'MIXED';
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

export default {
  login,
  fetchPointsOfSale,
  createCashSession,
  registerOpeningTransaction,
  registerCashDeposit,
  registerCashWithdrawal,
  searchProducts,
  createSale,
  checkoutSale,
};
