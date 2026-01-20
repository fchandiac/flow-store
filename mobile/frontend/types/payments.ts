export type PaymentCardType = 'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'TRANSFER' | 'INTERNAL_CREDIT';

export interface PaymentCard {
  id: string;
  type: PaymentCardType;
  amount: number;
  bankAccountId?: string; // Para transferencias
  subPayments?: InternalCreditSubPayment[]; // Para crédito interno
}

export interface InternalCreditSubPayment {
  id: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
}

export interface PaymentSummary {
  totalToPay: number;
  totalPaid: number;
  change: number;
  remaining: number;
}

export interface TreasuryAccountOption {
  id: string;
  name: string;
  bankName?: string;
  accountNumber?: string;
  type: string;
}

export interface CreateMultiplePaymentsInput {
  saleTransactionId: string;
  payments: Array<{
    paymentMethod: 'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'TRANSFER' | 'CHECK' | 'CREDIT' | 'INTERNAL_CREDIT' | 'MIXED';
    amount: number;
    bankAccountId?: string;
    subPayments?: Array<{
      amount: number;
      dueDate: string;
    }>;
  }>;
}

export interface MultiplePaymentsResult {
  payments: Array<{
    id: string;
    paymentMethod: string;
    amount: number;
    transactionId: string;
  }>;
  totalPaid: number;
  change: number;
}