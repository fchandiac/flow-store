import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import CustomerDisplay from './components/CustomerDisplay';
import useSecondaryDisplay from './hooks/useSecondaryDisplay';
import PrinterManager from './services/PrinterManager';
import apiService from './services/apiService';
import {
  CartItem,
  selectCartItems,
  selectCartTotal,
  selectSecondaryMode,
  usePosStore
} from './store/usePosStore';
import {
  fetchExternalDisplays,
  hasOverlayPermission as checkOverlayPermission,
  isCustomerScreenAvailable,
  requestOverlayPermission,
  syncCustomerDisplay,
  type CustomerExternalDisplay
} from './services/customerScreenService';

type UsbPrinterInfo = {
  device_name?: string;
  product_id?: string;
  vendor_id?: string;
  manufacturer_name?: string;
  serial_number?: string;
};

type SalePayload = {
  saleId: string;
  items: CartItem[];
  total: number;
  createdAt: string;
};

export default function App() {
  const cartItems = usePosStore(selectCartItems);
  const secondaryMode = usePosStore(selectSecondaryMode);
  const setSecondaryMode = usePosStore(state => state.setSecondaryMode);
  const saleTotal = usePosStore(selectCartTotal);
  const [isUsbConnected, setUsbConnected] = useState(false);
  const [isProcessing, setProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [usbPrinters, setUsbPrinters] = useState<UsbPrinterInfo[]>([]);
  const [isListingPrinters, setListingPrinters] = useState(false);
  const [manualScreens, setManualScreens] = useState<CustomerExternalDisplay[]>([]);
  const [isRefreshingScreens, setRefreshingScreens] = useState(false);
  const [overlayGranted, setOverlayGranted] = useState<boolean | null>(null);
  const supportsCustomerScreen = isCustomerScreenAvailable;
  const {
    isConnected: isSecondaryConnected,
    screenId,
    availableScreens
  } = useSecondaryDisplay();
  const [selectedScreenId, setSelectedScreenId] = useState<string | null | undefined>(undefined);
  const resolvedScreenId =
    selectedScreenId === null
      ? undefined
      : selectedScreenId ?? (isSecondaryConnected ? screenId : undefined);
  const screenOptions = useMemo(() => {
    if (manualScreens.length) {
      return manualScreens;
    }
    return availableScreens;
  }, [manualScreens, availableScreens]);

  const resolvedScreen = useMemo(
    () => screenOptions.find(screen => screen.id === resolvedScreenId),
    [screenOptions, resolvedScreenId]
  );
  const isSecondaryReady = Boolean(resolvedScreen && !resolvedScreen?.isMainScreen);

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {
      // Ignore orientation locking errors on unsupported environments (e.g., web).
    });
  }, []);

  useEffect(() => {
    if (selectedScreenId === null) {
      return;
    }

    if (!screenOptions.length) {
      setSelectedScreenId(undefined);
      return;
    }

    if (selectedScreenId) {
      const stillExists = screenOptions.some(screen => screen.id === selectedScreenId);
      if (!stillExists) {
        const fallback = screenOptions.find(screen => screen.isMainScreen === false) ?? screenOptions[0];
        setSelectedScreenId(fallback?.id ?? undefined);
      }
      return;
    }

    const candidate = screenOptions.find(screen => screen.isMainScreen === false) ?? screenOptions[0];
    if (candidate) {
      setSelectedScreenId(candidate.id);
    }
  }, [screenOptions, selectedScreenId]);

  useEffect(() => {
    if (!supportsCustomerScreen) {
      return;
    }

    checkOverlayPermission()
      .then(setOverlayGranted)
      .catch(() => setOverlayGranted(false));
  }, [supportsCustomerScreen]);

  const handleRefreshUsbPrinters = async () => {
    if (isListingPrinters) {
      return;
    }

    setListingPrinters(true);
    setStatusMessage('Buscando impresoras USB...');
    try {
      const discovered = await PrinterManager.listUsbPrinters();
      const parsed = Array.isArray(discovered) ? discovered : [];
      setUsbPrinters(parsed);
      setStatusMessage(
        parsed.length
          ? `Se detectaron ${parsed.length} impresoras USB.`
          : 'No se detectaron impresoras USB conectadas.'
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : `${error}`;
      setStatusMessage('');
      Alert.alert('Impresoras USB', message);
    } finally {
      setListingPrinters(false);
    }
  };

  const handleConnectUsbPrinter = async () => {
    setStatusMessage('Conectando impresora USB...');
    try {
      await PrinterManager.connectUsbPrinter();
      setUsbConnected(true);
      setStatusMessage('Impresora USB conectada correctamente.');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : `${error}`;
      setStatusMessage('');
      Alert.alert('Impresora USB', message);
    }
  };

  const handleSaleAndPrint = async () => {
    if (isProcessing) {
      return;
    }

    setProcessing(true);
    setStatusMessage('Procesando venta...');

    const salePayload: SalePayload = {
      saleId: `VENTA-${Date.now()}`,
      items: cartItems,
      total: saleTotal,
      createdAt: new Date().toISOString()
    };

    try {
      await apiService.sendSale(salePayload);
      await PrinterManager.printDoubleTicket(salePayload);
      setStatusMessage('Venta enviada e impresión completada.');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : `${error}`;
      setStatusMessage('');
      Alert.alert('Error en la venta', message);
    } finally {
      setProcessing(false);
    }
  };

  const handleTestPrint = async () => {
    if (isProcessing) {
      return;
    }

    setProcessing(true);
    setStatusMessage('Enviando impresión de prueba...');

    const testPayload: SalePayload = {
      saleId: `TEST-${Date.now()}`,
      items: [
        { id: 'demo-1', name: 'Ticket de prueba', qty: 1, total: 0 },
        { id: 'demo-2', name: 'Línea de ejemplo', qty: 2, total: 0 }
      ],
      total: 0,
      createdAt: new Date().toISOString()
    };

    try {
      await PrinterManager.printDoubleTicket(testPayload);
      setStatusMessage('Impresión de prueba enviada a ambas impresoras.');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : `${error}`;
      setStatusMessage('');
      Alert.alert('Impresión de prueba', message);
    } finally {
      setProcessing(false);
    }
  };

  const handleRefreshScreens = async () => {
    if (isRefreshingScreens) {
      return;
    }

    setRefreshingScreens(true);
    setStatusMessage('Buscando pantallas externas...');
    try {
      const results = await fetchExternalDisplays();
      setManualScreens(results);
      setStatusMessage(
        results.length
          ? `Se detectaron ${results.length} pantallas externas.`
          : 'No se detectaron pantallas externas.'
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : `${error}`;
      setStatusMessage('');
      Alert.alert('Pantallas externas', message);
    } finally {
      setRefreshingScreens(false);
    }
  };

  const handleCheckOverlayPermission = async () => {
    const granted = await checkOverlayPermission();
    setOverlayGranted(granted);
    setStatusMessage(
      granted
        ? 'Permiso de superposición concedido.'
        : 'Aún falta conceder el permiso de superposición.'
    );
  };

  const handleOpenOverlaySettings = async () => {
    await requestOverlayPermission();
    setStatusMessage('Abre los ajustes para permitir mostrar sobre otras apps.');
  };

  useEffect(() => {
    syncCustomerDisplay(cartItems, saleTotal, secondaryMode).catch(() => {
      // Silenciar errores de sincronización para no bloquear la UI principal.
    });
  }, [cartItems, saleTotal, secondaryMode]);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.leftPane}>
        <ScrollView
          contentContainerStyle={styles.leftPaneContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.heading}>iMin POS Demo</Text>
          <Text style={styles.description}>
            Conecta la impresora USB externa y ejecuta una venta para enviar la
            orden a ambas impresoras.
          </Text>
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>Pantalla de Cliente</Text>
            <Text
              style={[styles.statusSubtitle, isSecondaryReady ? styles.textSuccess : styles.textWarning]}
            >
              {isSecondaryReady
                ? `Enviando a: ${
                    resolvedScreen?.name ?? resolvedScreen?.id ?? 'Pantalla secundaria'
                  }`
                : screenOptions.length
                  ? 'Selecciona una pantalla secundaria disponible.'
                  : 'Esperando conexión de pantalla secundaria'}
            </Text>
            <Text style={styles.statusHint}>
              {screenOptions.length
                ? 'Usa la lista inferior para elegir qué pantalla utilizar.'
                : 'Conecta la pantalla secundaria física (HDMI/USB-C) y se detectará automáticamente.'}
            </Text>
            {supportsCustomerScreen && overlayGranted === false ? (
              <Text style={styles.statusHintWarning}>
                Otorga el permiso "Mostrar sobre otras apps" para habilitar la pantalla del cliente.
              </Text>
            ) : null}
            <View style={styles.toggleRow}>
              <Pressable
                style={[
                  styles.toggleButton,
                  styles.toggleButtonLeft,
                  secondaryMode === 'cart' && styles.toggleButtonActive
                ]}
                onPress={() => setSecondaryMode('cart')}
              >
                <Text
                  style={[
                    styles.toggleButtonText,
                    secondaryMode === 'cart' && styles.toggleButtonTextActive
                  ]}
                >
                  Carrito
                </Text>
              </Pressable>
              <Pressable
                style={[styles.toggleButton, secondaryMode === 'promo' && styles.toggleButtonActive]}
                onPress={() => setSecondaryMode('promo')}
              >
                <Text
                  style={[
                    styles.toggleButtonText,
                    secondaryMode === 'promo' && styles.toggleButtonTextActive
                  ]}
                >
                  Promoción
                </Text>
              </Pressable>
            </View>
            <Text style={styles.statusHintSmall}>
              Selecciona el contenido que se mostrará en la pantalla externa.
            </Text>
          </View>

        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Pantallas detectadas</Text>
          {screenOptions.length ? (
            <View style={styles.screenList}>
              {screenOptions.map(screen => {
                const screenLabel = screen.name ?? `Pantalla ${screen.id}`;
                const sizeLabel =
                  screen.width && screen.height
                    ? `${screen.width}×${screen.height}`
                    : 'Resolución desconocida';
                const isMain = screen.isMainScreen;
                const isSelected = screen.id === resolvedScreenId;
                return (
                  <Pressable
                    key={screen.id}
                    style={[
                      styles.screenItem,
                      isSelected && styles.screenItemActive,
                      isMain && styles.screenItemDisabled
                    ]}
                    onPress={() => {
                      if (isMain) {
                        return;
                      }
                      setSelectedScreenId(screen.id);
                      setStatusMessage(`Pantalla "${screenLabel}" seleccionada.`);
                    }}
                    disabled={isMain}
                  >
                    <Text style={styles.screenName}>{screenLabel}</Text>
                    <Text style={styles.screenMeta}>
                      {sizeLabel} • {isMain ? 'Principal' : 'Secundaria'}
                    </Text>
                    <Text style={styles.screenHint}>
                      {isMain
                        ? 'Pantalla principal del punto de venta'
                        : isSelected
                          ? 'Enviando contenido seleccionado'
                          : 'Toca para usar esta pantalla como cliente'}
                    </Text>
                    {'type' in screen && screen.type !== undefined ? (
                      <Text style={styles.screenExtra}>
                        Tipo {screen.type} • Flags {screen.flags ?? 0}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Text style={styles.statusHint}>
              No se detectaron pantallas externas. Conecta el display del cliente y verifica el cable.
            </Text>
          )}
          <Pressable
            style={[
              styles.secondaryAction,
              (isRefreshingScreens || isProcessing) && styles.secondaryActionDisabled
            ]}
            onPress={handleRefreshScreens}
            disabled={isRefreshingScreens || isProcessing}
          >
            <Text style={styles.secondaryActionText}>
              {isRefreshingScreens ? 'Buscando pantallas...' : 'Buscar pantallas externas'}
            </Text>
          </Pressable>
          {resolvedScreenId ? (
            <Pressable
              style={styles.secondaryAction}
              onPress={() => {
                setSelectedScreenId(null);
                setStatusMessage('Pantalla externa desactivada.');
              }}
            >
              <Text style={styles.secondaryActionText}>Dejar de usar pantalla externa</Text>
            </Pressable>
          ) : null}
          {supportsCustomerScreen && overlayGranted === false ? (
            <View style={styles.overlayActions}>
              <Pressable style={styles.secondaryAction} onPress={handleOpenOverlaySettings}>
                <Text style={styles.secondaryActionText}>Abrir ajustes de superposición</Text>
              </Pressable>
              <Pressable style={styles.secondaryAction} onPress={handleCheckOverlayPermission}>
                <Text style={styles.secondaryActionText}>Verificar permiso</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Impresoras USB detectadas</Text>
          {usbPrinters.length ? (
            <View style={styles.printerList}>
              {usbPrinters.map(printer => {
                const identifier = [printer.device_name, printer.manufacturer_name]
                  .filter(Boolean)
                  .join(' • ');
                return (
                  <View key={`${printer.vendor_id}-${printer.product_id}-${printer.serial_number ?? 'unknown'}`} style={styles.printerItem}>
                    <Text style={styles.printerName}>{identifier || 'Impresora USB'}</Text>
                    <Text style={styles.printerMeta}>
                      VID {printer.vendor_id ?? '??'} / PID {printer.product_id ?? '??'}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.statusHint}>
              {isListingPrinters
                ? 'Buscando impresoras conectadas...'
                : 'Pulsa "Buscar impresoras USB" para refrescar la lista.'}
            </Text>
          )}
        </View>

        <Pressable
          style={({ pressed }: { pressed: boolean }) => [
            styles.button,
            pressed && styles.buttonPressed,
            isListingPrinters && styles.buttonDisabled
          ]}
          onPress={handleRefreshUsbPrinters}
          disabled={isListingPrinters || isProcessing}
        >
          <Text style={styles.buttonText}>
            {isListingPrinters ? 'Buscando impresoras...' : 'Buscar impresoras USB'}
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }: { pressed: boolean }) => [
            styles.button,
            pressed && styles.buttonPressed,
            isProcessing && styles.buttonDisabled
          ]}
          onPress={handleTestPrint}
          disabled={isProcessing}
        >
          <Text style={styles.buttonText}>
            {isProcessing ? 'Procesando...' : 'Impresión de prueba'}
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }: { pressed: boolean }) => [
            styles.button,
            pressed && styles.buttonPressed,
            isUsbConnected && styles.buttonSuccess
          ]}
          onPress={handleConnectUsbPrinter}
          disabled={isProcessing}
        >
          <Text style={styles.buttonText}>
            {isUsbConnected ? 'USB conectada' : 'Conectar Impresora USB'}
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }: { pressed: boolean }) => [
            styles.button,
            pressed && styles.buttonPressed,
            isProcessing && styles.buttonDisabled
          ]}
          onPress={handleSaleAndPrint}
          disabled={isProcessing}
        >
          <Text style={styles.buttonText}>
            {isProcessing ? 'Procesando...' : 'Realizar Venta e Imprimir'}
          </Text>
        </Pressable>

        {!!statusMessage && <Text style={styles.toast}>{statusMessage}</Text>}
        </ScrollView>
      </View>

      <View style={styles.rightPane}>
        <CustomerDisplay externalScreenId={resolvedScreenId} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#0d0d0d'
  },
  leftPane: {
    flex: 0.45
  },
  leftPaneContent: {
    paddingHorizontal: 40,
    paddingVertical: 48,
    paddingBottom: 96
  },
  rightPane: {
    flex: 0.55,
    backgroundColor: '#000000'
  },
  heading: {
    fontSize: 28,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16
  },
  description: {
    fontSize: 16,
    color: '#b0b0b0',
    marginBottom: 24
  },
  statusCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#1f2937'
  },
  printerList: {
    marginTop: 12
  },
  printerItem: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1f2937'
  },
  printerName: {
    fontSize: 16,
    color: '#e5e7eb',
    marginBottom: 4
  },
  printerMeta: {
    fontSize: 13,
    color: '#9ca3af'
  },
  statusTitle: {
    fontSize: 18,
    color: '#d1d5db',
    marginBottom: 6,
    fontWeight: '600'
  },
  statusSubtitle: {
    fontSize: 16,
    color: '#9ca3af'
  },
  statusHint: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280'
  },
  statusHintWarning: {
    marginTop: 6,
    fontSize: 13,
    color: '#fbbf24'
  },
  statusHintSmall: {
    marginTop: 8,
    fontSize: 12,
    color: '#6b7280'
  },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#2563eb',
    marginBottom: 16
  },
  buttonPressed: {
    backgroundColor: '#1d4ed8'
  },
  buttonDisabled: {
    backgroundColor: '#1f2937'
  },
  buttonSuccess: {
    backgroundColor: '#16a34a'
  },
  buttonText: {
    color: '#ffffff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600'
  },
  toast: {
    marginTop: 16,
    color: '#fbbf24',
    fontSize: 14
  },
  textSuccess: {
    color: '#34d399'
  },
  textWarning: {
    color: '#fbbf24'
  },
  toggleRow: {
    flexDirection: 'row',
    marginTop: 16
  },
  toggleButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1f2937',
    paddingVertical: 12,
    backgroundColor: '#111827'
  },
  toggleButtonLeft: {
    marginRight: 12
  },
  toggleButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb'
  },
  toggleButtonText: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 15,
    fontWeight: '600'
  },
  toggleButtonTextActive: {
    color: '#ffffff'
  },
  screenList: {
    marginTop: 12
  },
  screenItem: {
    padding: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#1f2937',
    backgroundColor: '#0f172a',
    marginBottom: 12
  },
  screenItemActive: {
    borderColor: '#2563eb',
    backgroundColor: '#1d4ed8'
  },
  screenItemDisabled: {
    opacity: 0.6
  },
  screenName: {
    fontSize: 16,
    color: '#f9fafb',
    fontWeight: '600'
  },
  screenMeta: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 4
  },
  screenHint: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 8
  },
  screenExtra: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4
  },
  secondaryAction: {
    marginTop: 16,
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#2563eb'
  },
  secondaryActionDisabled: {
    opacity: 0.6
  },
  secondaryActionText: {
    color: '#60a5fa',
    fontSize: 14,
    fontWeight: '600'
  },
  overlayActions: {
    marginTop: 12
  }
});
