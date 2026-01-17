import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { checkoutSale, searchProducts, type ProductSearchResultPage } from '../services/apiService';
import { RootStackParamList } from '../navigation/types';
import {
  selectCartItems,
  selectCartTotals,
  usePosStore,
  type CartItem,
} from '../store/usePosStore';

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

  const cartItems = usePosStore(selectCartItems);
  const cartTotals = usePosStore(selectCartTotals);

  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<ProductSearchResultPage | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

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
        `Documento ${response.transaction.documentNumber} por ${response.transaction.total.toFixed(2)}.`,
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

  return (
    <ScrollView contentContainerStyle={styles.root}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{pointOfSale?.name ?? 'Punto de venta'}</Text>
          <Text style={styles.headerSubtitle}>
            {user ? `Usuario ${user.userName}` : 'Sesion no autenticada'}
          </Text>
          {session ? <Text style={styles.headerSubtitle}>Sesión {session.id}</Text> : null}
        </View>
        <TouchableOpacity style={styles.logoutButton} activeOpacity={0.85} onPress={handleLogout}>
          <Text style={styles.logoutLabel}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Buscar productos</Text>
        <View style={styles.searchRow}>
          <TextInput
            autoCapitalize="characters"
            autoCorrect={false}
            onChangeText={setQuery}
            placeholder="Nombre, SKU o código escaneado"
            placeholderTextColor="#6b7280"
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
              <ActivityIndicator color="#f8fafc" />
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
                  <Text style={styles.resultPrice}>${product.unitPriceWithTax.toFixed(2)}</Text>
                  <Text style={styles.resultHint}>
                    +IVA {product.unitTaxRate.toFixed(2)}%
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </View>

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
                <Text style={styles.cartItemPrice}>${item.total.toFixed(2)}</Text>
                <Text style={styles.cartItemHint}>
                  Subtotal ${item.subtotal.toFixed(2)} • IVA ${item.taxAmount.toFixed(2)}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyCart}>No hay productos en el carrito.</Text>
        )}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>${cartTotals.subtotal.toFixed(2)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Impuestos</Text>
          <Text style={styles.totalValue}>${cartTotals.taxAmount.toFixed(2)}</Text>
        </View>
        <View style={styles.totalRowFinal}>
          <Text style={styles.totalFinalLabel}>Total</Text>
          <Text style={styles.totalFinalValue}>${cartTotals.total.toFixed(2)}</Text>
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
            <ActivityIndicator color="#042f2e" />
          ) : (
            <Text style={styles.checkoutLabel}>Finalizar venta</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#0b1120',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    color: '#f8fafc',
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
  },
  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#ef4444',
  },
  logoutLabel: {
    color: '#fff1f2',
    fontWeight: '600',
    fontSize: 14,
  },
  card: {
    borderRadius: 16,
    backgroundColor: '#111827',
    padding: 18,
    marginBottom: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#1f2937',
  },
  sectionTitle: {
    fontSize: 18,
    color: '#f8fafc',
    fontWeight: '600',
    marginBottom: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#0b1120',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
    color: '#f8fafc',
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
    backgroundColor: '#2563eb',
  },
  searchButton: {
    minWidth: 120,
  },
  primaryButtonLabel: {
    color: '#f8fafc',
    fontWeight: '600',
  },
  results: {
    marginTop: 16,
  },
  resultItem: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#1f2937',
    padding: 14,
    marginBottom: 12,
    backgroundColor: '#0f172a',
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
    color: '#f8fafc',
    fontWeight: '600',
  },
  resultMeta: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  resultPriceBlock: {
    alignItems: 'flex-end',
  },
  resultPrice: {
    fontSize: 16,
    color: '#22c55e',
    fontWeight: '700',
  },
  resultHint: {
    fontSize: 12,
    color: '#94a3b8',
  },
  cartItem: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#1f2937',
    padding: 14,
    marginBottom: 12,
    backgroundColor: '#0f172a',
  },
  cartItemInfo: {
    marginBottom: 10,
  },
  cartItemName: {
    fontSize: 16,
    color: '#f8fafc',
    fontWeight: '600',
  },
  cartItemMeta: {
    fontSize: 12,
    color: '#94a3b8',
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
    backgroundColor: '#1e293b',
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
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '600',
  },
  counterValue: {
    fontSize: 16,
    color: '#f8fafc',
    fontWeight: '600',
  },
  removeButton: {
    marginLeft: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#ef4444',
  },
  removeLabel: {
    color: '#fff1f2',
    fontWeight: '600',
  },
  cartItemTotals: {
    alignItems: 'flex-start',
  },
  cartItemPrice: {
    fontSize: 16,
    color: '#f8fafc',
    fontWeight: '600',
  },
  cartItemHint: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  emptyCart: {
    color: '#94a3b8',
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
    borderTopColor: '#1f2937',
    paddingTop: 12,
  },
  totalLabel: {
    color: '#94a3b8',
    fontSize: 14,
  },
  totalValue: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
  },
  totalFinalLabel: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  totalFinalValue: {
    color: '#22c55e',
    fontSize: 18,
    fontWeight: '700',
  },
  checkoutButton: {
    marginTop: 20,
    paddingVertical: 16,
    backgroundColor: '#22c55e',
  },
  checkoutButtonDisabled: {
    backgroundColor: '#14532d',
  },
  checkoutLabel: {
    color: '#042f2e',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default PosScreen;
