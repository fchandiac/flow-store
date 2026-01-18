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
  selectBackendBaseUrl,
  usePosStore,
} from '../store/usePosStore';
import { palette } from '../theme/palette';

export type SettingsScreenProps = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const preferredDisplayId = usePosStore(selectPreferredCustomerDisplayId);
  const promoMediaEnabled = usePosStore(selectPromoMediaEnabled);
  const promoMedia = usePosStore(selectPromoMedia);
  const preferredUsbPrinter = usePosStore(selectPreferredUsbPrinter);
  const backendBaseUrl = usePosStore(selectBackendBaseUrl);
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

  const serverStatus = useMemo(() => {
    return backendBaseUrl ? 'URL personalizada' : 'URL predeterminada';
  }, [backendBaseUrl]);

  const serverDetails = useMemo(() => {
    if (backendBaseUrl) {
      return backendBaseUrl;
    }
    return 'Se utilizará la dirección detectada automáticamente para el backend.';
  }, [backendBaseUrl]);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
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

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => navigation.navigate('ServerSettings')}
        style={styles.card}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Servidor POS</Text>
          <View
            style={[
              styles.statusPill,
              backendBaseUrl ? styles.statusAccent : styles.statusNeutral,
            ]}
          >
            <Text style={styles.statusPillText}>{serverStatus}</Text>
          </View>
        </View>
        <Text style={styles.cardDescription}>{serverDetails}</Text>
        <Text style={styles.linkLabel}>Configurar servidor</Text>
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
