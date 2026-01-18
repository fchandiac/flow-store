import { Ionicons } from '@expo/vector-icons';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
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
  type ViewStyle,
} from 'react-native';
import {
  checkoutSale,
  registerCashDeposit,
  registerCashWithdrawal,
  searchProducts,
  type ProductSearchResultPage,
} from '../services/apiService';
import { RootStackParamList } from '../navigation/types';
import {
  selectCartItems,
  selectCartTotals,
  usePosStore,
  type CartItem,
} from '../store/usePosStore';
import { formatCurrency } from '../utils/formatCurrency';
import { palette } from '../theme/palette';

export type PosScreenProps = NativeStackScreenProps<RootStackParamList, 'Pos'>;

function PosScreen({ navigation }: PosScreenProps) {
  const user = usePosStore((state) => state.user);
  const pointOfSale = usePosStore((state) => state.pointOfSale);
  const session = usePosStore((state) => state.cashSession);
  const addProductToCart = usePosStore((state) => state.addProductToCart);
  const incrementItem = usePosStore((state) => state.incrementItem);
  const decrementItem = usePosStore((state) => state.decrementItem);
  const removeItem = usePosStore((state) => state.removeItem);
  const clearCart = usePosStore((state) => state.clearCart);
  const setUser = usePosStore((state) => state.setUser);
  const updateCashSessionExpectedAmount = usePosStore((state) => state.updateCashSessionExpectedAmount);

  const cartItems = usePosStore(selectCartItems);
  const cartTotals = usePosStore(selectCartTotals);

  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<ProductSearchResultPage | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isCashMenuVisible, setIsCashMenuVisible] = useState(false);
  const [cashMovementType, setCashMovementType] = useState<'INCOME' | 'OUTCOME' | null>(null);
  const [isCashMovementModalVisible, setIsCashMovementModalVisible] = useState(false);
  const [cashMovementAmount, setCashMovementAmount] = useState('');
  const [cashMovementReason, setCashMovementReason] = useState('');
  const [cashMovementError, setCashMovementError] = useState<string | null>(null);
  const [isSubmittingCashMovement, setIsSubmittingCashMovement] = useState(false);

  useEffect(() => {
    if (!user) {
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      return;
    }
    if (!session || !pointOfSale) {
      navigation.reset({ index: 0, routes: [{ name: 'SessionSetup' }] });
    }
  }, [navigation, pointOfSale, session, user]);

  const handleSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed) {
      Alert.alert('Consulta requerida', 'Ingresa texto para buscar productos.');
      return;
    }
    setIsSearching(true);
    try {
      const response = await searchProducts({ query: trimmed, page: 1, pageSize: 25 });
      setResults(response);
      if (!response.products.length) {
        Alert.alert('Sin resultados', 'No se encontraron productos que coincidan.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo realizar la búsqueda.';
      Alert.alert('Error de búsqueda', message);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddProduct = (product: ProductSearchResultPage['products'][number]) => {
    addProductToCart(product);
  };

  const handleCheckout = async () => {
    if (!user || !pointOfSale || !session) {
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      return;
    }
    if (!cartItems.length) {
      Alert.alert('Carrito vacío', 'Agrega productos antes de finalizar la venta.');
      return;
    }
    setIsCheckingOut(true);
    try {
      const response = await checkoutSale({
        cartItems,
        userName: user.userName,
        pointOfSaleId: pointOfSale.id,
        cashSessionId: session.id,
      });
      clearCart();
      Alert.alert(
        'Venta registrada',
        `Documento ${response.transaction.documentNumber} por ${formatCurrency(response.transaction.total)}.`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo finalizar la venta.';
      Alert.alert('Error en la venta', message);
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleLogout = () => {
    clearCart();
    setUser(null);
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const parseMovementAmount = (value: string): number | null => {
    if (!value) {
      return null;
    }
    const sanitized = value.replace(/[^0-9.,-]/g, '').replace(',', '.');
    const parsed = Number(sanitized);
    if (!Number.isFinite(parsed)) {
      return null;
    }
    return Number(parsed.toFixed(2));
  };

  const resetCashMovementState = () => {
    setCashMovementAmount('');
    setCashMovementReason('');
    setCashMovementError(null);
  };

  const closeCashMovementModal = (force = false) => {
    if (isSubmittingCashMovement && !force) {
      return;
    }
    setIsCashMovementModalVisible(false);
    setCashMovementType(null);
    resetCashMovementState();
  };

  const handleCashMovement = (action: 'INCOME' | 'OUTCOME' | 'CLOSE') => {
    setIsCashMenuVisible(false);

    if (action === 'INCOME' || action === 'OUTCOME') {
      if (!user || !pointOfSale || !session) {
        Alert.alert('Sesión requerida', 'Debes iniciar sesión y abrir caja antes de registrar movimientos.');
        return;
      }
      setCashMovementType(action);
      resetCashMovementState();
      setIsCashMovementModalVisible(true);
      return;
    }

    Alert.alert('Cierre de caja', 'Esta acción aún no está disponible.');
  };

  const handleSubmitCashMovement = async () => {
    if (!cashMovementType || !user || !pointOfSale || !session) {
      setCashMovementError('No se pudo determinar la sesión de caja activa.');
      return;
    }

    const parsedAmount = parseMovementAmount(cashMovementAmount);
    if (parsedAmount === null || parsedAmount <= 0) {
      setCashMovementError('Debes ingresar un monto válido mayor a 0.');
      return;
    }

    setCashMovementError(null);
    setIsSubmittingCashMovement(true);

    try {
      const payload =
        cashMovementType === 'INCOME'
          ? await registerCashDeposit({
              userName: user.userName,
              pointOfSaleId: pointOfSale.id,
              cashSessionId: session.id,
              amount: parsedAmount,
              reason: cashMovementReason.trim() || undefined,
            })
          : await registerCashWithdrawal({
              userName: user.userName,
              pointOfSaleId: pointOfSale.id,
              cashSessionId: session.id,
              amount: parsedAmount,
              reason: cashMovementReason.trim() || undefined,
            });

      updateCashSessionExpectedAmount(payload.expectedAmount);

      const successTitle = cashMovementType === 'INCOME' ? 'Ingreso registrado' : 'Egreso registrado';
      const formattedAmount = formatCurrency(payload.transaction.total ?? parsedAmount);
      Alert.alert(successTitle, `Documento ${payload.transaction.documentNumber} por ${formattedAmount}.`);

      setIsSubmittingCashMovement(false);
      closeCashMovementModal(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo registrar el movimiento.';
      setCashMovementError(message);
      setIsSubmittingCashMovement(false);
    }
  };

  const currentExpectedAmount = session
    ? Number((session.expectedAmount ?? session.openingAmount ?? 0).toFixed(2))
    : 0;

  const previewAmount = cashMovementType ? parseMovementAmount(cashMovementAmount) : null;

  const projectedExpectedAmount =
    session && previewAmount !== null && previewAmount > 0 && cashMovementType
      ? Number(
          (
            currentExpectedAmount +
            (cashMovementType === 'INCOME' ? previewAmount : -previewAmount)
          ).toFixed(2),
        )
      : null;

  const cashMovementTitle =
    cashMovementType === 'OUTCOME'
      ? 'Registrar egreso de dinero'
      : cashMovementType === 'INCOME'
        ? 'Registrar ingreso de dinero'
        : 'Movimiento de caja';

  const submitButtonStyles: ViewStyle[] = [styles.primaryButton, styles.cashMovementSubmitButton];
  if (cashMovementType === 'OUTCOME') {
    submitButtonStyles.push(styles.cashMovementWithdrawButton);
  } else {
    submitButtonStyles.push(styles.cashMovementDepositButton);
  }
  if (isSubmittingCashMovement) {
    submitButtonStyles.push(styles.cashMovementSubmitButtonDisabled);
  }

  const cancelButtonStyles: ViewStyle[] = [styles.secondaryButton];
  if (isSubmittingCashMovement) {
    cancelButtonStyles.push(styles.secondaryButtonDisabled);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
      style={styles.root}
    >
      <Modal
        transparent
        visible={isCashMenuVisible}
        animationType="fade"
        onRequestClose={() => setIsCashMenuVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setIsCashMenuVisible(false)}>
          <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.modalTitle}>Movimientos de caja</Text>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.modalOption}
              onPress={() => handleCashMovement('INCOME')}
            >
              <Text style={styles.modalOptionLabel}>Ingreso de dinero</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.modalOption}
              onPress={() => handleCashMovement('OUTCOME')}
            >
              <Text style={styles.modalOptionLabel}>Egreso de dinero</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.modalOption}
              onPress={() => handleCashMovement('CLOSE')}
            >
              <Text style={styles.modalOptionLabel}>Cierre de caja</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.modalOption, styles.modalCancel]}
              onPress={() => setIsCashMenuVisible(false)}
            >
              <Text style={styles.modalCancelLabel}>Cancelar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal
        transparent
        visible={isCashMovementModalVisible}
        animationType="slide"
        onRequestClose={() => closeCashMovementModal()}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => closeCashMovementModal()}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
            style={styles.cashMovementContainer}
          >
            <Pressable
              style={styles.cashMovementCard}
              onPress={(event) => event.stopPropagation()}
            >
              <Text style={styles.cashMovementTitle}>{cashMovementTitle}</Text>
              <Text style={styles.cashMovementSubtitle}>
                Ingresa el monto del movimiento y agrega un motivo opcional para dejar registro.
              </Text>

              {session ? (
                <View style={styles.cashMovementInfoBlock}>
                  <Text style={styles.cashMovementInfoLabel}>Saldo esperado actual</Text>
                  <Text style={styles.cashMovementInfoValue}>{formatCurrency(currentExpectedAmount)}</Text>
                  {projectedExpectedAmount !== null ? (
                    <Text style={styles.cashMovementInfoHint}>
                      Saldo proyectado después de este movimiento: {formatCurrency(projectedExpectedAmount)}
                    </Text>
                  ) : null}
                </View>
              ) : (
                <Text style={styles.cashMovementWarning}>
                  No hay una sesión de caja activa. Inicia sesión y configura la caja antes de registrar movimientos.
                </Text>
              )}

              <View style={styles.cashMovementField}>
                <Text style={styles.cashMovementLabel}>Monto</Text>
                <TextInput
                  value={cashMovementAmount}
                  onChangeText={(value) => {
                    setCashMovementAmount(value);
                    if (cashMovementError) {
                      setCashMovementError(null);
                    }
                  }}
                  style={styles.cashMovementInput}
                  placeholder="0"
                  placeholderTextColor={palette.textMuted}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  onSubmitEditing={handleSubmitCashMovement}
                  editable={!isSubmittingCashMovement}
                  autoFocus
                />
              </View>

              <View style={styles.cashMovementField}>
                <Text style={styles.cashMovementLabel}>Motivo (opcional)</Text>
                <TextInput
                  value={cashMovementReason}
                  onChangeText={(value) => {
                    setCashMovementReason(value);
                    if (cashMovementError) {
                      setCashMovementError(null);
                    }
                  }}
                  style={[styles.cashMovementInput, styles.cashMovementTextArea]}
                  placeholder="Ej: retiro para pagos menores"
                  placeholderTextColor={palette.textMuted}
                  multiline
                  numberOfLines={3}
                  editable={!isSubmittingCashMovement}
                />
              </View>

              {cashMovementError ? (
                <Text style={styles.cashMovementError}>{cashMovementError}</Text>
              ) : null}

              <View style={styles.cashMovementActions}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={cancelButtonStyles}
                  onPress={() => closeCashMovementModal()}
                  disabled={isSubmittingCashMovement}
                >
                  <Text style={styles.secondaryButtonLabel}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={submitButtonStyles}
                  onPress={handleSubmitCashMovement}
                  disabled={isSubmittingCashMovement}
                >
                  {isSubmittingCashMovement ? (
                    <ActivityIndicator color={palette.primaryText} />
                  ) : (
                    <Text
                      style={[
                        styles.cashMovementSubmitLabel,
                        cashMovementType === 'OUTCOME' ? styles.cashMovementSubmitLabelLight : null,
                      ]}
                    >
                      {cashMovementType === 'OUTCOME' ? 'Registrar egreso' : 'Registrar ingreso'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{pointOfSale?.name ?? 'Punto de venta'}</Text>
          <Text style={styles.headerSubtitle}>
            {user ? `Usuario ${user.userName}` : 'Sesion no autenticada'}
          </Text>
          {session ? <Text style={styles.headerSubtitle}>Sesión {session.id}</Text> : null}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.headerIconButton, styles.headerIconButtonFirst, styles.headerIconButtonPrimary]}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Abrir movimientos de caja"
            onPress={() => setIsCashMenuVisible(true)}
          >
            <Ionicons name="cash-outline" size={22} color={palette.primaryText} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconButton}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Abrir configuración"
            onPress={() => navigation.navigate('Settings')}
          >
            <Ionicons name="settings-outline" size={22} color={palette.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerIconButton, styles.headerIconButtonDanger]}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Cerrar sesión"
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={22} color={palette.primaryText} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.columns}>
        <ScrollView
          style={[styles.column, styles.leftColumn]}
          contentContainerStyle={styles.columnContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Buscar productos</Text>
            <View style={styles.searchRow}>
              <TextInput
                autoCapitalize="characters"
                autoCorrect={false}
                onChangeText={setQuery}
                placeholder="Nombre, SKU o código escaneado"
                placeholderTextColor={palette.textMuted}
                style={styles.searchInput}
                value={query}
              />
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleSearch}
                style={[styles.primaryButton, styles.searchButton]}
                disabled={isSearching}
              >
                {isSearching ? (
                  <ActivityIndicator color={palette.primaryText} />
                ) : (
                  <Text style={styles.primaryButtonLabel}>Buscar</Text>
                )}
              </TouchableOpacity>
            </View>
            {results ? (
              <View style={styles.results}>
                {results.products.map((product) => (
                  <TouchableOpacity
                    key={product.variantId}
                    activeOpacity={0.85}
                    onPress={() => handleAddProduct(product)}
                    style={styles.resultItem}
                  >
                    <View style={styles.resultInfo}>
                      <Text style={styles.resultName}>{product.productName}</Text>
                      <Text style={styles.resultMeta}>
                        SKU {product.sku}
                        {product.barcode ? ` • Código ${product.barcode}` : ''}
                      </Text>
                    </View>
                    <View style={styles.resultPriceBlock}>
                      <Text style={styles.resultPrice}>{formatCurrency(product.unitPriceWithTax)}</Text>
                      <Text style={styles.resultHint}>{`+IVA ${product.unitTaxRate.toFixed(2)}%`}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </View>
        </ScrollView>

        <ScrollView
          style={[styles.column, styles.rightColumn]}
          contentContainerStyle={styles.columnContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Carrito</Text>
            {cartItems.length ? (
              cartItems.map((item: CartItem) => (
                <View key={item.variantId} style={styles.cartItem}>
                  <View style={styles.cartItemInfo}>
                    <Text style={styles.cartItemName}>{item.name}</Text>
                    <Text style={styles.cartItemMeta}>
                      SKU {item.sku}
                      {item.unitSymbol ? ` • ${item.unitSymbol}` : ''}
                    </Text>
                  </View>
                  <View style={styles.cartActions}>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => decrementItem(item.variantId)}
                      style={[styles.counterButton, styles.counterButtonLeft]}
                    >
                      <Text style={styles.counterLabel}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.counterValue}>{item.qty}</Text>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => incrementItem(item.variantId)}
                      style={[styles.counterButton, styles.counterButtonRight]}
                    >
                      <Text style={styles.counterLabel}>+</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => removeItem(item.variantId)}
                      style={styles.removeButton}
                    >
                      <Text style={styles.removeLabel}>Eliminar</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.cartItemTotals}>
                    <Text style={styles.cartItemPrice}>{formatCurrency(item.total)}</Text>
                    <Text style={styles.cartItemHint}>
                      {`Subtotal ${formatCurrency(item.subtotal)} • IVA ${formatCurrency(item.taxAmount)}`}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyCart}>No hay productos en el carrito.</Text>
            )}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{formatCurrency(cartTotals.subtotal)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Impuestos</Text>
              <Text style={styles.totalValue}>{formatCurrency(cartTotals.taxAmount)}</Text>
            </View>
            <View style={styles.totalRowFinal}>
              <Text style={styles.totalFinalLabel}>Total</Text>
              <Text style={styles.totalFinalValue}>{formatCurrency(cartTotals.total)}</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={isCheckingOut || !cartItems.length}
              onPress={handleCheckout}
              style={[
                styles.primaryButton,
                styles.checkoutButton,
                (isCheckingOut || !cartItems.length) && styles.checkoutButtonDisabled,
              ]}
            >
              {isCheckingOut ? (
                <ActivityIndicator color={palette.primaryText} />
              ) : (
                <Text style={styles.checkoutLabel}>Finalizar venta</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: palette.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginLeft: 12,
  },
  columnContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 22,
    color: palette.textSecondary,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 13,
    color: palette.textMuted,
    marginTop: 4,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  headerIconButtonFirst: {
    marginLeft: 0,
  },
  headerIconButtonPrimary: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  headerIconButtonDanger: {
    backgroundColor: palette.danger,
    borderColor: palette.danger,
  },
  card: {
    borderRadius: 16,
    backgroundColor: palette.surface,
    padding: 18,
    marginBottom: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  sectionTitle: {
    fontSize: 18,
    color: palette.textSecondary,
    fontWeight: '600',
    marginBottom: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginRight: 12,
  },
  primaryButton: {
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primary,
  },
  searchButton: {
    minWidth: 120,
  },
  primaryButtonLabel: {
    color: palette.primaryText,
    fontWeight: '600',
  },
  results: {
    marginTop: 16,
  },
  resultItem: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    padding: 14,
    marginBottom: 12,
    backgroundColor: palette.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultInfo: {
    flex: 1,
    marginRight: 12,
  },
  resultName: {
    fontSize: 16,
    color: palette.textSecondary,
    fontWeight: '600',
  },
  resultMeta: {
    fontSize: 12,
    color: palette.textMuted,
    marginTop: 4,
  },
  resultPriceBlock: {
    alignItems: 'flex-end',
  },
  resultPrice: {
    fontSize: 16,
    color: palette.primary,
    fontWeight: '700',
  },
  resultHint: {
    fontSize: 12,
    color: palette.textMuted,
  },
  cartItem: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    padding: 14,
    marginBottom: 12,
    backgroundColor: palette.surface,
  },
  cartItemInfo: {
    marginBottom: 10,
  },
  cartItemName: {
    fontSize: 16,
    color: palette.textSecondary,
    fontWeight: '600',
  },
  cartItemMeta: {
    fontSize: 12,
    color: palette.textMuted,
    marginTop: 4,
  },
  cartActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  counterButton: {
    width: 40,
    height: 36,
    borderRadius: 10,
    backgroundColor: palette.surfaceMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterButtonLeft: {
    marginRight: 8,
  },
  counterButtonRight: {
    marginLeft: 8,
  },
  counterLabel: {
    color: palette.textSecondary,
    fontSize: 20,
    fontWeight: '600',
  },
  counterValue: {
    fontSize: 16,
    color: palette.textSecondary,
    fontWeight: '600',
  },
  removeButton: {
    marginLeft: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: palette.danger,
  },
  removeLabel: {
    color: palette.primaryText,
    fontWeight: '600',
  },
  cartItemTotals: {
    alignItems: 'flex-start',
  },
  cartItemPrice: {
    fontSize: 16,
    color: palette.textSecondary,
    fontWeight: '600',
  },
  cartItemHint: {
    fontSize: 12,
    color: palette.textMuted,
    marginTop: 4,
  },
  emptyCart: {
    color: palette.textMuted,
    marginBottom: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  totalRowFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
    paddingTop: 12,
  },
  totalLabel: {
    color: palette.textMuted,
    fontSize: 14,
  },
  totalValue: {
    color: palette.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  totalFinalLabel: {
    color: palette.textSecondary,
    fontSize: 16,
    fontWeight: '700',
  },
  totalFinalValue: {
    color: palette.primary,
    fontSize: 18,
    fontWeight: '700',
  },
  checkoutButton: {
    marginTop: 20,
    paddingVertical: 16,
    backgroundColor: palette.primary,
    borderRadius: 12,
  },
  checkoutButtonDisabled: {
    backgroundColor: palette.primaryStrong,
  },
  checkoutLabel: {
    color: palette.primaryText,
    fontSize: 16,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: palette.backdrop,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    padding: 24,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  modalTitle: {
    fontSize: 18,
    color: palette.textSecondary,
    fontWeight: '600',
    marginBottom: 20,
  },
  modalOption: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: palette.surfaceMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    marginBottom: 12,
  },
  modalOptionLabel: {
    color: palette.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },
  modalCancel: {
    backgroundColor: palette.danger,
    marginTop: 4,
  },
  modalCancelLabel: {
    textAlign: 'center',
    color: palette.primaryText,
    fontSize: 16,
    fontWeight: '600',
  },
  cashMovementContainer: {
    width: '100%',
    alignItems: 'center',
  },
  cashMovementCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 18,
    padding: 24,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  cashMovementTitle: {
    fontSize: 20,
    color: palette.textSecondary,
    fontWeight: '700',
    marginBottom: 8,
  },
  cashMovementSubtitle: {
    fontSize: 13,
    color: palette.textMuted,
    marginBottom: 16,
    lineHeight: 18,
  },
  cashMovementInfoBlock: {
    marginBottom: 20,
  },
  cashMovementInfoLabel: {
    color: palette.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  cashMovementInfoValue: {
    color: palette.primary,
    fontSize: 20,
    fontWeight: '700',
  },
  cashMovementInfoHint: {
    color: palette.textMuted,
    fontSize: 12,
    marginTop: 6,
  },
  cashMovementWarning: {
    color: palette.warningText,
    fontSize: 13,
    marginBottom: 20,
  },
  cashMovementField: {
    marginBottom: 16,
  },
  cashMovementLabel: {
    color: palette.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  cashMovementInput: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    color: palette.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  cashMovementTextArea: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  cashMovementError: {
    color: palette.error,
    fontSize: 13,
    marginBottom: 12,
  },
  cashMovementActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryButton: {
    flex: 1,
    marginRight: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    alignItems: 'center',
  },
  secondaryButtonDisabled: {
    opacity: 0.6,
  },
  secondaryButtonLabel: {
    color: palette.textSecondary,
    fontWeight: '600',
    fontSize: 15,
  },
  cashMovementSubmitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
  },
  cashMovementDepositButton: {
    backgroundColor: palette.primary,
  },
  cashMovementWithdrawButton: {
    backgroundColor: palette.danger,
  },
  cashMovementSubmitButtonDisabled: {
    opacity: 0.7,
  },
  cashMovementSubmitLabel: {
    color: palette.primaryText,
    fontSize: 15,
    fontWeight: '700',
  },
  cashMovementSubmitLabelLight: {
    color: palette.primaryText,
  },
});

export default PosScreen;
