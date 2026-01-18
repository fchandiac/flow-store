import React from 'react';
import { StyleSheet, View, Text, FlatList, Image } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import ExternalDisplay from 'react-native-external-display';

import {
  CartItem,
  selectCartItems,
  selectCartTotal,
  selectItemCount,
  selectPromoMedia,
  selectPromoMediaEnabled,
  usePosStore
} from '../store/usePosStore';
import { formatCurrency } from '../utils/formatCurrency';

type CustomerDisplayProps = {
  externalScreenId?: string;
};

const renderItem = ({ item }: { item: CartItem }) => (
  <View style={styles.row}>
    <Text style={styles.itemName}>{item.name}</Text>
    <Text style={styles.itemQty}>x{item.qty}</Text>
    <Text style={styles.itemTotal}>{formatCurrency(item.total)}</Text>
  </View>
);

const CustomerDisplay: React.FC<CustomerDisplayProps> = ({ externalScreenId }) => {
  const items = usePosStore(selectCartItems);
  const total = usePosStore(selectCartTotal);
  const itemCount = usePosStore(selectItemCount);
  const promoMediaEnabled = usePosStore(selectPromoMediaEnabled);
  const promoMedia = usePosStore(selectPromoMedia);

  const cartHasItems = itemCount > 0;
  const shouldShowPromo = Boolean(promoMediaEnabled && promoMedia && !cartHasItems);

  const renderCartExternal = () => (
    <View style={styles.displaySurface}>
      <Text style={styles.title}>Carrito del Cliente</Text>
      <FlatList<CartItem>
        data={items}
        renderItem={renderItem}
        keyExtractor={(item: CartItem) => item.variantId}
        style={styles.list}
      />
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
      </View>
    </View>
  );

  const renderPromoExternal = () => {
    if (!promoMedia) {
      return (
        <View style={[styles.promoSurface, styles.promoFallback]}>
          <Text style={styles.promoTitle}>Promoción configurada</Text>
          <Text style={styles.promoSubtitle}>Carga una imagen o video para mostrarlo aquí.</Text>
        </View>
      );
    }

    if (promoMedia.type === 'image') {
      return (
        <View style={styles.promoSurface}>
          <Image source={{ uri: promoMedia.uri }} style={styles.promoMedia} resizeMode="contain" />
        </View>
      );
    }

    return (
      <View style={styles.promoSurface}>
        <Video
          source={{ uri: promoMedia.uri }}
          style={styles.promoMedia}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay
          isLooping
          isMuted={false}
        />
      </View>
    );
  };

  return (
    <>
      <View style={styles.previewWrapper}>
        {!shouldShowPromo ? (
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>Resumen del carrito</Text>
            <View style={styles.previewMetrics}>
              <View>
                <Text style={styles.previewMetricLabel}>Artículos</Text>
                <Text style={styles.previewMetricValue}>{itemCount}</Text>
              </View>
              <View>
                <Text style={styles.previewMetricLabel}>Monto</Text>
                <Text style={styles.previewMetricValue}>{formatCurrency(total)}</Text>
              </View>
            </View>
            <Text style={styles.previewHint}>
              El cliente verá el detalle completo en la pantalla secundaria.
            </Text>
            {promoMediaEnabled && cartHasItems ? (
              <Text style={styles.previewHintMuted}>
                La multimedia promocional se mostrará cuando el carrito quede vacío.
              </Text>
            ) : null}
          </View>
        ) : (
          <View style={[styles.previewCard, styles.previewPromoCard]}>
            <Text style={styles.previewTitle}>Vista de promoción</Text>
            <Text style={styles.previewSubtitle}>
              El contenido promocional permanece activo mientras el carrito está vacío.
            </Text>
            <Text style={styles.previewHint}>
              {promoMedia?.name ? `Archivo seleccionado: ${promoMedia.name}` : 'Carga una imagen o video desde configuración.'}
            </Text>
          </View>
        )}
      </View>
      {externalScreenId ? (
        <ExternalDisplay style={styles.externalRoot} screen={externalScreenId}>
          {shouldShowPromo ? renderPromoExternal() : renderCartExternal()}
        </ExternalDisplay>
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  previewWrapper: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    padding: 24
  },
  previewCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#1f2937'
  },
  previewPromoCard: {
    backgroundColor: '#1f2937'
  },
  previewTitle: {
    fontSize: 20,
    color: '#f9fafb',
    fontWeight: '600',
    marginBottom: 8
  },
  previewSubtitle: {
    fontSize: 14,
    color: '#cbd5f5',
    marginBottom: 16
  },
  previewMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  previewMetricLabel: {
    fontSize: 13,
    color: '#9ca3af',
    textTransform: 'uppercase'
  },
  previewMetricValue: {
    fontSize: 20,
    color: '#f3f4f6',
    fontWeight: '700'
  },
  previewHint: {
    fontSize: 13,
    color: '#9ca3af'
  },
  previewHintMuted: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8
  },
  externalRoot: {
    flex: 1
  },
  displaySurface: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 24,
    justifyContent: 'center'
  },
  title: {
    fontSize: 24,
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center'
  },
  list: {
    flexGrow: 0
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2a2a2a'
  },
  itemName: {
    flex: 2,
    fontSize: 18,
    color: '#ffffff'
  },
  itemQty: {
    flex: 1,
    fontSize: 18,
    color: '#cccccc',
    textAlign: 'center'
  },
  itemTotal: {
    flex: 1,
    fontSize: 18,
    color: '#ffffff',
    textAlign: 'right'
  },
  totalRow: {
    marginTop: 24,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  totalLabel: {
    fontSize: 20,
    color: '#ffffff'
  },
  totalValue: {
    fontSize: 22,
    color: '#ffffff'
  },
  promoSurface: {
    flex: 1,
    backgroundColor: '#0b1120',
    justifyContent: 'center',
    alignItems: 'center'
  },
  promoFallback: {
    padding: 32
  },
  promoMedia: {
    width: '100%',
    height: '100%'
  },
  promoTitle: {
    fontSize: 32,
    color: '#facc15',
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center'
  },
  promoSubtitle: {
    fontSize: 20,
    color: '#e5e7eb',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 16
  },
  promoBadgeWrapper: {
    backgroundColor: '#2563eb',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 24,
    marginBottom: 20
  },
  promoBadge: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  promoFooter: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 12,
    textAlign: 'center'
  }
});

export default CustomerDisplay;
