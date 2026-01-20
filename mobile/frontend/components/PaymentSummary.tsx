import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatAmount } from '../utils/currency';
import { palette } from '../theme/palette';

interface PaymentSummaryProps {
  totalToPay: number;
  totalPaid: number;
  change: number;
  onShowAddPaymentModal?: () => void;
}

export function PaymentSummary({ totalToPay, totalPaid, change, onShowAddPaymentModal }: PaymentSummaryProps) {
  const remaining = Math.max(0, totalToPay - totalPaid);

  return (
    <View style={styles.container}>
      {onShowAddPaymentModal && (
        <>
          <View style={styles.addButtonRow}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={onShowAddPaymentModal}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={30} color={palette.primaryText} />
            </TouchableOpacity>
            <Text style={styles.addButtonLabel}>pago</Text>
          </View>
          <View style={styles.divider} />
        </>
      )}

      <View style={styles.amountRow}>
        <Text style={styles.amountPaid}>
          {formatAmount(totalPaid)}
        </Text>
        <Text style={styles.amountLabel}>Abonado</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.amountRow}>
        <Text style={[styles.amount, styles.amountToPay]}>
          {formatAmount(remaining)}
        </Text>
        <Text style={styles.amountLabel}>Por pagar</Text>
      </View>

      {change > 0 && (
        <>
          <View style={styles.divider} />
          <View style={styles.amountRow}>
            <Text style={styles.changeAmount}>
              {formatAmount(change)}
            </Text>
            <Text style={styles.amountLabel}>Vuelto</Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    padding: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  amountRow: {
    alignItems: 'center',
  },
  amount: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  amountToPay: {
    color: palette.danger,
  },
  amountLabel: {
    fontSize: 14,
    color: palette.textMuted,
    marginTop: 2,
  },
  amountPaid: {
    fontSize: 24,
    color: palette.primary,
    fontWeight: '600',
  },
  changeAmount: {
    fontSize: 20,
    color: palette.success || '#28a745',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: palette.border,
    marginVertical: 6,
  },
  addButtonRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  addButtonLabel: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
    color: palette.primary,
    textAlign: 'center',
  },
});