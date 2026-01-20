import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatAmount } from '../utils/currency';
import { palette } from '../theme/palette';

interface PaymentTotalsProps {
  totalPaid: number;
  change: number;
}

export function PaymentTotals({ totalPaid, change }: PaymentTotalsProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>Abonado:</Text>
        <Text style={styles.amount}>{formatAmount(totalPaid)}</Text>
      </View>

      {change > 0 && (
        <View style={styles.row}>
          <Text style={styles.label}>Vuelto:</Text>
          <Text style={[styles.amount, styles.changeAmount]}>{formatAmount(change)}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: palette.textMuted,
    fontWeight: '500',
  },
  amount: {
    fontSize: 16,
    color: palette.textPrimary,
    fontWeight: '600',
  },
  changeAmount: {
    color: palette.success || '#28a745',
  },
});