import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
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
import { searchProducts, type ProductSearchResultPage } from '../services/apiService';
import { RootStackParamList } from '../navigation/types';
import { selectCartItems, selectCartTotals, usePosStore, type CartItem } from '../store/usePosStore';
import { formatCurrency } from '../utils/formatCurrency';
import { palette } from '../theme/palette';

export type PosScreenProps = NativeStackScreenProps<RootStackParamList, 'Pos'>;

const LOGO_WIDTH_RATIO = 0.05;
const LOGO_MIN_SIZE = 48;

const formatStockValue = (value: number | null) => {
  if (value === null || Number.isNaN(value)) {
    return '0';
  }
  if (Number.isInteger(value)) {
    return value.toLocaleString('es-PE');
  }
  return value.toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

function PosScreen({ navigation }: PosScreenProps) {
  const isFocused = useIsFocused();
  const loginRedirectRef = useRef(false);
  const setupRedirectRef = useRef(false);
  const searchInputRef = useRef<TextInput | null>(null);

  const user = usePosStore((state) => state.user);
  const pointOfSale = usePosStore((state) => state.pointOfSale);
  const session = usePosStore((state) => state.cashSession);
  const addProductToCart = usePosStore((state) => state.addProductToCart);
  const incrementItem = usePosStore((state) => state.incrementItem);
  const decrementItem = usePosStore((state) => state.decrementItem);
  const removeItem = usePosStore((state) => state.removeItem);
  const clearCart = usePosStore((state) => state.clearCart);
  const setUser = usePosStore((state) => state.setUser);

  const cartItems = usePosStore(selectCartItems);
  const cartTotals = usePosStore(selectCartTotals);

  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<ProductSearchResultPage | null>(null);
  const [isCashMenuVisible, setIsCashMenuVisible] = useState(false);

  const logoSize = Math.max(
    LOGO_MIN_SIZE,
    Math.round(Dimensions.get('window').width * LOGO_WIDTH_RATIO),
  );

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    if (!user) {
      if (!loginRedirectRef.current) {
        loginRedirectRef.current = true;
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      }
      return;
    }

    loginRedirectRef.current = false;

    if (!pointOfSale || !session || session.status !== 'OPEN') {
      if (!setupRedirectRef.current) {
        setupRedirectRef.current = true;
        navigation.reset({ index: 0, routes: [{ name: 'SessionSetup' }] });
      }
      return;
    }

    setupRedirectRef.current = false;
  }, [isFocused, navigation, pointOfSale, session, user]);

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

  const handleClearSearch = () => {
    setQuery('');
    setResults(null);
    searchInputRef.current?.focus();
  };

  const handleProceedToPayment = () => {
    if (!user || !pointOfSale || !session) {
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      return;
    }

    if (!cartItems.length) {
      Alert.alert('Carrito vacío', 'Agrega productos antes de finalizar la venta.');
      return;
    }

    navigation.navigate('Payment');
  };

  const handleLogout = () => {
    clearCart();
    setUser(null);
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const handleCashMovement = (action: 'INCOME' | 'OUTCOME' | 'CLOSE') => {
    setIsCashMenuVisible(false);

    if (!user || !pointOfSale || !session) {
      Alert.alert('Sesión requerida', 'Debes iniciar sesión y abrir caja antes de registrar movimientos.');
      return;
    }

    if (action === 'CLOSE') {
      navigation.navigate('CashClosing');
      return;
    }

    if (action === 'INCOME') {
      navigation.navigate('CashIncome');
      return;
    }

    navigation.navigate('CashOutcome');
  };

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
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Image
            source={require('../assets/icon.png')}
            style={[styles.headerLogo, { width: logoSize, height: logoSize }]}
            accessibilityRole="image"
            accessibilityLabel="Logo de FlowStore"
          />
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
              {pointOfSale?.name ?? 'Punto de venta'}
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1} ellipsizeMode="tail">
              {user?.personName ?? 'Persona no asignada'}
            </Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.headerIconButton, styles.headerIconButtonFirst]}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Abrir movimientos de caja"
            onPress={() => setIsCashMenuVisible(true)}
          >
            <Ionicons name="cash-outline" size={22} color="#000000" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconButton}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Cerrar sesión"
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={22} color="#000000" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.columns}>
        <View style={[styles.column, styles.leftColumn]}>
          <View style={[styles.card, styles.searchCard]}>
            <Text style={styles.sectionTitle}>Buscar productos</Text>
            <View style={styles.searchRow}>
              <TextInput
                ref={searchInputRef}
                autoCapitalize="characters"
                autoCorrect={false}
                onChangeText={setQuery}
                placeholder="Nombre, SKU o código escaneado"
                placeholderTextColor={palette.textMuted}
                style={styles.searchInput}
                value={query}
                returnKeyType="search"
                blurOnSubmit={false}
                onSubmitEditing={() => {
                  void handleSearch();
                }}
              />
              <View style={styles.searchActions}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleSearch}
                  disabled={isSearching}
                  accessibilityRole="button"
                  accessibilityLabel="Buscar productos"
                  style={[styles.iconButton, isSearching && styles.iconButtonDisabled]}
                >
                  {isSearching ? (
                    <ActivityIndicator color={palette.primaryText} size="small" />
                  ) : (
                    <Ionicons name="search-outline" size={22} color={palette.primaryText} />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleClearSearch}
                  disabled={!query || query.trim().length === 0}
                  accessibilityRole="button"
                  accessibilityLabel="Limpiar búsqueda"
                  style={[
                    styles.iconButton,
                    styles.iconButtonSecondary,
                    styles.iconButtonSpacer,
                    (!query || query.trim().length === 0) && styles.iconButtonDisabled,
                  ]}
                >
                  <Ionicons name="close-outline" size={22} color={palette.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>
            {results ? (
              <View style={styles.resultsContainer}>
                <ScrollView
                  style={styles.resultsList}
                  contentContainerStyle={styles.resultsContent}
                  showsVerticalScrollIndicator={false}
                >
                  {results.products.map((product) => {
                    const hasInventoryControl = product.trackInventory;
                    const rawStock = hasInventoryControl ? product.availableStock ?? 0 : null;
                    const isOutOfStock = hasInventoryControl && (rawStock ?? 0) <= 0;
                    const stockLabel = hasInventoryControl
                      ? `Stock ${formatStockValue(rawStock)}${product.unitSymbol ? ` ${product.unitSymbol}` : ''}`
                      : 'Inventario sin control';

                    return (
                      <TouchableOpacity
                        key={product.variantId}
                        activeOpacity={0.85}
                        onPress={() => handleAddProduct(product)}
                        style={styles.resultItem}
                      >
                        <View style={styles.resultInfo}>
                          <Text style={styles.resultName} numberOfLines={2}>
                            {product.productName}
                          </Text>
                          <Text style={styles.resultMeta} numberOfLines={1}>
                            SKU {product.sku}
                            {product.barcode ? ` • Código ${product.barcode}` : ''}
                          </Text>
                        </View>
                        <View style={styles.resultAttributes}>
                          {product.attributes.length ? (
                            product.attributes.map((attribute) => (
                              <View key={`${product.variantId}-${attribute.id}`} style={styles.attributeBadge}>
                                <Text style={styles.attributeBadgeText} numberOfLines={1}>
                                  {attribute.name ? `${attribute.name}: ` : ''}
                                  {attribute.value}
                                </Text>
                              </View>
                            ))
                          ) : (
                            <Text style={styles.attributePlaceholder}>Sin atributos</Text>
                          )}
                        </View>
                        <View style={styles.resultPriceBlock}>
                          <Text style={styles.resultPrice}>{formatCurrency(product.unitPriceWithTax)}</Text>
                          <Text
                            style={[styles.resultStock, isOutOfStock && styles.resultStockEmpty]}
                            numberOfLines={1}
                          >
                            {stockLabel}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}
          </View>
        </View>

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
                  <View style={styles.cartItemRow}>
                    <View style={styles.cartItemColumnLeft}>
                      <Text style={styles.cartItemName} numberOfLines={2}>
                        {item.name}
                      </Text>
                      <Text style={styles.cartItemSku}>{`SKU ${item.sku}`}</Text>
                      <Text style={styles.cartItemUnitPrice}>{formatCurrency(item.unitPriceWithTax)}</Text>
                      <Text style={styles.cartItemLineTotal}>{formatCurrency(item.total)}</Text>
                    </View>
                    <View style={styles.cartItemColumnRight}>
                      <View style={styles.cartCounterGroup}>
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
                      </View>
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => removeItem(item.variantId)}
                        style={styles.cartRemoveIcon}
                        accessibilityRole="button"
                        accessibilityLabel={`Eliminar ${item.name}`}
                      >
                        <Ionicons name="trash-outline" size={18} color={palette.danger} />
                      </TouchableOpacity>
                    </View>
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
              disabled={!cartItems.length}
              onPress={handleProceedToPayment}
              style={[
                styles.primaryButton,
                styles.checkoutButton,
                !cartItems.length && styles.checkoutButtonDisabled,
              ]}
            >
              <Text style={styles.checkoutLabel}>Proceder al pago</Text>
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
    paddingTop: 6,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerLogo: {
    resizeMode: 'contain',
  },
  headerInfo: {
    marginLeft: 12,
    flexShrink: 1,
  },
  headerTitle: {
    fontSize: 22,
    color: palette.textSecondary,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 14,
    color: palette.textMuted,
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconButton: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  headerIconButtonFirst: {
    marginLeft: 0,
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
  card: {
    borderRadius: 16,
    backgroundColor: palette.surface,
    padding: 18,
    marginBottom: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  searchCard: {
    flex: 1,
    marginBottom: 0,
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
  searchActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonSecondary: {
    backgroundColor: palette.surfaceMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  iconButtonSpacer: {
    marginLeft: 8,
  },
  iconButtonDisabled: {
    opacity: 0.5,
  },
  primaryButton: {
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primary,
  },
  resultsContainer: {
    marginTop: 16,
    flex: 1,
  },
  resultsList: {
    flex: 1,
  },
  resultsContent: {
    flexGrow: 1,
    paddingBottom: 12,
  },
  resultItem: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginBottom: 12,
    backgroundColor: palette.surface,
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  resultAttributes: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginRight: 12,
    paddingTop: 2,
  },
  attributeBadge: {
    borderRadius: 999,
    backgroundColor: palette.surfaceMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 8,
  },
  attributeBadgeText: {
    fontSize: 12,
    color: palette.textSecondary,
    fontWeight: '500',
  },
  attributePlaceholder: {
    fontSize: 12,
    color: palette.textMuted,
  },
  resultPriceBlock: {
    alignItems: 'flex-end',
    minWidth: 120,
    marginLeft: 12,
  },
  resultPrice: {
    fontSize: 16,
    color: palette.primary,
    fontWeight: '700',
  },
  resultStock: {
    fontSize: 12,
    color: palette.textSecondary,
    marginTop: 6,
    fontWeight: '500',
  },
  resultStockEmpty: {
    color: palette.danger,
  },
  resultHint: {
    fontSize: 12,
    color: palette.textMuted,
    marginTop: 4,
  },
  cartItem: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    padding: 16,
    marginBottom: 12,
    backgroundColor: palette.surface,
  },
  cartItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cartItemColumnLeft: {
    flex: 1,
    marginRight: 12,
  },
  cartItemName: {
    fontSize: 16,
    color: palette.textSecondary,
    fontWeight: '600',
  },
  cartItemSku: {
    fontSize: 12,
    color: palette.textMuted,
    marginTop: 4,
  },
  cartItemUnitPrice: {
    fontSize: 14,
    color: palette.textSecondary,
    fontWeight: '600',
    marginTop: 10,
  },
  cartItemLineTotal: {
    fontSize: 16,
    color: palette.primary,
    fontWeight: '700',
    marginTop: 4,
  },
  cartItemColumnRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    flexShrink: 0,
    paddingLeft: 12,
  },
  cartCounterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
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
    minWidth: 24,
    textAlign: 'center',
  },
  cartRemoveIcon: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: palette.dangerTint,
    marginTop: 12,
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
    borderRadius: 12,
    backgroundColor: palette.primary,
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
});

export default PosScreen;
