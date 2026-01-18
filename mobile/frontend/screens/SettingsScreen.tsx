import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import useSecondaryDisplay from '../hooks/useSecondaryDisplay';
import { type RootStackParamList } from '../navigation/types';
import {
  selectPreferredCustomerDisplayId,
  selectPreferredUsbPrinter,
  selectPromoMedia,
  selectPromoMediaEnabled,
  usePosStore,
} from '../store/usePosStore';
import { palette } from '../theme/palette';

export type SettingsScreenProps = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const preferredDisplayId = usePosStore(selectPreferredCustomerDisplayId);
  const promoMediaEnabled = usePosStore(selectPromoMediaEnabled);
  const promoMedia = usePosStore(selectPromoMedia);
  const preferredUsbPrinter = usePosStore(selectPreferredUsbPrinter);
  const { isConnected: isSecondaryConnected } = useSecondaryDisplay();

  const isDisplayConfigured = Boolean(preferredDisplayId);
  const isDisplayActive = isDisplayConfigured && isSecondaryConnected;

  const hasPromoReady = promoMediaEnabled && promoMedia;

  const displayStatus = useMemo(() => {
    if (!isDisplayConfigured) {
      return 'Sin pantalla configurada';
    }
    if (!isSecondaryConnected) {
      return 'Sin conexión detectada';
    }
    return hasPromoReady ? 'Promoción lista' : 'Mostrando POS';
  }, [hasPromoReady, isDisplayConfigured, isSecondaryConnected]);

  const displayDetails = useMemo(() => {
    if (!isDisplayConfigured) {
      return 'Selecciona una pantalla para el cliente y ajusta el contenido mostrado.';
    }

    const promoDetail = hasPromoReady
      ? `Promoción: ${promoMedia?.name ?? 'archivo seleccionado'}`
      : 'Modo POS con carrito';
    return `Pantalla ${preferredDisplayId} · ${promoDetail}`;
  }, [hasPromoReady, isDisplayConfigured, preferredDisplayId, promoMedia]);

  const printerStatus = useMemo(() => {
    if (!preferredUsbPrinter) {
      return 'Ninguna impresora vinculada';
    }
    return `Conectada a ${preferredUsbPrinter.deviceName ?? 'impresora USB'}`;
  }, [preferredUsbPrinter]);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Configuración del punto de venta</Text>
        <Text style={styles.subtitle}>
          Administra los dispositivos secundarios del POS desde cada sección dedicada.
        </Text>
      </View>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => navigation.navigate('SecondaryDisplaySettings')}
        style={styles.card}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Pantalla secundaria</Text>
          <View style={[styles.statusPill, isDisplayActive ? styles.statusAccent : styles.statusNeutral]}>
            <Text style={styles.statusPillText}>{displayStatus}</Text>
          </View>
        </View>
        <Text style={styles.cardDescription}>{displayDetails}</Text>
        <Text style={styles.linkLabel}>Configurar pantalla</Text>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => navigation.navigate('PrinterSettings')}
        style={styles.card}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Impresora POS</Text>
          <View style={[styles.statusPill, preferredUsbPrinter ? styles.statusAccent : styles.statusNeutral]}>
            <Text style={styles.statusPillText}>{printerStatus}</Text>
          </View>
        </View>
        <Text style={styles.cardDescription}>
          Configura la impresora USB para los comprobantes, ejecuta pruebas y monitorea el estado.
        </Text>
        <Text style={styles.linkLabel}>Configurar impresora</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: palette.textSecondary,
    marginBottom: 6,
  },
  subtitle: {
    color: palette.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    padding: 20,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: palette.textSecondary,
  },
  cardDescription: {
    fontSize: 14,
    color: palette.textMuted,
    marginBottom: 12,
    lineHeight: 20,
  },
  linkLabel: {
    color: palette.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  statusAccent: {
    backgroundColor: palette.primaryTint,
    borderColor: palette.primary,
  },
  statusNeutral: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: palette.textSecondary,
  },
});

export default SettingsScreen;
