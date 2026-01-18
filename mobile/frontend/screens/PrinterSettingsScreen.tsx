import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { type RootStackParamList } from '../navigation/types';
import PrinterManager from '../services/PrinterManager';
import { loadDeviceSettings, updateDeviceSettings } from '../services/settingsStorage';
import {
  selectPreferredUsbPrinter,
  usePosStore,
  type UsbPrinterSelection,
} from '../store/usePosStore';
import { palette } from '../theme/palette';

type PrinterSettingsScreenProps = NativeStackScreenProps<RootStackParamList, 'PrinterSettings'>;

type UsbPrinterInfo = {
  device_name?: string;
  product_id?: string | number;
  vendor_id?: string | number;
  manufacturer_name?: string;
  serial_number?: string;
};

type RefreshOptions = {
  allowSelectionReset?: boolean;
  showError?: boolean;
};

function getPrinterKey(printer: UsbPrinterInfo): string | null {
  if (printer.vendor_id == null || printer.product_id == null) {
    return null;
  }
  return `${printer.vendor_id}:${printer.product_id}`;
}

const PrinterSettingsScreen: React.FC<PrinterSettingsScreenProps> = () => {
  const preferredUsbPrinter = usePosStore(selectPreferredUsbPrinter);
  const setPreferredUsbPrinter = usePosStore((state) => state.setPreferredUsbPrinter);

  const [usbPrinters, setUsbPrinters] = useState<UsbPrinterInfo[]>([]);
  const [isListingPrinters, setIsListingPrinters] = useState(false);
  const [isConnectingPrinter, setIsConnectingPrinter] = useState(false);
  const [isTestingPrinter, setIsTestingPrinter] = useState(false);
  const [printerStatus, setPrinterStatus] = useState<string | null>(null);
  const [selectedPrinterKey, setSelectedPrinterKey] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    if (!preferredUsbPrinter) {
      setSelectedPrinterKey(null);
      return;
    }
    setSelectedPrinterKey(`${preferredUsbPrinter.vendorId}:${preferredUsbPrinter.productId}`);
  }, [preferredUsbPrinter]);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      try {
        const stored = await loadDeviceSettings();
        if (!isMounted) {
          return;
        }

        if (stored?.preferredUsbPrinter) {
          setPreferredUsbPrinter(stored.preferredUsbPrinter);
        }
      } catch (error) {
        console.warn('[PrinterSettings] No se pudieron cargar los ajustes guardados', error);
      } finally {
        if (isMounted) {
          setIsBootstrapping(false);
        }
      }
    };

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, [setPreferredUsbPrinter]);

  const refreshUsbPrinters = useCallback(
    async (options?: RefreshOptions) => {
      const { allowSelectionReset = true, showError = false } = options ?? {};
      setIsListingPrinters(true);
      try {
        const discovered = await PrinterManager.listUsbPrinters();
        setUsbPrinters(discovered);

        if (allowSelectionReset && selectedPrinterKey) {
          const stillAvailable = discovered.some((printer) => getPrinterKey(printer) === selectedPrinterKey);
          if (!stillAvailable) {
            setSelectedPrinterKey(null);
            setPreferredUsbPrinter(null);
            setPrinterStatus(null);
            await updateDeviceSettings({ preferredUsbPrinter: null });
          }
        }
      } catch (error) {
        if (showError) {
          const message =
            error instanceof Error
              ? error.message
              : 'No se pudieron listar las impresoras USB conectadas.';
          Alert.alert('Error al listar impresoras', message);
        }
      } finally {
        setIsListingPrinters(false);
      }
    },
    [selectedPrinterKey, setPreferredUsbPrinter],
  );

  useEffect(() => {
    if (isBootstrapping) {
      return;
    }
    void refreshUsbPrinters({ allowSelectionReset: false });
  }, [isBootstrapping, refreshUsbPrinters]);

  const handleSelectPrinter = useCallback(
    async (printer: UsbPrinterInfo) => {
      const key = getPrinterKey(printer);
      if (!key) {
        Alert.alert(
          'Impresora no compatible',
          'El dispositivo seleccionado no expone identificadores USB válidos.',
        );
        return;
      }

      setSelectedPrinterKey(key);
      const selection: UsbPrinterSelection = {
        vendorId: String(printer.vendor_id),
        productId: String(printer.product_id),
        deviceName: printer.device_name ?? null,
      };
      setPreferredUsbPrinter(selection);
      setPrinterStatus(null);
      await updateDeviceSettings({ preferredUsbPrinter: selection });
    },
    [setPreferredUsbPrinter],
  );

  const handleConnectPrinter = useCallback(async () => {
    if (!selectedPrinterKey) {
      Alert.alert('Selecciona una impresora', 'Elige una impresora USB de la lista para continuar.');
      return;
    }

    const [vendorId, productId] = selectedPrinterKey.split(':');
    setIsConnectingPrinter(true);
    setPrinterStatus(null);
    try {
      const printer = await PrinterManager.connectUsbPrinter({ vendorId, productId });
      const selection: UsbPrinterSelection = {
        vendorId: String(printer?.vendor_id ?? vendorId),
        productId: String(printer?.product_id ?? productId),
        deviceName: printer?.device_name ?? null,
      };
      setPreferredUsbPrinter(selection);
      await updateDeviceSettings({ preferredUsbPrinter: selection });
      setPrinterStatus(`Conectado a ${selection.deviceName ?? 'impresora USB'}`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No se pudo conectar con la impresora seleccionada.';
      Alert.alert('Error de conexión', message);
    } finally {
      setIsConnectingPrinter(false);
    }
  }, [selectedPrinterKey, setPreferredUsbPrinter]);

  const handleTestPrinter = useCallback(async () => {
    if (!selectedPrinterKey) {
      Alert.alert('Selecciona una impresora', 'Elige una impresora USB antes de ejecutar la prueba.');
      return;
    }

    const [vendorId, productId] = selectedPrinterKey.split(':');
    setIsTestingPrinter(true);
    try {
      await PrinterManager.connectUsbPrinter({ vendorId, productId });
      await PrinterManager.printOnUsb('*** Prueba de impresión ***\nConfiguración realizada correctamente.\n\n');
      setPrinterStatus('Impresión de prueba enviada correctamente.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No se pudo completar la impresión de prueba.';
      Alert.alert('Error al imprimir', message);
    } finally {
      setIsTestingPrinter(false);
    }
  }, [selectedPrinterKey]);

  const handleResetPrinterPreferences = useCallback(() => {
    Alert.alert('Restablecer impresora', '¿Seguro que deseas borrar la configuración guardada?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Restablecer',
        style: 'destructive',
        onPress: async () => {
          setPreferredUsbPrinter(null);
          setSelectedPrinterKey(null);
          setPrinterStatus(null);
          await updateDeviceSettings({ preferredUsbPrinter: null });
        },
      },
    ]);
  }, [setPreferredUsbPrinter]);

  const preferredPrinterLabel = useMemo(() => {
    if (!preferredUsbPrinter) {
      return 'Ninguna impresora conectada';
    }
    return `Conectada a ${preferredUsbPrinter.deviceName ?? 'impresora USB'}`;
  }, [preferredUsbPrinter]);

  const printerListEmpty =
    printerStatus == null && !isListingPrinters && usbPrinters.length === 0 && preferredUsbPrinter == null;

  if (isBootstrapping) {
    return (
      <View style={[styles.root, styles.loadingState]}>
        <ActivityIndicator size="large" color={palette.primaryText} />
        <Text style={styles.loadingText}>Preparando configuración…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Impresoras POS</Text>
        <Text style={styles.cardSubtitle}>
          Descubre y configura las impresoras USB conectadas para los tickets de venta.
        </Text>

        <View style={styles.statusBanner}>
          <Text style={styles.statusBannerLabel}>{preferredPrinterLabel}</Text>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton, isListingPrinters && styles.actionButtonDisabled]}
            activeOpacity={0.85}
            onPress={() => refreshUsbPrinters({ showError: true })}
            disabled={isListingPrinters}
          >
            {isListingPrinters ? (
              <ActivityIndicator color={palette.primaryStrong} />
            ) : (
              <Text style={[styles.actionButtonLabel, styles.secondaryButtonLabel]}>Buscar impresoras</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.listSectionTitle}>Impresoras USB</Text>
        {printerListEmpty ? (
          <Text style={styles.emptyState}>Conecta una impresora USB para mostrarla aquí.</Text>
        ) : (
          usbPrinters.map((printer, index) => {
            const printerIdKey = getPrinterKey(printer);
            const key = printerIdKey ?? `printer-${index}`;
            const isSelected = printerIdKey != null && printerIdKey === selectedPrinterKey;
            return (
              <Pressable
                key={key}
                style={[styles.listItem, isSelected && styles.listItemSelected]}
                onPress={() => handleSelectPrinter(printer)}
              >
                <Text style={styles.listItemTitle}>{printer.device_name ?? 'Impresora USB'}</Text>
                <Text style={styles.listItemMeta}>
                  VID {printer.vendor_id ?? 'NA'} · PID {printer.product_id ?? 'NA'}
                </Text>
                {printer.manufacturer_name ? (
                  <Text style={styles.listItemHint}>Fabricante: {printer.manufacturer_name}</Text>
                ) : null}
                {printer.serial_number ? (
                  <Text style={styles.listItemHint}>Serie: {printer.serial_number}</Text>
                ) : null}
                {isSelected ? (
                  <Text style={styles.listItemHint}>Seleccionada como impresora principal.</Text>
                ) : null}
              </Pressable>
            );
          })
        )}

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.actionButton, (isConnectingPrinter || !selectedPrinterKey) && styles.actionButtonDisabled]}
            activeOpacity={0.85}
            onPress={handleConnectPrinter}
            disabled={isConnectingPrinter || !selectedPrinterKey}
          >
            {isConnectingPrinter ? (
              <ActivityIndicator color={palette.primaryText} />
            ) : (
              <Text style={styles.actionButtonLabel}>Conectar impresora</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.secondaryButton,
              (isTestingPrinter || !selectedPrinterKey) && styles.actionButtonDisabled,
            ]}
            activeOpacity={0.85}
            onPress={handleTestPrinter}
            disabled={isTestingPrinter || !selectedPrinterKey}
          >
            {isTestingPrinter ? (
              <ActivityIndicator color={palette.primaryStrong} />
            ) : (
              <Text style={[styles.actionButtonLabel, styles.secondaryButtonLabel]}>Imprimir prueba</Text>
            )}
          </TouchableOpacity>
        </View>

        {printerStatus ? <Text style={styles.statusMessage}>{printerStatus}</Text> : null}

        <View style={styles.divider} />

        <TouchableOpacity
          style={[styles.actionButton, styles.dangerButton]}
          activeOpacity={0.85}
          onPress={handleResetPrinterPreferences}
        >
          <Text style={styles.actionButtonLabel}>Restablecer impresora</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    marginTop: 12,
    color: palette.textMuted,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    padding: 20,
  },
  cardTitle: {
    color: palette.textSecondary,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardSubtitle: {
    color: palette.textMuted,
    marginBottom: 16,
    lineHeight: 20,
  },
  statusBanner: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.primary,
    backgroundColor: palette.primaryTint,
    padding: 16,
  },
  statusBannerLabel: {
    color: palette.primaryStrong,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  actionButton: {
    backgroundColor: palette.primary,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 12,
  },
  actionButtonLabel: {
    color: palette.primaryText,
    fontWeight: '600',
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  secondaryButton: {
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  secondaryButtonLabel: {
    color: palette.primaryStrong,
  },
  dangerButton: {
    backgroundColor: palette.danger,
  },
  listSectionTitle: {
    color: palette.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  listItem: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    padding: 14,
    marginBottom: 12,
    backgroundColor: palette.surface,
  },
  listItemSelected: {
    borderColor: palette.primary,
    backgroundColor: palette.primaryTint,
  },
  listItemTitle: {
    color: palette.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  listItemMeta: {
    color: palette.textMuted,
    fontSize: 13,
    marginTop: 6,
  },
  listItemHint: {
    color: palette.textMuted,
    fontSize: 12,
    marginTop: 6,
  },
  emptyState: {
    color: palette.textMuted,
    fontStyle: 'italic',
  },
  statusMessage: {
    color: palette.textMuted,
    fontSize: 13,
    marginTop: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.divider,
    marginVertical: 24,
  },
});

export default PrinterSettingsScreen;
