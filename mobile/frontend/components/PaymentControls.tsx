import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PaymentCardType } from '../store/usePosStore';
import { palette } from '../theme/palette';

interface PaymentControlsProps {
  onAddPayment: (type: PaymentCardType) => void;
}

const PAYMENT_OPTIONS: Array<{ type: PaymentCardType; label: string; icon: string }> = [
  { type: 'CASH', label: 'Efectivo', icon: 'cash-outline' },
  { type: 'CREDIT_CARD', label: 'Tarjeta de crédito', icon: 'card-outline' },
  { type: 'DEBIT_CARD', label: 'Tarjeta de débito', icon: 'card-outline' },
  { type: 'TRANSFER', label: 'Transferencia', icon: 'swap-horizontal-outline' },
  { type: 'INTERNAL_CREDIT', label: 'Crédito interno', icon: 'wallet-outline' },
];

export function PaymentControls({ onAddPayment }: PaymentControlsProps) {
  const [showOptions, setShowOptions] = useState(false);

  const handleAddPayment = (type: PaymentCardType) => {
    onAddPayment(type);
    setShowOptions(false);
  };

  return (
    <>
      <TouchableOpacity
        style={styles.addButtonContainer}
        onPress={() => setShowOptions(true)}
        activeOpacity={0.85}
      >
        <View style={styles.addButton}>
          <Ionicons name="add" size={24} color={palette.primaryText} />
        </View>
        <Text style={styles.addButtonText}>pago</Text>
      </TouchableOpacity>

      <Modal
        transparent
        visible={showOptions}
        animationType="fade"
        onRequestClose={() => setShowOptions(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowOptions(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Agregar método de pago</Text>
            <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
              {PAYMENT_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.type}
                  style={styles.optionItem}
                  onPress={() => handleAddPayment(option.type)}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionIcon}>
                    <Ionicons name={option.icon as any} size={20} color={palette.primary} />
                  </View>
                  <Text style={styles.optionLabel}>{option.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color={palette.textMuted} />
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowOptions(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  addButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  addButtonText: {
    marginTop: 4,
    fontSize: 12,
    color: palette.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: palette.surface,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 320,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: palette.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  optionsList: {
    maxHeight: 300,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: palette.surfaceMuted,
  },
  optionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionLabel: {
    flex: 1,
    fontSize: 16,
    color: palette.textPrimary,
    fontWeight: '500',
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: palette.surfaceMuted,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: palette.textSecondary,
    fontWeight: '500',
  },
});