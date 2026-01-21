import { Ionicons } from '@expo/vector-icons';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { type RootStackParamList } from '../navigation/types';
import { 
  fetchPendingQuotas, 
  payQuota, 
  searchCustomers, 
  type PendingQuota,
  type CustomerSearchResult,
  getTreasuryAccounts
} from '../services/apiService';
import { 
  usePosStore, 
  selectPaymentCards, 
  selectTreasuryAccounts,
  selectSelectedCustomer,
  type PaymentCard,
  type PaymentCardType,
  type PosCustomer
} from '../store/usePosStore';
import { palette } from '../theme/palette';
import { formatCurrency } from '../utils/currency';
import { PaymentCard as PaymentCardComponent } from '../components/PaymentCard';
import { PaymentSummary } from '../components/PaymentSummary';
import { usePaymentCalculations } from '../hooks/usePaymentCalculations';

type CreditPaymentScreenProps = NativeStackScreenProps<RootStackParamList, 'CreditPayment'>;

const PAYMENT_OPTIONS: Array<{ type: PaymentCardType; label: string; icon: string }> = [
  { type: 'CASH', label: 'Efectivo', icon: 'cash-outline' },
  { type: 'DEBIT_CARD', label: 'Tarjeta de débito', icon: 'card-outline' },
  { type: 'CREDIT_CARD', label: 'Tarjeta de crédito', icon: 'card-outline' },
  { type: 'TRANSFER', label: 'Transferencia', icon: 'swap-horizontal-outline' },
];

function CreditPaymentScreen({ navigation }: CreditPaymentScreenProps) {
  const selectedCustomer = usePosStore(selectSelectedCustomer);
  const setSelectedCustomer = usePosStore((state) => state.setSelectedCustomer);
  const clearSelectedCustomer = usePosStore((state) => state.clearSelectedCustomer);
  
  const paymentCards = usePosStore(selectPaymentCards);
  const treasuryAccounts = usePosStore(selectTreasuryAccounts);
  const addPaymentCard = usePosStore((state) => state.addPaymentCard);
  const updatePaymentCard = usePosStore((state) => state.updatePaymentCard);
  const removePaymentCard = usePosStore((state) => state.removePaymentCard);
  const clearPayments = usePosStore((state) => state.clearPayments);

  const [customerQuery, setCustomerQuery] = useState('');
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);
  const [customerResults, setCustomerResults] = useState<CustomerSearchResult[]>([]);
  
  const [quotas, setQuotas] = useState<PendingQuota[]>([]);
  const [isLoadingQuotas, setIsLoadingQuotas] = useState(false);
  const [selectedQuota, setSelectedQuota] = useState<PendingQuota | null>(null);
  
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const paymentCalculations = usePaymentCalculations({
    paymentCards,
    totalToPay: selectedQuota?.amount ?? 0,
    selectedCustomer,
  });

  const mapCustomerToStore = (customer: CustomerSearchResult): PosCustomer => ({
    customerId: customer.customerId,
    personId: customer.personId,
    displayName: customer.displayName,
    documentType: customer.documentType,
    documentNumber: customer.documentNumber,
    email: customer.email,
    phone: customer.phone,
    address: customer.address,
    creditLimit: customer.creditLimit,
    currentBalance: customer.currentBalance,
    availableCredit: customer.availableCredit,
    paymentDayOfMonth: customer.paymentDayOfMonth as any,
  });

  useEffect(() => {
    if (selectedCustomer) {
      void loadQuotas(selectedCustomer.customerId);
    } else {
      setQuotas([]);
      setSelectedQuota(null);
    }
  }, [selectedCustomer]);

  const loadQuotas = async (customerId: string) => {
    setIsLoadingQuotas(true);
    try {
      const data = await fetchPendingQuotas(customerId);
      setQuotas(data);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar las cuotas pendientes.');
    } finally {
      setIsLoadingQuotas(false);
    }
  };

  const handleCustomerSearch = async () => {
    const trimmed = customerQuery.trim();
    if (trimmed.length < 2) return;
    setIsSearchingCustomers(true);
    try {
      const results = await searchCustomers(trimmed);
      setCustomerResults(results.customers);
    } catch (error) {
      Alert.alert('Error', 'No se pudo buscar clientes.');
    } finally {
      setIsSearchingCustomers(false);
    }
  };

  const handleSelectQuota = (quota: PendingQuota) => {
    setSelectedQuota(quota);
    clearPayments();
  };

  const handleAddPaymentCard = (type: PaymentCardType) => {
    addPaymentCard(type);
    setShowPaymentOptions(false);
  };

  const handleFinalizePayment = async () => {
    if (!selectedQuota || !paymentCalculations.canFinalize) {
      Alert.alert('Error', 'Verifique los montos de pago.');
      return;
    }

    const session = usePosStore.getState().cashSession;
    if (!session) {
      Alert.alert('Error', 'No hay sesión de caja activa');
      return;
    }

    setIsProcessing(true);
    try {
      await payQuota({
        quotaId: selectedQuota.id,
        originalTransactionId: selectedQuota.transactionId,
        cashSessionId: session.id,
        payments: paymentCards.map(c => ({
          paymentMethod: c.type,
          amount: c.amount,
          bankAccountId: c.bankAccountId,
        })),
      });

      Alert.alert('Éxito', 'Pago registrado correctamente.');
      clearPayments();
      if (selectedCustomer) void loadQuotas(selectedCustomer.customerId);
      setSelectedQuota(null);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'No se pudo procesar el pago.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.root}
    >
      <View style={styles.columns}>
        {/* Columna Izquierda: Búsqueda de Cliente y Cuotas */}
        <View style={[styles.column, styles.leftColumn]}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Cliente</Text>
            {selectedCustomer ? (
              <View style={styles.selectedCustomerBox}>
                <View style={styles.selectedCustomerInfo}>
                  <Text style={styles.customerName}>{selectedCustomer.displayName}</Text>
                  <Text style={styles.customerMeta}>
                    {selectedCustomer.documentNumber || 'Sin documento'}
                  </Text>
                  <Text style={styles.customerCredit}>
                    Disponible: {formatCurrency(selectedCustomer.availableCredit)}
                  </Text>
                </View>
                <TouchableOpacity onPress={clearSelectedCustomer}>
                  <Ionicons name="close-circle" size={24} color={palette.danger} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.searchRow}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar cliente..."
                  value={customerQuery}
                  onChangeText={setCustomerQuery}
                  onSubmitEditing={handleCustomerSearch}
                />
                <TouchableOpacity style={styles.searchButton} onPress={handleCustomerSearch}>
                  <Ionicons name="search" size={20} color={palette.primaryText} />
                </TouchableOpacity>
              </View>
            )}

            {!selectedCustomer && customerResults.length > 0 && (
              <ScrollView style={styles.resultsList}>
                {customerResults.map(c => (
                  <TouchableOpacity 
                    key={c.customerId} 
                    style={styles.resultItem} 
                    onPress={() => {
                        setSelectedCustomer(mapCustomerToStore(c));
                        setCustomerResults([]);
                    }}
                  >
                    <Text>{c.displayName}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {selectedCustomer && (
            <View style={[styles.card, { flex: 1 }]}>
              <Text style={styles.cardTitle}>Cuotas Pendientes</Text>
              {isLoadingQuotas ? (
                <ActivityIndicator color={palette.primary} />
              ) : quotas.length === 0 ? (
                <Text style={styles.emptyText}>No hay cuotas pendientes.</Text>
              ) : (
                <ScrollView>
                  {quotas.map(q => (
                    <TouchableOpacity
                      key={q.id}
                      style={[
                        styles.quotaItem,
                        selectedQuota?.id === q.id && styles.selectedQuotaItem
                      ]}
                      onPress={() => handleSelectQuota(q)}
                    >
                      <View>
                        <Text style={styles.quotaDoc}>Venta: {q.documentNumber}</Text>
                        <Text style={styles.quotaDate}>Vence: {q.dueDate}</Text>
                      </View>
                      <Text style={styles.quotaAmount}>{formatCurrency(q.amount)}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          )}
        </View>

        {/* Columna Derecha: Pagos */}
        <View style={[styles.column, styles.rightColumn]}>
          <ScrollView contentContainerStyle={styles.paymentScroll}>
            {selectedQuota ? (
              <>
                <PaymentSummary
                  totalToPay={selectedQuota.amount}
                  totalPaid={paymentCalculations.totalPaid}
                  change={paymentCalculations.change}
                  onShowAddPaymentModal={() => setShowPaymentOptions(true)}
                />

                <View style={styles.cardsContainer}>
                  {paymentCards.map(card => (
                    <PaymentCardComponent
                      key={card.id}
                      card={card}
                      treasuryAccounts={treasuryAccounts}
                      onUpdate={(updates) => updatePaymentCard(card.id, updates)}
                      onRemove={() => removePaymentCard(card.id)}
                      maxAmount={selectedQuota.amount}
                    />
                  ))}
                </View>

                <TouchableOpacity
                  style={[
                    styles.finalizeButton,
                    (!paymentCalculations.canFinalize || isProcessing) && styles.finalizeButtonDisabled
                  ]}
                  disabled={!paymentCalculations.canFinalize || isProcessing}
                  onPress={handleFinalizePayment}
                >
                  {isProcessing ? (
                    <ActivityIndicator color={palette.primaryText} />
                  ) : (
                    <Text style={styles.finalizeButtonText}>Confirmar Pago de Cuota</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.centered}>
                <Ionicons name="card-outline" size={64} color={palette.textMuted} />
                <Text style={styles.emptyText}>Seleccione una cuota para pagar</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      <Modal transparent visible={showPaymentOptions} animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setShowPaymentOptions(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Seleccionar Medio de Pago</Text>
            {PAYMENT_OPTIONS.map(opt => (
              <TouchableOpacity 
                key={opt.type} 
                style={styles.optionItem}
                onPress={() => handleAddPaymentCard(opt.type)}
              >
                <Ionicons name={opt.icon as any} size={24} color={palette.primary} />
                <Text style={styles.optionLabel}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.background, padding: 16 },
  columns: { flex: 1, flexDirection: 'row' },
  column: { flex: 1 },
  leftColumn: { marginRight: 8 },
  rightColumn: { marginLeft: 8, backgroundColor: palette.surface, borderRadius: 16, padding: 16 },
  card: { backgroundColor: palette.surface, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: palette.border },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: palette.textSecondary, marginBottom: 12 },
  searchRow: { flexDirection: 'row' },
  searchInput: { flex: 1, height: 48, borderRadius: 8, borderWidth: 1, borderColor: palette.border, paddingHorizontal: 12, backgroundColor: palette.background },
  searchButton: { width: 48, height: 48, backgroundColor: palette.primary, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  resultsList: { maxHeight: 200, marginTop: 8 },
  resultItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: palette.border },
  selectedCustomerBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectedCustomerInfo: { flex: 1 },
  customerName: { fontSize: 16, fontWeight: 'bold', color: palette.textPrimary },
  customerMeta: { fontSize: 14, color: palette.textMuted },
  customerCredit: { fontSize: 14, color: palette.primary, fontWeight: '600' },
  emptyText: { textAlign: 'center', marginTop: 20, color: palette.textMuted },
  quotaItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 8, borderBottomWidth: 1, borderBottomColor: palette.border, marginBottom: 4 },
  selectedQuotaItem: { backgroundColor: palette.primary + '15', borderColor: palette.primary, borderWidth: 1 },
  quotaDoc: { fontWeight: '600', fontSize: 14 },
  quotaDate: { fontSize: 12, color: palette.textMuted },
  quotaAmount: { fontWeight: 'bold', fontSize: 16, color: palette.textPrimary },
  paymentScroll: { flexGrow: 1 },
  cardsContainer: { marginTop: 16, gap: 12 },
  finalizeButton: { backgroundColor: palette.primary, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  finalizeButtonDisabled: { opacity: 0.5 },
  finalizeButtonText: { color: palette.primaryText, fontSize: 18, fontWeight: 'bold' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: palette.surface, width: '80%', borderRadius: 16, padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  optionItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: palette.border },
  optionLabel: { marginLeft: 16, fontSize: 16, fontWeight: '500' },
});

export default CreditPaymentScreen;
