import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatAmount } from '../utils/currency';
import { palette } from '../theme/palette';

interface PaymentSummaryProps {
  totalToPay: number;
  totalPaid: number;
  change: number;
}

export function PaymentSummary({ totalToPay, totalPaid, change }: PaymentSummaryProps) {
  const remaining = Math.max(0, totalToPay - totalPaid);

  return (
    <View style={styles.container}>
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
});