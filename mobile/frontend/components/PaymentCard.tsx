import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PaymentCard as PaymentCardType, InternalCreditSubPayment, TreasuryAccountOption } from '../store/usePosStore';
import { formatAmount, formatAmountInput, parseFormattedAmount } from '../utils/currency';
import { palette } from '../theme/palette';

interface PaymentCardProps {
  card: PaymentCardType;
  treasuryAccounts: TreasuryAccountOption[];
  onUpdate: (updates: Partial<PaymentCardType>) => void;
  onRemove: () => void;
  onAddSubPayment?: (subPayment: Omit<InternalCreditSubPayment, 'id'>) => void;
  onUpdateSubPayment?: (subPaymentId: string, updates: Partial<InternalCreditSubPayment>) => void;
  onRemoveSubPayment?: (subPaymentId: string) => void;
  maxAmount?: number;
  customerPaymentDay?: number;
}

const PAYMENT_METHOD_LABELS = {
  CASH: 'Efectivo',
  CREDIT_CARD: 'Tarjeta de crédito',
  DEBIT_CARD: 'Tarjeta de débito',
  TRANSFER: 'Transferencia',
  INTERNAL_CREDIT: 'Crédito interno',
} as const;

export function PaymentCard({
  card,
  treasuryAccounts,
  onUpdate,
  onRemove,
  onAddSubPayment,
  onUpdateSubPayment,
  onRemoveSubPayment,
  maxAmount = 0,
  customerPaymentDay,
}: PaymentCardProps) {
  const [amountInput, setAmountInput] = useState(formatAmount(card.amount));
  const [showSubPayments, setShowSubPayments] = useState(false);

  const handleAmountChange = (value: string) => {
    const formatted = formatAmountInput(value);
    setAmountInput(formatted);
    const numValue = parseFormattedAmount(formatted);
    onUpdate({ amount: numValue });
  };

  const handleBankAccountChange = (accountId: string) => {
    onUpdate({ bankAccountId: accountId });
  };

  const handleAddSubPayment = () => {
    if (!onAddSubPayment) return;

    const defaultDate = new Date();
    if (customerPaymentDay) {
      defaultDate.setDate(customerPaymentDay);
      if (defaultDate < new Date()) {
        defaultDate.setMonth(defaultDate.getMonth() + 1);
      }
    }

    onAddSubPayment({
      amount: 0,
      dueDate: defaultDate.toISOString().split('T')[0],
    });
  };

  const validateAmount = () => {
    if (card.type !== 'CASH' && card.amount > maxAmount) {
      Alert.alert(
        'Monto excedido',
        `El monto no puede superar el saldo pendiente de ${formatAmount(maxAmount)}`,
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const renderAmountInput = () => {
    // Para crédito interno, el monto se deriva de los sub-pagos
    if (card.type === 'INTERNAL_CREDIT') return null;

    return (
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Monto</Text>
        <TextInput
          style={styles.amountInput}
          value={amountInput}
          onChangeText={handleAmountChange}
          onBlur={validateAmount}
          placeholder="0"
          keyboardType="numeric"
          selectTextOnFocus
        />
      </View>
    );
  };

  const renderBankAccountSelector = () => (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>Cuenta bancaria</Text>
      <View style={styles.accountSelector}>
        {treasuryAccounts.map((account) => (
          <TouchableOpacity
            key={account.id}
            style={[
              styles.accountOption,
              card.bankAccountId === account.id && styles.accountOptionSelected,
            ]}
            onPress={() => handleBankAccountChange(account.id)}
          >
            <Text style={[
              styles.accountOptionText,
              card.bankAccountId === account.id && styles.accountOptionTextSelected,
            ]}>
              {account.name}
              {account.accountNumber && ` • ${account.accountNumber}`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {card.bankAccountId && (
        <TouchableOpacity style={styles.printButton}>
          <Ionicons name="print-outline" size={16} color={palette.primary} />
          <Text style={styles.printButtonText}>Imprimir datos</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderSubPayments = () => {
    if (!card.subPayments || !onUpdateSubPayment || !onRemoveSubPayment) return null;

    return (
      <View style={styles.subPaymentsContainer}>
        <TouchableOpacity
          style={styles.subPaymentsHeader}
          onPress={() => setShowSubPayments(!showSubPayments)}
        >
          <Text style={styles.subPaymentsTitle}>
            Sub-pagos ({card.subPayments.length})
          </Text>
          <Ionicons
            name={showSubPayments ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={palette.textSecondary}
          />
        </TouchableOpacity>

        {showSubPayments && (
          <View style={styles.subPaymentsList}>
            {card.subPayments.map((subPayment) => (
              <View key={subPayment.id} style={styles.subPaymentItem}>
                <View style={styles.subPaymentFields}>
                  <TextInput
                    style={[styles.amountInput, styles.subPaymentInput]}
                    value={formatAmount(subPayment.amount)}
                    onChangeText={(value) => {
                      const formatted = formatAmountInput(value);
                      const numValue = parseFormattedAmount(formatted);
                      onUpdateSubPayment(subPayment.id, { amount: numValue });
                    }}
                    placeholder="0"
                    keyboardType="numeric"
                    selectTextOnFocus
                  />
                  <TextInput
                    style={[styles.dateInput, styles.subPaymentInput]}
                    value={subPayment.dueDate}
                    onChangeText={(value) =>
                      onUpdateSubPayment(subPayment.id, { dueDate: value })
                    }
                    placeholder="YYYY-MM-DD"
                  />
                </View>
                <TouchableOpacity
                  style={styles.removeSubPaymentButton}
                  onPress={() => onRemoveSubPayment(subPayment.id)}
                >
                  <Ionicons name="trash-outline" size={16} color={palette.danger} />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.addSubPaymentButton} onPress={handleAddSubPayment}>
              <Ionicons name="add-circle-outline" size={16} color={palette.primary} />
              <Text style={styles.addSubPaymentText}>Agregar sub-pago</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{PAYMENT_METHOD_LABELS[card.type]}</Text>
        <TouchableOpacity style={styles.removeButton} onPress={onRemove}>
          <Ionicons name="close-circle-outline" size={20} color={palette.danger} />
        </TouchableOpacity>
      </View>

      {card.type !== 'INTERNAL_CREDIT' && renderAmountInput()}

      {card.type === 'TRANSFER' && renderBankAccountSelector()}

      {card.type === 'INTERNAL_CREDIT' && renderSubPayments()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.textSecondary,
  },
  removeButton: {
    padding: 4,
  },
  field: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: palette.textSecondary,
    marginBottom: 6,
  },
  amountInput: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: palette.textPrimary,
    backgroundColor: palette.surface,
  },
  accountSelector: {
    gap: 8,
  },
  accountOption: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: palette.surface,
  },
  accountOptionSelected: {
    borderColor: palette.primary,
    backgroundColor: palette.surfaceMuted,
  },
  accountOptionText: {
    fontSize: 14,
    color: palette.textSecondary,
  },
  accountOptionTextSelected: {
    color: palette.primary,
    fontWeight: '600',
  },
  printButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  printButtonText: {
    marginLeft: 6,
    fontSize: 14,
    color: palette.primary,
    fontWeight: '500',
  },
  subPaymentsContainer: {
    marginTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
    paddingTop: 12,
  },
  subPaymentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  subPaymentsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.textSecondary,
  },
  subPaymentsList: {
    gap: 8,
  },
  subPaymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subPaymentFields: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  subPaymentInput: {
    flex: 1,
    fontSize: 14,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 14,
    color: palette.textPrimary,
    backgroundColor: palette.surface,
  },
  removeSubPaymentButton: {
    padding: 8,
  },
  addSubPaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: palette.primary,
    borderRadius: 6,
    borderStyle: 'dashed',
    justifyContent: 'center',
  },
  addSubPaymentText: {
    marginLeft: 6,
    fontSize: 14,
    color: palette.primary,
    fontWeight: '500',
  },
});