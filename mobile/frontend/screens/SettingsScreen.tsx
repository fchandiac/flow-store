import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import useSecondaryDisplay from '../hooks/useSecondaryDisplay';
import { type RootStackParamList } from '../navigation/types';
import PrinterManager from '../services/PrinterManager';
import {
  fetchExternalDisplays,
  hasOverlayPermission,
  isCustomerScreenAvailable,
  requestOverlayPermission,
  type CustomerExternalDisplay,
} from '../services/customerScreenService';
import {
  clearDeviceSettings,
  loadDeviceSettings,
  updateDeviceSettings,
} from '../services/settingsStorage';
import {
  selectPreferredCustomerDisplayId,
  selectPreferredCustomerDisplayWidth,
  selectPreferredUsbPrinter,
  selectSecondaryMode,
  usePosStore,
  type SecondaryDisplayMode,
  type UsbPrinterSelection,
} from '../store/usePosStore';
import { palette } from '../theme/palette';

export type SettingsScreenProps = NativeStackScreenProps<RootStackParamList, 'Settings'>;

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

const supportsCustomerScreen = isCustomerScreenAvailable;

function getPrinterKey(printer: UsbPrinterInfo): string | null {
  if (printer.vendor_id == null || printer.product_id == null) {
    return null;
  }
  return `${printer.vendor_id}:${printer.product_id}`;
}

function formatDisplayLabel(display: CustomerExternalDisplay): string {
  if (display.name) {
    return display.name;
  }
  return `Pantalla ${display.id}`;
}

const SettingsScreen: React.FC<SettingsScreenProps> = () => {
  const secondaryMode = usePosStore(selectSecondaryMode);
  const setSecondaryMode = usePosStore((state) => state.setSecondaryMode);
  const setPreferredUsbPrinter = usePosStore((state) => state.setPreferredUsbPrinter);
  const setPreferredCustomerDisplay = usePosStore((state) => state.setPreferredCustomerDisplay);
  const preferredUsbPrinter = usePosStore(selectPreferredUsbPrinter);
  const preferredCustomerDisplayId = usePosStore(selectPreferredCustomerDisplayId);
  const preferredCustomerDisplayWidth = usePosStore(selectPreferredCustomerDisplayWidth);

  const { isConnected: isSecondaryConnected, screenId: activeScreenId } = useSecondaryDisplay();

  const [usbPrinters, setUsbPrinters] = useState<UsbPrinterInfo[]>([]);
  const [isListingPrinters, setIsListingPrinters] = useState(false);
  const [isConnectingPrinter, setIsConnectingPrinter] = useState(false);
  const [isTestingPrinter, setIsTestingPrinter] = useState(false);
  const [printerStatus, setPrinterStatus] = useState<string | null>(null);
  const [selectedPrinterKey, setSelectedPrinterKey] = useState<string | null>(null);

  const [externalDisplays, setExternalDisplays] = useState<CustomerExternalDisplay[]>([]);
  const [isRefreshingDisplays, setIsRefreshingDisplays] = useState(false);
  const [overlayGranted, setOverlayGranted] = useState(false);
  const [isCheckingOverlay, setIsCheckingOverlay] = useState(false);
  const [isOpeningOverlaySettings, setIsOpeningOverlaySettings] = useState(false);
  const [selectedDisplayId, setSelectedDisplayId] = useState<string | null>(null);
  const [customDisplayWidth, setCustomDisplayWidth] = useState<number | null>(null);
  const [displayWidthInput, setDisplayWidthInput] = useState('');

  const [settingsReady, setSettingsReady] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    if (!settingsReady) {
      return;
    }

    if (preferredUsbPrinter) {
      setSelectedPrinterKey(`${preferredUsbPrinter.vendorId}:${preferredUsbPrinter.productId}`);
    }

    setSelectedDisplayId(preferredCustomerDisplayId ?? null);
    setCustomDisplayWidth(preferredCustomerDisplayWidth ?? null);
    setDisplayWidthInput(preferredCustomerDisplayWidth ? String(preferredCustomerDisplayWidth) : '');
  }, [
    preferredUsbPrinter,
    preferredCustomerDisplayId,
    preferredCustomerDisplayWidth,
    settingsReady,
  ]);

  const checkOverlayPermissionStatus = useCallback(async () => {
    if (!supportsCustomerScreen) {
      setOverlayGranted(false);
      return;
    }

    setIsCheckingOverlay(true);
    try {
      const granted = await hasOverlayPermission();
      setOverlayGranted(granted);
    } catch {
      setOverlayGranted(false);
    } finally {
      setIsCheckingOverlay(false);
    }
  }, []);

  const refreshExternalDisplays = useCallback(
    async (options?: RefreshOptions) => {
      if (!supportsCustomerScreen) {
        setExternalDisplays([]);
        return;
      }

      const { allowSelectionReset = true, showError = false } = options ?? {};
      setIsRefreshingDisplays(true);
      try {
        const displays = await fetchExternalDisplays();
        setExternalDisplays(displays);

        if (!allowSelectionReset || !selectedDisplayId) {
          return;
        }

        const stillAvailable = displays.some((entry) => entry.id === selectedDisplayId);
        if (!stillAvailable) {
          setSelectedDisplayId(null);
          setCustomDisplayWidth(null);
          setDisplayWidthInput('');
          setPreferredCustomerDisplay({ id: null, width: null });
          await updateDeviceSettings({
            preferredCustomerDisplayId: null,
            preferredCustomerDisplayWidth: null,
          });
        }
      } catch (error) {
        if (showError) {
          const message =
            error instanceof Error
              ? error.message
              : 'No se pudieron listar las pantallas externas disponibles.';
          Alert.alert('Error al listar pantallas', message);
        }
      } finally {
        setIsRefreshingDisplays(false);
      }
    },
    [selectedDisplayId, setCustomDisplayWidth, setDisplayWidthInput, setPreferredCustomerDisplay],
  );

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
    [selectedPrinterKey, setPreferredUsbPrinter, setPrinterStatus, setSelectedPrinterKey],
  );

  const handleChangeSecondaryMode = useCallback(
    async (mode: SecondaryDisplayMode) => {
      if (mode === secondaryMode) {
        return;
      }
      setSecondaryMode(mode);
      await updateDeviceSettings({ secondaryDisplayMode: mode });
    },
    [secondaryMode, setSecondaryMode],
  );

  const handleSelectDisplay = useCallback(
    async (display: CustomerExternalDisplay) => {
      if (display.isMainScreen) {
        Alert.alert(
          'Pantalla principal',
          'No es necesario seleccionar la pantalla principal como pantalla del cliente.',
        );
        return;
      }

      setSelectedDisplayId(display.id);
      const widthToPersist = customDisplayWidth ?? display.width ?? null;
      if (customDisplayWidth == null && display.width) {
        setCustomDisplayWidth(display.width);
        setDisplayWidthInput(String(display.width));
      }
      setPreferredCustomerDisplay({ id: display.id, width: widthToPersist });
      await updateDeviceSettings({
        preferredCustomerDisplayId: display.id,
        preferredCustomerDisplayWidth: widthToPersist,
      });
    },
    [customDisplayWidth, setDisplayWidthInput, setPreferredCustomerDisplay],
  );

  const handleDisplayWidthBlur = useCallback(async () => {
    const trimmed = displayWidthInput.trim();
    if (!trimmed) {
      setCustomDisplayWidth(null);
      setPreferredCustomerDisplay({ id: selectedDisplayId, width: null });
      await updateDeviceSettings({ preferredCustomerDisplayWidth: null });
      return;
    }

    const parsed = Number.parseInt(trimmed, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      Alert.alert('Valor inválido', 'Ingresa un ancho en píxeles mayor a 0 o deja el campo vacío.');
      return;
    }

    setCustomDisplayWidth(parsed);
    setPreferredCustomerDisplay({ id: selectedDisplayId, width: parsed });
    await updateDeviceSettings({ preferredCustomerDisplayWidth: parsed });
  }, [displayWidthInput, selectedDisplayId, setPreferredCustomerDisplay]);

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
    [setPreferredUsbPrinter, setSelectedPrinterKey, setPrinterStatus],
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
  }, [selectedPrinterKey, setPreferredUsbPrinter, setPrinterStatus]);

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
  }, [selectedPrinterKey, setPrinterStatus]);

  const handleRequestOverlayPermission = useCallback(async () => {
    if (!supportsCustomerScreen) {
      return;
    }
    setIsOpeningOverlaySettings(true);
    try {
      await requestOverlayPermission();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No se pudo abrir la configuración del sistema.';
      Alert.alert('Acción no disponible', message);
    } finally {
      setIsOpeningOverlaySettings(false);
    }
  }, []);

  const handleResetPreferences = useCallback(async () => {
    Alert.alert('Restablecer ajustes', '¿Seguro que deseas borrar las preferencias guardadas?', [
      {
        text: 'Cancelar',
        style: 'cancel',
      },
      {
        text: 'Restablecer',
        style: 'destructive',
        onPress: async () => {
          await clearDeviceSettings();
          setPreferredUsbPrinter(null);
          setPreferredCustomerDisplay({ id: null, width: null });
          setSelectedPrinterKey(null);
          setSelectedDisplayId(null);
          setDisplayWidthInput('');
          setCustomDisplayWidth(null);
          setPrinterStatus(null);
          await refreshUsbPrinters({ allowSelectionReset: false });
          await refreshExternalDisplays({ allowSelectionReset: false });
        },
      },
    ]);
  }, [
    refreshExternalDisplays,
    refreshUsbPrinters,
    setPreferredCustomerDisplay,
    setPreferredUsbPrinter,
    setSelectedPrinterKey,
    setSelectedDisplayId,
    setDisplayWidthInput,
    setCustomDisplayWidth,
    setPrinterStatus,
  ]);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      try {
        const stored = await loadDeviceSettings();
        if (!isMounted) {
          return;
        }

        const usbSelection = stored.preferredUsbPrinter ?? null;
        if (usbSelection) {
          const key = `${usbSelection.vendorId}:${usbSelection.productId}`;
          setSelectedPrinterKey(key);
          setPreferredUsbPrinter(usbSelection);
        } else {
          setSelectedPrinterKey(null);
          setPreferredUsbPrinter(null);
        }

        const displayId = stored.preferredCustomerDisplayId ?? null;
        setSelectedDisplayId(displayId);
        const width = stored.preferredCustomerDisplayWidth ?? null;
        setCustomDisplayWidth(width);
        setDisplayWidthInput(width ? String(width) : '');
        setPreferredCustomerDisplay({ id: displayId, width });

        if (stored.secondaryDisplayMode) {
          setSecondaryMode(stored.secondaryDisplayMode);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'No se pudieron cargar las preferencias.';
        Alert.alert('Ajustes no disponibles', message);
      } finally {
        if (isMounted) {
          setSettingsReady(true);
          setIsBootstrapping(false);
        }
      }

      if (!isMounted) {
        return;
      }

      await checkOverlayPermissionStatus();
      await refreshExternalDisplays({ allowSelectionReset: false });
      await refreshUsbPrinters({ allowSelectionReset: false });
    };

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, [
    checkOverlayPermissionStatus,
    refreshExternalDisplays,
    refreshUsbPrinters,
    setPreferredCustomerDisplay,
    setPreferredUsbPrinter,
    setSecondaryMode,
  ]);

  const printerListEmpty = useMemo(() => !usbPrinters.length, [usbPrinters]);
  const displaysListEmpty = useMemo(() => !externalDisplays.length, [externalDisplays]);
  const isInitialLoading = isBootstrapping && !settingsReady;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {isInitialLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={palette.primary} />
            <Text style={styles.loadingText}>Cargando preferencias…</Text>
          </View>
        ) : null}

        <View style={styles.cardsRow}>
          <View style={[styles.card, styles.cardColumn]}>
            <Text style={styles.cardTitle}>Pantalla del cliente</Text>
            <Text style={styles.cardSubtitle}>
              Administra la pantalla secundaria utilizada para mostrar información al cliente.
            </Text>

            <View
              style={[
                styles.statusPill,
                !supportsCustomerScreen
                  ? styles.statusPillDanger
                  : overlayGranted
                  ? styles.statusPillSuccess
                  : styles.statusPillWarning,
              ]}
            >
              <Text
                style={[
                  styles.statusPillText,
                  !supportsCustomerScreen
                    ? styles.statusPillTextDanger
                    : overlayGranted
                    ? styles.statusPillText
                    : styles.statusPillTextWarning,
                ]}
              >
                {!supportsCustomerScreen
                  ? 'Módulo nativo no disponible'
                  : overlayGranted
                  ? 'Permiso de superposición concedido'
                  : 'Permiso de superposición pendiente'}
              </Text>
            </View>

            {supportsCustomerScreen ? (
              <Text style={styles.infoText}>
                Estado actual: {isSecondaryConnected ? 'Conectada' : 'Sin conexión detectada'}
              </Text>
            ) : (
              <Text style={styles.infoText}>
                Instala una versión del app compatible para habilitar la pantalla del cliente.
              </Text>
            )}

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.secondaryButton, isCheckingOverlay && styles.actionButtonDisabled]}
                activeOpacity={0.85}
                onPress={checkOverlayPermissionStatus}
                disabled={isCheckingOverlay || !supportsCustomerScreen}
              >
                {isCheckingOverlay ? (
                  <ActivityIndicator color={palette.primaryStrong} />
                ) : (
                  <Text style={[styles.actionButtonLabel, styles.secondaryButtonLabel]}>Verificar permiso</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.secondaryButton,
                  isOpeningOverlaySettings && styles.actionButtonDisabled,
                ]}
                activeOpacity={0.85}
                onPress={handleRequestOverlayPermission}
                disabled={isOpeningOverlaySettings || !supportsCustomerScreen}
              >
                {isOpeningOverlaySettings ? (
                  <ActivityIndicator color={palette.primaryStrong} />
                ) : (
                  <Text style={[styles.actionButtonLabel, styles.secondaryButtonLabel]}>Abrir ajustes del sistema</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.secondaryButton, isRefreshingDisplays && styles.actionButtonDisabled]}
                activeOpacity={0.85}
                onPress={() => refreshExternalDisplays({ showError: true })}
                disabled={isRefreshingDisplays || !supportsCustomerScreen}
              >
                {isRefreshingDisplays ? (
                  <ActivityIndicator color={palette.primaryStrong} />
                ) : (
                  <Text style={[styles.actionButtonLabel, styles.secondaryButtonLabel]}>Actualizar lista</Text>
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.listSectionTitle}>Pantallas detectadas</Text>
            {displaysListEmpty ? (
              <Text style={styles.emptyState}>No se detectaron pantallas externas.</Text>
            ) : (
              externalDisplays.map((display) => {
                const isSelected = display.id === selectedDisplayId;
                const isActive = display.id === activeScreenId;
                const disabled = Boolean(display.isMainScreen);
                return (
                  <Pressable
                    key={display.id}
                    style={[
                      styles.listItem,
                      isSelected && styles.listItemSelected,
                      disabled && styles.listItemDisabled,
                    ]}
                    onPress={() => handleSelectDisplay(display)}
                  >
                    <View style={styles.listItemHeader}>
                      <Text style={styles.listItemTitle}>{formatDisplayLabel(display)}</Text>
                      {isActive ? <Text style={styles.badge}>En uso</Text> : null}
                    </View>
                    <Text style={styles.listItemMeta}>
                      Resolución {display.width ?? 'NA'}×{display.height ?? 'NA'} · ID {display.id}
                    </Text>
                    {display.isMainScreen ? (
                      <Text style={styles.listItemHint}>Pantalla principal del dispositivo.</Text>
                    ) : null}
                    {isSelected ? (
                      <Text style={styles.listItemHint}>Seleccionada como pantalla del cliente.</Text>
                    ) : null}
                  </Pressable>
                );
              })
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Ancho preferido (px)</Text>
              <TextInput
                value={displayWidthInput}
                onChangeText={setDisplayWidthInput}
                onBlur={handleDisplayWidthBlur}
                placeholder="Automático"
                placeholderTextColor={palette.textMuted}
                keyboardType="numeric"
                style={styles.textInput}
              />
              <Text style={styles.inputHint}>
                Ajusta el ancho a utilizar en la pantalla externa. Deja vacío para usar el valor detectado.
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Contenido mostrado</Text>
              <View style={styles.toggleRow}>
                <Pressable
                  style={[
                    styles.toggleButton,
                    styles.toggleButtonLeft,
                    secondaryMode === 'cart' && styles.toggleButtonActive,
                  ]}
                  onPress={() => handleChangeSecondaryMode('cart')}
                >
                  <Text
                    style={[
                      styles.toggleButtonText,
                      secondaryMode === 'cart' && styles.toggleButtonTextActive,
                    ]}
                  >
                    Carrito
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.toggleButton,
                    styles.toggleButtonRight,
                    secondaryMode === 'promo' && styles.toggleButtonActive,
                  ]}
                  onPress={() => handleChangeSecondaryMode('promo')}
                >
                  <Text
                    style={[
                      styles.toggleButtonText,
                      secondaryMode === 'promo' && styles.toggleButtonTextActive,
                    ]}
                  >
                    Promoción
                  </Text>
                </Pressable>
              </View>
              <Text style={styles.inputHint}>
                Define el contenido que se enviará al módulo de pantalla del cliente.
              </Text>
            </View>
          </View>

          <View style={[styles.card, styles.cardColumn]}>
            <Text style={styles.cardTitle}>Impresoras POS</Text>
            <Text style={styles.cardSubtitle}>
              Descubre y configura las impresoras USB conectadas para los tickets de venta.
            </Text>

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
                style={[
                  styles.actionButton,
                  (isConnectingPrinter || !selectedPrinterKey) && styles.actionButtonDisabled,
                ]}
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
              onPress={handleResetPreferences}
            >
              <Text style={styles.actionButtonLabel}>Restablecer preferencias</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.background,
  },
  scroll: {
    flex: 1,
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
  cardsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    padding: 20,
    marginHorizontal: 8,
    marginBottom: 16,
  },
  cardColumn: {
    flex: 1,
    minWidth: 320,
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
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
  },
  statusPillSuccess: {
    backgroundColor: palette.positiveTint,
  },
  statusPillWarning: {
    backgroundColor: palette.warningTint,
  },
  statusPillDanger: {
    backgroundColor: palette.dangerTint,
  },
  statusPillText: {
    color: palette.success,
    fontWeight: '600',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusPillTextWarning: {
    color: palette.warning,
  },
  statusPillTextDanger: {
    color: palette.error,
  },
  infoText: {
    color: palette.textMuted,
    fontSize: 14,
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
  listItemDisabled: {
    opacity: 0.5,
  },
  listItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: palette.positiveTint,
    color: palette.success,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyState: {
    color: palette.textMuted,
    fontStyle: 'italic',
  },
  inputGroup: {
    marginTop: 20,
  },
  inputLabel: {
    color: palette.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: palette.textPrimary,
    fontSize: 16,
  },
  inputHint: {
    color: palette.textMuted,
    fontSize: 12,
    marginTop: 6,
    lineHeight: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  toggleButton: {
    flex: 1,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  toggleButtonLeft: {
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    marginRight: 1,
  },
  toggleButtonRight: {
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    marginLeft: 1,
  },
  toggleButtonActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  toggleButtonText: {
    color: palette.textSecondary,
    fontWeight: '600',
  },
  toggleButtonTextActive: {
    color: palette.primaryText,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.divider,
    marginVertical: 24,
  },
  statusMessage: {
    color: palette.textMuted,
    fontSize: 13,
    marginTop: 12,
  },
});

export default SettingsScreen;
