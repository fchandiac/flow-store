import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
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
  Alert,
} from 'react-native';
import {
  selectCartItems,
  selectCartTotals,
  selectSelectedCustomer,
  selectPaymentCards,
  selectTreasuryAccounts,
  selectUser,
  selectPointOfSale,
  selectCashSession,
  usePosStore,
  type PosCustomer,
  type PaymentCard,
  type TreasuryAccountOption,
  type PaymentCardType,
} from '../store/usePosStore';
import { formatCurrency, formatAmount } from '../utils/currency';
import { palette } from '../theme/palette';
import {
  createCustomer,
  searchCustomers,
  getTreasuryAccounts,
  createMultiplePayments,
  createSale,
  type CreateCustomerInput,
  type CustomerSearchResult,
  type SaleLineInput,
} from '../services/apiService';
import { PaymentCard as PaymentCardComponent } from '../components/PaymentCard';
import { PaymentSummary } from '../components/PaymentSummary';
import { usePaymentCalculations } from '../hooks/usePaymentCalculations';

type CreateCustomerFormState = {
  firstName: string;
  lastName: string;
  personType: CustomerPersonType;
  documentType: string;
  documentNumber: string;
  email: string;
  phone: string;
  address: string;
};

type CustomerPersonType = 'NATURAL' | 'COMPANY';

const documentTypeOptions: Record<CustomerPersonType, Array<{ label: string; value: string }>> = {
  NATURAL: [
    { label: 'RUN', value: 'RUN' },
    { label: 'Pasaporte', value: 'PASSPORT' },
    { label: 'Otro', value: 'OTHER' },
  ],
  COMPANY: [{ label: 'RUT', value: 'RUT' }],
};

const personTypeOptions: Array<{ label: string; value: CustomerPersonType }> = [
  { label: 'Persona natural', value: 'NATURAL' },
  { label: 'Empresa', value: 'COMPANY' },
];

const createEmptyCustomerForm = (): CreateCustomerFormState => ({
  firstName: '',
  lastName: '',
  personType: 'NATURAL',
  documentType: 'RUN',
  documentNumber: '',
  email: '',
  phone: '',
  address: '',
});

const PAYMENT_OPTIONS: Array<{ type: PaymentCardType; label: string; icon: string }> = [
  { type: 'CASH', label: 'Efectivo', icon: 'cash-outline' },
    { type: 'DEBIT_CARD', label: 'Tarjeta de débito', icon: 'card-outline' },
  { type: 'CREDIT_CARD', label: 'Tarjeta de crédito', icon: 'card-outline' },
  { type: 'TRANSFER', label: 'Transferencia', icon: 'swap-horizontal-outline' },
  { type: 'INTERNAL_CREDIT', label: 'Crédito interno', icon: 'wallet-outline' },
];

import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { type RootStackParamList } from '../navigation/types';

type PaymentScreenProps = NativeStackScreenProps<RootStackParamList, 'Payment'>;

function PaymentScreen({ navigation }: PaymentScreenProps) {
  const cartItems = usePosStore(selectCartItems);
  const cartTotals = usePosStore(selectCartTotals);
  const selectedCustomer: PosCustomer | null = usePosStore(selectSelectedCustomer);
  const paymentCards = usePosStore(selectPaymentCards);
  const treasuryAccounts = usePosStore(selectTreasuryAccounts);
  const setSelectedCustomer = usePosStore((state) => state.setSelectedCustomer);
  const clearSelectedCustomer = usePosStore((state) => state.clearSelectedCustomer);
  const addPaymentCard = usePosStore((state) => state.addPaymentCard);
  const updatePaymentCard = usePosStore((state) => state.updatePaymentCard);
  const removePaymentCard = usePosStore((state) => state.removePaymentCard);
  const addSubPayment = usePosStore((state) => state.addSubPayment);
  const updateSubPayment = usePosStore((state) => state.updateSubPayment);
  const removeSubPayment = usePosStore((state) => state.removeSubPayment);
  const clearPayments = usePosStore((state) => state.clearPayments);
  const clearCart = usePosStore((state) => state.clearCart);
  const setTreasuryAccounts = usePosStore((state) => state.setTreasuryAccounts);

  const [customerQuery, setCustomerQuery] = useState('');
  const [customerResults, setCustomerResults] = useState<CustomerSearchResult[]>([]);
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);
  const [customerSearchError, setCustomerSearchError] = useState<string | null>(null);
  const [hasSearchedCustomers, setHasSearchedCustomers] = useState(false);
  const [isCreateCustomerVisible, setIsCreateCustomerVisible] = useState(false);
  const [createCustomerForm, setCreateCustomerForm] = useState<CreateCustomerFormState>(
    () => createEmptyCustomerForm(),
  );
  const [createCustomerError, setCreateCustomerError] = useState<string | null>(null);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);

  // Cálculos de pagos
  const paymentCalculations = usePaymentCalculations({
    paymentCards,
    totalToPay: cartTotals.total,
    selectedCustomer,
  });

  // Cargar cuentas bancarias al montar el componente
  useEffect(() => {
    const loadTreasuryAccounts = async () => {
      setIsLoadingAccounts(true);
      try {
        const accounts = await getTreasuryAccounts();
        setTreasuryAccounts(accounts);
      } catch (error) {
        console.error('Error loading treasury accounts:', error);
      } finally {
        setIsLoadingAccounts(false);
      }
    };

    void loadTreasuryAccounts();
  }, [setTreasuryAccounts]);

  const currentDocumentTypeOptions = documentTypeOptions[createCustomerForm.personType];
  const isNaturalPerson = createCustomerForm.personType === 'NATURAL';

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
    paymentDayOfMonth: customer.paymentDayOfMonth,
  });

  const handleCustomerSearch = async () => {
    const query = customerQuery.trim();
    setIsSearchingCustomers(true);
    setCustomerSearchError(null);

    try {
      const response = await searchCustomers({ query, page: 1, pageSize: 15 });
      setCustomerResults(response.customers);
      setHasSearchedCustomers(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo buscar clientes.';
      setCustomerSearchError(message);
      setCustomerResults([]);
      setHasSearchedCustomers(true);
    } finally {
      setIsSearchingCustomers(false);
    }
  };

  const handleSelectCustomer = (customer: CustomerSearchResult) => {
    setSelectedCustomer(mapCustomerToStore(customer));
  };

  const handleClearCustomer = () => {
    clearSelectedCustomer();
  };

  const handleOpenCreateCustomer = () => {
    const trimmed = customerQuery.trim();
    if (trimmed) {
      const [firstName, ...rest] = trimmed.split(/\s+/);
      setCreateCustomerForm({
        ...createEmptyCustomerForm(),
        firstName: firstName ?? '',
        lastName: rest.join(' ').trim(),
      });
    } else {
      setCreateCustomerForm(createEmptyCustomerForm());
    }
    setCreateCustomerError(null);
    setIsCreateCustomerVisible(true);
  };

  const handleCloseCreateCustomer = () => {
    if (isCreatingCustomer) {
      return;
    }
    setIsCreateCustomerVisible(false);
    setCreateCustomerError(null);
    setIsCreatingCustomer(false);
    setCreateCustomerForm(createEmptyCustomerForm());
  };

  const updateCreateCustomerField = (field: keyof CreateCustomerFormState, value: string) => {
    setCreateCustomerForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSelectPersonType = (personType: CustomerPersonType) => {
    setCreateCustomerForm((prev) => {
      if (prev.personType === personType) {
        return prev;
      }

      const allowedDocumentTypes = documentTypeOptions[personType].map((option) => option.value);
      const nextDocumentType = allowedDocumentTypes.includes(prev.documentType)
        ? prev.documentType
        : allowedDocumentTypes[0];

      return {
        ...prev,
        personType,
        documentType: nextDocumentType,
        lastName: personType === 'COMPANY' ? '' : prev.lastName,
      };
    });
  };

  const handleSubmitCreateCustomer = async () => {
    const trimmedFirstName = createCustomerForm.firstName.trim();
    if (!trimmedFirstName) {
      setCreateCustomerError('El nombre es obligatorio.');
      return;
    }

    setIsCreatingCustomer(true);
    setCreateCustomerError(null);

    try {
      const payload: CreateCustomerInput = {
        firstName: trimmedFirstName,
        personType: createCustomerForm.personType,
      };

      const trimmedLastName = createCustomerForm.lastName.trim();
      const trimmedDocumentNumber = createCustomerForm.documentNumber.trim();
      const trimmedEmail = createCustomerForm.email.trim();
      const trimmedPhone = createCustomerForm.phone.trim();
      const trimmedAddress = createCustomerForm.address.trim();
      const allowedDocumentTypes = currentDocumentTypeOptions.map((option) => option.value);
      const selectedDocumentType = allowedDocumentTypes.includes(createCustomerForm.documentType)
        ? createCustomerForm.documentType
        : allowedDocumentTypes[0];

      if (trimmedLastName && createCustomerForm.personType === 'NATURAL') {
        payload.lastName = trimmedLastName;
      }
      if (selectedDocumentType) {
        payload.documentType = selectedDocumentType;
      }
      if (trimmedDocumentNumber) {
        payload.documentNumber = trimmedDocumentNumber;
      }
      if (trimmedEmail) {
        payload.email = trimmedEmail;
      }
      if (trimmedPhone) {
        payload.phone = trimmedPhone;
      }
      if (trimmedAddress) {
        payload.address = trimmedAddress;
      }

      const createdCustomer = await createCustomer(payload);
      setSelectedCustomer(mapCustomerToStore(createdCustomer));
      setCustomerResults((prev) => {
        const filtered = prev.filter((customer) => customer.customerId !== createdCustomer.customerId);
        return [createdCustomer, ...filtered];
      });
      setHasSearchedCustomers(true);
      setIsCreateCustomerVisible(false);
      setCreateCustomerForm(createEmptyCustomerForm());
      setCreateCustomerError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo crear el cliente.';
      setCreateCustomerError(message);
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  // Payment handlers
  const handleShowPaymentOptions = () => {
    setShowPaymentOptions(true);
  };

  const handleAddPaymentCard = (type: Parameters<typeof addPaymentCard>[0]) => {
    if (type === 'INTERNAL_CREDIT' && !selectedCustomer) {
      Alert.alert(
        'Cliente requerido',
        'Debe seleccionar un cliente para poder utilizar el método de Pago a Crédito.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Por defecto, el monto de la nueva tarjeta es el saldo restante
    addPaymentCard(type);
    setShowPaymentOptions(false);
    // El cálculo automático se hará en el useEffect del componente PaymentCard
  };

  const handleUpdatePaymentCard = (id: string, updates: Partial<PaymentCard>) => {
    updatePaymentCard(id, updates);
  };

  const handleRemovePaymentCard = (id: string) => {
    removePaymentCard(id);
  };

  const handleAddSubPayment = (cardId: string, subPayment: Parameters<typeof addSubPayment>[1]) => {
    addSubPayment(cardId, subPayment);
  };

  const handleUpdateSubPayment = (cardId: string, subPaymentId: string, updates: Parameters<typeof updateSubPayment>[2]) => {
    updateSubPayment(cardId, subPaymentId, updates);
  };

  const handleRemoveSubPayment = (cardId: string, subPaymentId: string) => {
    removeSubPayment(cardId, subPaymentId);
  };

  const handleFinalizeSale = async () => {
    if (!paymentCalculations.canFinalize) {
      if (paymentCalculations.internalCreditExceedsBalance) {
        Alert.alert(
          'Crédito insuficiente',
          `El monto del pago con crédito interno supera el límite disponible del cliente (${formatCurrency(selectedCustomer?.availableCredit ?? 0)}).`
        );
      } else if (paymentCalculations.nonCashExceedsTotal) {
        Alert.alert(
          'Error de pagos',
          'Los pagos que no son en efectivo no pueden superar el total de la venta.'
        );
      } else {
        Alert.alert('Error', 'No se puede finalizar la venta. Verifique los montos de pago.');
      }
      return;
    }

    setIsProcessingPayment(true);
    try {
      // Obtener datos del store
      const user = selectUser(usePosStore.getState());
      const pointOfSale = selectPointOfSale(usePosStore.getState());
      const cashSession = selectCashSession(usePosStore.getState());
      const selectedCustomer = selectSelectedCustomer(usePosStore.getState());

      if (!user || !pointOfSale || !cashSession) {
        throw new Error('Información de usuario, punto de venta o sesión de caja no disponible');
      }

      // Crear las líneas de venta
      const saleLines: SaleLineInput[] = cartItems.map((item) => ({
        productVariantId: item.variantId,
        quantity: item.qty,
        unitPrice: item.unitPrice,
        taxRate: item.unitTaxRate,
        taxAmount: item.taxAmount,
      }));

      // Crear la venta
      const saleResult = await createSale({
        userName: user.userName,
        pointOfSaleId: pointOfSale.id,
        cashSessionId: cashSession.id,
        paymentMethod: 'MIXED', // Usamos MIXED para pagos múltiples
        amountPaid: paymentCalculations.totalPaid,
        lines: saleLines,
        customerId: selectedCustomer?.customerId,
      });

      // Crear los pagos múltiples
      if (paymentCards.length > 0) {
        const paymentsInput = paymentCards.map((card) => {
          let amount = card.amount;
          if (card.type === 'INTERNAL_CREDIT' && card.subPayments) {
            amount = card.subPayments.reduce((sum, sub) => sum + sub.amount, 0);
          }

          return {
            paymentMethod: card.type,
            amount,
            bankAccountId: card.bankAccountId,
            subPayments: card.subPayments?.map((sub) => ({
              amount: sub.amount,
              dueDate: sub.dueDate,
            })),
          };
        });

        await createMultiplePayments({
          saleTransactionId: saleResult.transaction.id,
          payments: paymentsInput,
        });
      }

      Alert.alert('Éxito', `Venta finalizada correctamente\nNúmero: ${saleResult.transaction.documentNumber}`);

      // Limpiar estado
      clearPayments();
      clearCart();
      clearSelectedCustomer();

      // Navegar automáticamente a la pantalla POS
      navigation.navigate('Pos');

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al procesar el pago';
      Alert.alert('Error', message);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <>
      <Modal
        transparent
        visible={isCreateCustomerVisible}
        animationType="fade"
        onRequestClose={handleCloseCreateCustomer}
      >
        <Pressable
          style={styles.createCustomerModalBackdrop}
          onPress={handleCloseCreateCustomer}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.createCustomerModalContainer}
          >
            <Pressable
              style={styles.createCustomerModalCard}
              onPress={(event) => event.stopPropagation()}
            >
              <Text style={styles.createCustomerModalTitle}>Crear cliente</Text>
              <Text style={styles.createCustomerModalSubtitle}>
                Ingresa los datos básicos del cliente para asociarlo a la venta.
              </Text>
              {createCustomerError ? (
                <View style={styles.createCustomerErrorBox}>
                  <Ionicons name="alert-circle-outline" size={18} color={palette.danger} />
                  <Text style={styles.createCustomerErrorText}>{createCustomerError}</Text>
                </View>
              ) : null}
              <ScrollView
                style={styles.createCustomerForm}
                contentContainerStyle={styles.createCustomerFormContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.createCustomerField}>
                  <Text style={styles.createCustomerLabel}>Nombre *</Text>
                  <TextInput
                    value={createCustomerForm.firstName}
                    onChangeText={(value) => updateCreateCustomerField('firstName', value)}
                    style={styles.createCustomerInput}
                    placeholder="Nombre"
                    placeholderTextColor={palette.textMuted}
                    autoCapitalize="words"
                    autoCorrect={false}
                    returnKeyType="next"
                  />
                </View>
                {isNaturalPerson ? (
                  <View style={styles.createCustomerField}>
                    <Text style={styles.createCustomerLabel}>Apellido</Text>
                    <TextInput
                      value={createCustomerForm.lastName}
                      onChangeText={(value) => updateCreateCustomerField('lastName', value)}
                      style={styles.createCustomerInput}
                      placeholder="Apellido"
                      placeholderTextColor={palette.textMuted}
                      autoCapitalize="words"
                      autoCorrect={false}
                      returnKeyType="next"
                    />
                  </View>
                ) : null}
                <View style={styles.createCustomerField}>
                  <Text style={styles.createCustomerLabel}>Tipo de persona</Text>
                  <View style={styles.createCustomerPersonTypeRow}>
                    {personTypeOptions.map((option) => {
                      const isSelected = createCustomerForm.personType === option.value;
                      return (
                        <TouchableOpacity
                          key={option.value}
                          style={[
                            styles.createCustomerPersonTypeChip,
                            isSelected && styles.createCustomerPersonTypeChipSelected,
                          ]}
                          activeOpacity={0.85}
                          onPress={() => handleSelectPersonType(option.value)}
                        >
                          <Text
                            style={[
                              styles.createCustomerPersonTypeLabel,
                              isSelected && styles.createCustomerPersonTypeLabelSelected,
                            ]}
                          >
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
                <View style={styles.createCustomerField}>
                  <Text style={styles.createCustomerLabel}>Tipo de documento</Text>
                  <View style={styles.createCustomerDocTypes}>
                    {currentDocumentTypeOptions.map((option) => {
                      const isSelected = createCustomerForm.documentType === option.value;
                      return (
                        <TouchableOpacity
                          key={option.value}
                          style={[
                            styles.createCustomerDocTypeChip,
                            isSelected && styles.createCustomerDocTypeChipSelected,
                          ]}
                          activeOpacity={0.85}
                          onPress={() => updateCreateCustomerField('documentType', option.value)}
                        >
                          <Text
                            style={[
                              styles.createCustomerDocTypeLabel,
                              isSelected && styles.createCustomerDocTypeLabelSelected,
                            ]}
                          >
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
                <View style={styles.createCustomerField}>
                  <Text style={styles.createCustomerLabel}>
                    {isNaturalPerson ? 'Número de documento' : 'RUT'}
                  </Text>
                  <TextInput
                    value={createCustomerForm.documentNumber}
                    onChangeText={(value) => updateCreateCustomerField('documentNumber', value)}
                    style={styles.createCustomerInput}
                    placeholder={isNaturalPerson ? 'Ej. 12.345.678-9' : 'Ej. 76.543.210-0'}
                    placeholderTextColor={palette.textMuted}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    returnKeyType="next"
                  />
                </View>
                <View style={styles.createCustomerField}>
                  <Text style={styles.createCustomerLabel}>Correo electrónico</Text>
                  <TextInput
                    value={createCustomerForm.email}
                    onChangeText={(value) => updateCreateCustomerField('email', value)}
                    style={styles.createCustomerInput}
                    placeholder="correo@cliente.com"
                    placeholderTextColor={palette.textMuted}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoCorrect={false}
                    returnKeyType="next"
                  />
                </View>
                <View style={styles.createCustomerField}>
                  <Text style={styles.createCustomerLabel}>Teléfono</Text>
                  <TextInput
                    value={createCustomerForm.phone}
                    onChangeText={(value) => updateCreateCustomerField('phone', value)}
                    style={styles.createCustomerInput}
                    placeholder="Ej. +56 9 1234 5678"
                    placeholderTextColor={palette.textMuted}
                    keyboardType="phone-pad"
                    returnKeyType="next"
                  />
                </View>
                <View style={styles.createCustomerField}>
                  <Text style={styles.createCustomerLabel}>Dirección</Text>
                  <TextInput
                    value={createCustomerForm.address}
                    onChangeText={(value) => updateCreateCustomerField('address', value)}
                    style={[styles.createCustomerInput, styles.createCustomerAddressInput]}
                    placeholder="Dirección del cliente"
                    placeholderTextColor={palette.textMuted}
                    autoCapitalize="sentences"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>
              </ScrollView>
              <View style={styles.createCustomerActions}>
                <TouchableOpacity
                  style={styles.createCustomerSecondaryAction}
                  activeOpacity={0.85}
                  onPress={handleCloseCreateCustomer}
                  disabled={isCreatingCustomer}
                >
                  <Text style={styles.createCustomerSecondaryActionLabel}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.createCustomerPrimaryAction,
                    isCreatingCustomer && styles.createCustomerPrimaryActionDisabled,
                  ]}
                  activeOpacity={0.85}
                  onPress={handleSubmitCreateCustomer}
                  disabled={isCreatingCustomer}
                >
                  {isCreatingCustomer ? (
                    <ActivityIndicator color={palette.primaryText} />
                  ) : (
                    <>
                      <Ionicons name="save-outline" size={18} color={palette.primaryText} />
                      <Text style={styles.createCustomerPrimaryActionLabel}>Guardar cliente</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      <View style={styles.root}>
        <View style={styles.columns}>
          <View style={[styles.column, styles.leftColumn]}>
            <View style={styles.card}>
              <View style={styles.summaryHeader}>
                <Text style={styles.cardTitle}>Resumen de la venta</Text>
                <Text style={styles.summaryTotalValueLarge}>{formatCurrency(cartTotals.total)}</Text>
              </View>
              {cartItems.length === 0 ? (
                <Text style={styles.emptyCart}>No hay productos en el carrito.</Text>
              ) : (
                <View>
                  <ScrollView
                    style={styles.itemsList}
                    contentContainerStyle={styles.itemsListContent}
                    showsVerticalScrollIndicator={false}
                  >
                    {cartItems.map((item) => (
                      <View key={item.variantId} style={styles.itemRow}>
                        <View style={styles.itemDetails}>
                          <Text style={styles.itemName} numberOfLines={1}>
                            {item.name}
                          </Text>
                          <Text style={styles.itemMeta} numberOfLines={1}>
                            {`${item.qty} x ${formatCurrency(item.unitPriceWithTax)}`}
                          </Text>
                        </View>
                        <Text style={styles.itemLineTotal}>{formatCurrency(item.total)}</Text>
                      </View>
                    ))}
                  </ScrollView>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Subtotal</Text>
                    <Text style={styles.summaryValue}>{formatCurrency(cartTotals.subtotal)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Impuestos</Text>
                    <Text style={styles.summaryValue}>{formatCurrency(cartTotals.taxAmount)}</Text>
                  </View>
                </View>
              )}

            </View>

              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderText}>
                    <Text style={styles.cardTitle}>Cliente</Text>
                    <Text style={styles.cardSubtitle}>
                      Busca un cliente existente o continúa sin asignar uno.
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.cardIconButton}
                    activeOpacity={0.85}
                    onPress={handleOpenCreateCustomer}
                  >
                    <Ionicons name="person-add-outline" size={20} color={palette.primaryText} />
                  </TouchableOpacity>
                </View>
                {selectedCustomer ? (
                  <View style={styles.selectedCustomerCard}>
                    <View style={styles.selectedCustomerHeader}>
                      <Ionicons name="person-circle-outline" size={40} color={palette.primary} />
                      <View style={styles.selectedCustomerInfo}>
                        <Text style={styles.selectedCustomerName}>{selectedCustomer.displayName}</Text>
                        {selectedCustomer.documentNumber ? (
                          <Text style={styles.selectedCustomerMeta}>
                            {selectedCustomer.documentType
                              ? `${selectedCustomer.documentType} • ${selectedCustomer.documentNumber}`
                              : selectedCustomer.documentNumber}
                          </Text>
                        ) : null}
                        {selectedCustomer.email ? (
                          <Text style={styles.selectedCustomerMeta}>{selectedCustomer.email}</Text>
                        ) : null}
                        {selectedCustomer.phone ? (
                          <Text style={styles.selectedCustomerMeta}>{selectedCustomer.phone}</Text>
                        ) : null}
                      </View>
                    </View>
                    <View style={styles.selectedCustomerFooter}>
                      <Text style={styles.selectedCustomerCredit}>
                        {`Crédito disponible ${formatCurrency(selectedCustomer.availableCredit)}`}
                      </Text>
                      <Text style={styles.selectedCustomerMeta}>{`Día de pago ${selectedCustomer.paymentDayOfMonth}`}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.clearCustomerButton}
                      activeOpacity={0.85}
                      onPress={handleClearCustomer}
                    >
                      <Ionicons name="close-circle-outline" size={18} color={palette.danger} />
                      <Text style={styles.clearCustomerLabel}>Quitar cliente</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <View style={styles.searchRow}>
                      <TextInput
                        value={customerQuery}
                        onChangeText={setCustomerQuery}
                        placeholder="Nombre, documento o correo"
                        placeholderTextColor={palette.textMuted}
                        style={styles.searchInput}
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="search"
                        onSubmitEditing={() => {
                          void handleCustomerSearch();
                        }}
                      />
                      <TouchableOpacity
                        style={[styles.searchButton, isSearchingCustomers && styles.searchButtonDisabled]}
                        activeOpacity={0.85}
                        disabled={isSearchingCustomers}
                        onPress={() => {
                          void handleCustomerSearch();
                        }}
                      >
                        {isSearchingCustomers ? (
                          <ActivityIndicator color={palette.primaryText} />
                        ) : (
                          <Ionicons name="search-outline" size={22} color={palette.primaryText} />
                        )}
                      </TouchableOpacity>
                    </View>
                    <View style={styles.searchResultsContainer}>
                      {isSearchingCustomers ? (
                        <View style={styles.searchMessage}>
                          <ActivityIndicator size="small" color={palette.primary} />
                          <Text style={styles.searchMessageText}>Buscando clientes…</Text>
                        </View>
                      ) : customerSearchError ? (
                        <View style={styles.searchMessage}>
                          <Ionicons name="alert-circle-outline" size={18} color={palette.danger} />
                          <Text style={[styles.searchMessageText, styles.searchMessageError]}>{customerSearchError}</Text>
                        </View>
                      ) : hasSearchedCustomers && customerResults.length === 0 ? (
                        <View style={styles.searchMessage}>
                          <Ionicons name="people-outline" size={18} color={palette.textMuted} />
                          <Text style={styles.searchMessageText}>No se encontraron clientes.</Text>
                        </View>
                      ) : customerResults.length === 0 ? null : (
                        <ScrollView
                          style={styles.customerResultsList}
                          contentContainerStyle={styles.customerResultsContent}
                          showsVerticalScrollIndicator={false}
                        >
                          {customerResults.map((customer) => {
                            const isSelected = !!selectedCustomer && (selectedCustomer as PosCustomer).customerId === customer.customerId;
                            return (
                              <TouchableOpacity
                                key={customer.customerId}
                                style={[
                                  styles.customerResultCard,
                                  isSelected && styles.customerResultCardSelected,
                                ]}
                                activeOpacity={0.85}
                                onPress={() => handleSelectCustomer(customer)}
                              >
                                <View style={styles.customerResultHeader}>
                                  <Ionicons name="person-circle-outline" size={28} color={palette.textSecondary} />
                                  <View style={styles.customerResultInfo}>
                                    <Text style={styles.customerResultName} numberOfLines={1}>
                                      {customer.displayName}
                                    </Text>
                                    {customer.documentNumber ? (
                                      <Text style={styles.customerResultMeta} numberOfLines={1}>
                                        {customer.documentType
                                          ? `${customer.documentType} • ${customer.documentNumber}`
                                          : customer.documentNumber}
                                      </Text>
                                    ) : null}
                                  </View>
                                  {isSelected ? (
                                    <Ionicons name="checkmark-circle" size={20} color={palette.primary} />
                                  ) : null}
                                </View>
                                <View style={styles.customerResultBody}>
                                  {customer.email ? (
                                    <Text style={styles.customerResultDetail} numberOfLines={1}>
                                      {customer.email}
                                    </Text>
                                  ) : null}
                                  {customer.phone ? (
                                    <Text style={styles.customerResultDetail} numberOfLines={1}>
                                      {customer.phone}
                                    </Text>
                                  ) : null}
                                </View>
                                <View style={styles.customerResultFooter}>
                                  <Text style={styles.customerResultCredit}>
                                    {`Crédito disponible ${formatCurrency(customer.availableCredit)}`}
                                  </Text>
                                  <Text style={styles.customerResultTerm}>{`Día de pago ${customer.paymentDayOfMonth}`}</Text>
                                </View>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      )}
                    </View>
                  </>
                )}
              </View>
          </View>

          <View style={[styles.column, styles.rightColumn]}>
            <ScrollView 
              style={styles.paymentScrollContainer}
              contentContainerStyle={styles.paymentScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Layout de tres columnas para pagos */}
              <View style={styles.paymentLayout}>
                {/* Columna izquierda: Montos */}
                <View style={styles.paymentLeftColumn}>
                  <PaymentSummary
                    totalToPay={cartTotals.total}
                    totalPaid={paymentCalculations.totalPaid}
                    change={paymentCalculations.change}
                    onShowAddPaymentModal={handleShowPaymentOptions}
                  />
                </View>

                {/* Columna central: Cards de pago */}
                <View style={styles.paymentCenterColumn}>
                  <View style={styles.paymentCardsContainer}>
                    {paymentCards.map((card) => (
                      <PaymentCardComponent
                        key={card.id}
                        card={card}
                        treasuryAccounts={treasuryAccounts}
                        onUpdate={(updates) => handleUpdatePaymentCard(card.id, updates)}
                        onRemove={() => handleRemovePaymentCard(card.id)}
                        onAddSubPayment={(subPayment) => handleAddSubPayment(card.id, subPayment)}
                        onUpdateSubPayment={(subPaymentId, updates) =>
                          handleUpdateSubPayment(card.id, subPaymentId, updates)
                        }
                        onRemoveSubPayment={(subPaymentId) =>
                          handleRemoveSubPayment(card.id, subPaymentId)
                        }
                        maxAmount={cartTotals.total}
                        customerPaymentDay={selectedCustomer?.paymentDayOfMonth}
                      />
                    ))}
                    {paymentCards.length === 0 && (
                      <View style={styles.emptyPayments}>
                        <Ionicons name="card-outline" size={48} color={palette.textMuted} />
                        <Text style={styles.emptyPaymentsText}>
                          Agrega métodos de pago para continuar
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Advertencias de validación */}
              {paymentCalculations.nonCashExceedsTotal && (
                <View style={styles.validationWarning}>
                  <Ionicons name="alert-circle" size={20} color={palette.danger} />
                  <Text style={styles.validationWarningText}>
                    Los pagos que no son en efectivo (tarjeta, transferencia o crédito) no pueden superar el total de la venta.
                  </Text>
                </View>
              )}

              {paymentCalculations.internalCreditExceedsBalance && (
                <View style={styles.validationWarning}>
                  <Ionicons name="alert-circle" size={20} color={palette.danger} />
                  <Text style={styles.validationWarningText}>
                    El monto de Pago a Crédito supera el saldo disponible del cliente ({formatCurrency(selectedCustomer?.availableCredit ?? 0)}).
                  </Text>
                </View>
              )}

              {/* Botón finalizar - fuera de las columnas */}
              <View style={styles.paymentFooter}>
                <TouchableOpacity
                  style={[
                    styles.finalizeButton,
                    !paymentCalculations.canFinalize && styles.finalizeButtonDisabled,
                  ]}
                  onPress={handleFinalizeSale}
                  disabled={!paymentCalculations.canFinalize || isProcessingPayment}
                  activeOpacity={0.85}
                >
                  {isProcessingPayment ? (
                    <ActivityIndicator color={palette.primaryText} />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={20} color={palette.primaryText} />
                      <Text style={styles.finalizeButtonText}>Finalizar venta</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </View>

      {/* Modal de opciones de pago */}
      <Modal
        transparent
        visible={showPaymentOptions}
        animationType="fade"
        onRequestClose={() => setShowPaymentOptions(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowPaymentOptions(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Agregar método de pago</Text>
            <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
              {PAYMENT_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.type}
                  style={styles.optionItem}
                  onPress={() => handleAddPaymentCard(option.type)}
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
              onPress={() => setShowPaymentOptions(false)}
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
  root: {
    flex: 1,
    backgroundColor: palette.background,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  columns: {
    flex: 1,
    flexDirection: 'row',
  },
  column: {
    flex: 1,
    minWidth: 0,
  },
  leftColumn: {
    marginRight: 12,
  },
  rightColumn: {
    flex: 1,
    marginLeft: 12,
  },
  card: {
    borderRadius: 16,
    backgroundColor: palette.surface,
    padding: 20,
    marginBottom: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: palette.textSecondary,
  },
  cardSubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: palette.textMuted,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardHeaderText: {
    flex: 1,
    paddingRight: 12,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  summaryTotalValueLarge: {
    fontSize: 32,
    color: palette.primary,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  cardIconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCart: {
    marginTop: 16,
    color: palette.textMuted,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  summaryDivider: {
    marginTop: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
    marginBottom: 12,
  },
  summaryRowFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  summaryLabel: {
    fontSize: 14,
    color: palette.textMuted,
  },
  summaryValue: {
    fontSize: 14,
    color: palette.textSecondary,
    fontWeight: '600',
  },
  summaryTotalLabel: {
    fontSize: 16,
    color: palette.textSecondary,
    fontWeight: '600',
  },
  summaryTotalValue: {
    fontSize: 18,
    color: palette.primary,
    fontWeight: '700',
  },
  itemsList: {
    marginTop: 16,
    maxHeight: 220,
  },
  itemsListContent: {
    paddingBottom: 4,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  itemDetails: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 14,
    color: palette.textSecondary,
    fontWeight: '500',
  },
  itemMeta: {
    fontSize: 12,
    color: palette.textMuted,
    marginTop: 2,
  },
  itemLineTotal: {
    color: palette.textSecondary,
    fontWeight: '600',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  searchInput: {
    flex: 1,
    backgroundColor: palette.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    color: palette.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginRight: 10,
  },
  searchButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonDisabled: {
    opacity: 0.6,
  },
  selectedCustomerCard: {
    marginTop: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.primary,
    backgroundColor: palette.surfaceMuted,
    padding: 16,
  },
  selectedCustomerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedCustomerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  selectedCustomerName: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.textSecondary,
  },
  selectedCustomerMeta: {
    marginTop: 2,
    fontSize: 12,
    color: palette.textMuted,
  },
  selectedCustomerFooter: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedCustomerCredit: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.textSecondary,
  },
  clearCustomerButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  clearCustomerLabel: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '600',
    color: palette.danger,
  },
  searchResultsContainer: {
    marginTop: 16,
    borderRadius: 0,
    borderWidth: 0,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
    padding: 0,
  },
  searchMessage: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchMessageText: {
    fontSize: 13,
    color: palette.textMuted,
    marginLeft: 8,
  },
  searchMessageError: {
    color: palette.danger,
  },
  customerResultsList: {
    maxHeight: 240,
  },
  customerResultsContent: {
    paddingVertical: 8,
  },
  customerResultCard: {
    marginHorizontal: 0,
    marginBottom: 10,
    borderRadius: 0,
    borderWidth: 0,
    borderColor: 'transparent',
    backgroundColor: palette.surface,
    padding: 0,
    width: '100%',
    alignSelf: 'stretch',
  },
  customerResultCardSelected: {
    borderColor: palette.primary,
    backgroundColor: palette.surfaceMuted,
  },
  customerResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerResultInfo: {
    flex: 1,
    marginHorizontal: 10,
  },
  customerResultName: {
    fontSize: 15,
    fontWeight: '600',
    color: palette.textSecondary,
  },
  customerResultMeta: {
    marginTop: 2,
    fontSize: 12,
    color: palette.textMuted,
  },
  customerResultBody: {
    marginTop: 10,
  },
  customerResultDetail: {
    fontSize: 12,
    color: palette.textSecondary,
    marginTop: 2,
  },
  customerResultFooter: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerResultCredit: {
    fontSize: 12,
    color: '#666',
  },
  customerResultTerm: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 15,
  },
  createCustomerModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: 16,
  },
  createCustomerModalContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createCustomerModalCard: {
    width: '100%',
    maxWidth: 560,
    height: 'auto',
    
    // Remove fixed maxHeight to allow content to grow
    // maxHeight: 640,
    borderRadius: 20,
    backgroundColor: palette.surface,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    alignSelf: 'center',
  },
  createCustomerModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: palette.textSecondary,
  },
  createCustomerModalSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: palette.textMuted,
  },
  createCustomerErrorBox: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: palette.surfaceMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.danger,
    flexDirection: 'row',
    alignItems: 'center',
  },
  createCustomerErrorText: {
    marginLeft: 8,
    fontSize: 13,
    color: palette.danger,
    flex: 1,
  },
  createCustomerForm: {
    marginTop: 16,
    maxHeight: 420,
  },
  createCustomerFormContent: {
    paddingBottom: 8,
  },
  createCustomerField: {
    marginBottom: 16,
  },
  createCustomerLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.textSecondary,
    marginBottom: 6,
  },
  createCustomerInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    color: palette.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  createCustomerAddressInput: {
    minHeight: 96,
  },
  createCustomerDocTypes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  createCustomerDocTypeChip: {
    marginRight: 8,
    marginTop: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  createCustomerPersonTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  createCustomerPersonTypeChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  createCustomerPersonTypeChipSelected: {
    borderColor: palette.primary,
    backgroundColor: palette.surfaceMuted,
  },
  createCustomerPersonTypeLabel: {
    fontSize: 13,
    color: palette.textMuted,
    fontWeight: '500',
  },
  createCustomerPersonTypeLabelSelected: {
    color: palette.primary,
    fontWeight: '600',
  },
  createCustomerDocTypeChipSelected: {
    borderColor: palette.primary,
    backgroundColor: palette.surfaceMuted,
  },
  createCustomerDocTypeLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: palette.textSecondary,
  },
  createCustomerDocTypeLabelSelected: {
    color: palette.primary,
  },
  createCustomerActions: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  createCustomerSecondaryAction: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  createCustomerSecondaryActionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.textMuted,
  },
  createCustomerPrimaryAction: {
    marginLeft: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: palette.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createCustomerPrimaryActionDisabled: {
    opacity: 0.7,
  },
  createCustomerPrimaryActionLabel: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '700',
    color: palette.primaryText,
  },
  // Payment styles
  paymentLayout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  paymentLeftColumn: {
    flex: 1,
    marginRight: 4,
  },
  paymentCenterColumn: {
    flex: 4,
    marginLeft: 4,
  },
  paymentScrollContainer: {
    flex: 1,
  },
  paymentScrollContent: {
    paddingBottom: 20,
  },
  paymentCardsContainer: {
    gap: 12,
  },
  paymentFooter: {
    marginTop: 20,
  },
  emptyPayments: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyPaymentsText: {
    marginTop: 12,
    fontSize: 16,
    color: palette.textMuted,
    textAlign: 'center',
  },
  finalizeButton: {
    backgroundColor: palette.success || '#28a745',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: palette.success || '#28a745',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  finalizeButtonDisabled: {
    backgroundColor: palette.textMuted,
    shadowOpacity: 0,
    elevation: 0,
  },
  finalizeButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '700',
    color: palette.primaryText,
  },
  validationWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#FEB2B2',
  },
  validationWarningText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#C53030',
    flex: 1,
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

export default PaymentScreen;
