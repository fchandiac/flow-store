import { ResizeMode, Video } from 'expo-av';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

import useSecondaryDisplay from '../hooks/useSecondaryDisplay';
import { type RootStackParamList } from '../navigation/types';
import {
  fetchExternalDisplays,
  hasOverlayPermission,
  isCustomerScreenAvailable,
  requestOverlayPermission,
  type CustomerExternalDisplay,
} from '../services/customerScreenService';
import { loadDeviceSettings, updateDeviceSettings } from '../services/settingsStorage';
import {
  selectPreferredCustomerDisplayId,
  selectPromoMedia,
  selectPromoMediaEnabled,
  selectItemCount,
  usePosStore,
} from '../store/usePosStore';
import { palette } from '../theme/palette';

type SecondaryDisplaySettingsScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'SecondaryDisplaySettings'
>;

type RefreshOptions = {
  allowSelectionReset?: boolean;
  showError?: boolean;
};

const supportsCustomerScreen = isCustomerScreenAvailable;

const SecondaryDisplaySettingsScreen: React.FC<SecondaryDisplaySettingsScreenProps> = () => {
  const setPreferredCustomerDisplay = usePosStore((state) => state.setPreferredCustomerDisplay);
  const preferredCustomerDisplayId = usePosStore(selectPreferredCustomerDisplayId);
  const promoMediaEnabled = usePosStore(selectPromoMediaEnabled);
  const promoMedia = usePosStore(selectPromoMedia);
  const setPromoMediaEnabled = usePosStore((state) => state.setPromoMediaEnabled);
  const setPromoMedia = usePosStore((state) => state.setPromoMedia);
  const cartItemCount = usePosStore(selectItemCount);
  const { isConnected: isSecondaryConnected, screenId: activeScreenId } = useSecondaryDisplay();

  const [externalDisplays, setExternalDisplays] = useState<CustomerExternalDisplay[]>([]);
  const [isRefreshingDisplays, setIsRefreshingDisplays] = useState(false);
  const [overlayGranted, setOverlayGranted] = useState(false);
  const [isCheckingOverlay, setIsCheckingOverlay] = useState(false);
  const [isOpeningOverlaySettings, setIsOpeningOverlaySettings] = useState(false);
  const [selectedDisplayId, setSelectedDisplayId] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isProcessingMedia, setIsProcessingMedia] = useState(false);
  const [videoPreviewError, setVideoPreviewError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedDisplayId(preferredCustomerDisplayId ?? null);
  }, [preferredCustomerDisplayId]);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      try {
        const stored = await loadDeviceSettings();
        if (!isMounted) {
          return;
        }

        if (stored?.preferredCustomerDisplayId != null) {
          setPreferredCustomerDisplay(stored.preferredCustomerDisplayId ?? null);
        }

        if (stored?.promoMediaEnabled != null) {
          setPromoMediaEnabled(Boolean(stored.promoMediaEnabled));
        }

        if (stored?.promoMedia) {
          const exists = await FileSystem.getInfoAsync(stored.promoMedia.uri).then(
            (info: { exists: boolean }) => info.exists,
            () => false,
          );
          if (exists) {
            setPromoMedia(stored.promoMedia);
          } else {
            setPromoMedia(null);
            setPromoMediaEnabled(false);
            await updateDeviceSettings({ promoMedia: null, promoMediaEnabled: false });
          }
        }
      } catch (error) {
        console.warn('[SecondaryDisplaySettings] No se pudieron cargar los ajustes guardados', error);
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
  }, [setPreferredCustomerDisplay, setPromoMedia, setPromoMediaEnabled]);

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
          setPreferredCustomerDisplay(null);
          await updateDeviceSettings({
            preferredCustomerDisplayId: null,
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
    [selectedDisplayId, setPreferredCustomerDisplay],
  );

  useEffect(() => {
    if (isBootstrapping) {
      return;
    }

    void checkOverlayPermissionStatus();
    void refreshExternalDisplays();
  }, [checkOverlayPermissionStatus, refreshExternalDisplays, isBootstrapping]);

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
      setPreferredCustomerDisplay(display.id);
      await updateDeviceSettings({
        preferredCustomerDisplayId: display.id,
      });
    },
    [setPreferredCustomerDisplay],
  );

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

  const handleResetDisplayPreferences = useCallback(() => {
    Alert.alert('Restablecer pantalla', '¿Seguro que deseas borrar la configuración guardada?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Restablecer',
        style: 'destructive',
        onPress: async () => {
          setPreferredCustomerDisplay(null);
          setSelectedDisplayId(null);
          await updateDeviceSettings({
            preferredCustomerDisplayId: null,
          });
        },
      },
    ]);
  }, [setPreferredCustomerDisplay]);

  const handleTogglePromoMedia = useCallback(
    async (enabled: boolean) => {
      setPromoMediaEnabled(enabled);
      try {
        await updateDeviceSettings({ promoMediaEnabled: enabled });
      } catch (error) {
        console.warn('[SecondaryDisplaySettings] No se pudo actualizar promoMediaEnabled', error);
      }
    },
    [setPromoMediaEnabled],
  );

  const handleRemovePromoMedia = useCallback(() => {
    if (!promoMedia) {
      return;
    }

    Alert.alert('Eliminar multimedia', '¿Deseas quitar el archivo promocional actual?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await FileSystem.deleteAsync(promoMedia.uri, { idempotent: true });
          } catch (error) {
            console.warn('[SecondaryDisplaySettings] No se pudo eliminar el archivo existente', error);
          }

          setPromoMedia(null);
          setPromoMediaEnabled(false);
          try {
            await updateDeviceSettings({ promoMedia: null, promoMediaEnabled: false });
          } catch (error) {
            console.warn('[SecondaryDisplaySettings] No se pudo limpiar promoMedia en storage', error);
          }
        },
      },
    ]);
  }, [promoMedia, setPromoMedia, setPromoMediaEnabled]);

  const handleSelectPromoMedia = useCallback(async () => {
    if (isProcessingMedia) {
      return;
    }

    setIsProcessingMedia(true);
    setVideoPreviewError(null);

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'video/*'],
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];

      if (!asset?.uri) {
        Alert.alert('Selección inválida', 'No se pudo procesar el archivo elegido. Intenta nuevamente.');
        return;
      }

      const normalizedType = asset.mimeType?.startsWith('video/')
        ? 'video'
        : asset.mimeType?.startsWith('image/')
          ? 'image'
          : null;

      if (!normalizedType) {
        Alert.alert('Formato no soportado', 'Selecciona una imagen o un video compatible.');
        return;
      }

      const directory = `${FileSystem.documentDirectory ?? ''}promo-media`;
      await FileSystem.makeDirectoryAsync(directory, { intermediates: true });

      const rawName = asset.name ?? `promo-${Date.now()}`;
      const sanitizedName = rawName.replace(/[^A-Za-z0-9._-]/g, '_');
      const hasExtension = sanitizedName.includes('.');
      const fallbackExtension = normalizedType === 'video' ? 'mp4' : 'jpg';
      const finalName = hasExtension ? sanitizedName : `${sanitizedName}.${fallbackExtension}`;
      const targetUri = `${directory}/${Date.now()}-${finalName}`;

      await FileSystem.copyAsync({ from: asset.uri, to: targetUri });

      if (promoMedia?.uri && promoMedia.uri !== targetUri) {
        try {
          await FileSystem.deleteAsync(promoMedia.uri, { idempotent: true });
        } catch (error) {
          console.warn('[SecondaryDisplaySettings] No se pudo borrar el archivo promocional anterior', error);
        }
      }

      const storedAsset = {
        uri: targetUri,
        type: normalizedType,
        name: rawName,
        size: asset.size,
        updatedAt: new Date().toISOString(),
      } as const;

      setPromoMedia(storedAsset);
      setPromoMediaEnabled(true);
      await updateDeviceSettings({ promoMedia: storedAsset, promoMediaEnabled: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar el archivo promocional.';
      Alert.alert('Error al guardar', message);
      console.warn('[SecondaryDisplaySettings] Error al seleccionar multimedia', error);
    } finally {
      setIsProcessingMedia(false);
    }
  }, [isProcessingMedia, promoMedia, setPromoMedia, setPromoMediaEnabled]);

  useEffect(() => {
    setVideoPreviewError(null);
  }, [promoMedia?.uri]);

  const displaysListEmpty =
    overlayGranted && !isRefreshingDisplays && externalDisplays.length === 0 && supportsCustomerScreen;

  const statusMessage = useMemo(() => {
    if (!supportsCustomerScreen) {
      return 'Instala una versión compatible para habilitar la pantalla del cliente.';
    }

    return `Estado: ${isSecondaryConnected ? 'Conectada' : 'Sin conexión detectada'}`;
  }, [isSecondaryConnected]);

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
        <Text style={styles.cardTitle}>Pantalla del cliente</Text>
        <Text style={styles.cardSubtitle}>
          Selecciona la pantalla externa, concede permisos y define el modo de contenido que verá el cliente.
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

        <Text style={styles.infoText}>{statusMessage}</Text>

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
            style={[
              styles.actionButton,
              styles.secondaryButton,
              isRefreshingDisplays && styles.actionButtonDisabled,
            ]}
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
                  <Text style={styles.listItemTitle}>{display.name ?? `Pantalla ${display.id}`}</Text>
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
          <View style={styles.mediaHeader}>
            <Text style={styles.inputLabel}>Multimedia promocional</Text>
            <Switch
              value={promoMediaEnabled}
              onValueChange={handleTogglePromoMedia}
              thumbColor={promoMediaEnabled ? palette.primary : palette.border}
              trackColor={{ false: palette.divider, true: palette.primaryTint }}
              ios_backgroundColor={palette.divider}
            />
          </View>
          <Text style={styles.inputHint}>
            Cuando el carrito esté vacío, la pantalla secundaria mostrará esta multimedia.
          </Text>

          {promoMedia ? (
            <View style={styles.mediaCard}>
              <Text style={styles.mediaName}>{promoMedia.name}</Text>
              <Text style={styles.mediaMeta}>
                {promoMedia.type === 'video' ? 'Video' : 'Imagen'}
                {promoMedia.size ? ` · ${(promoMedia.size / (1024 * 1024)).toFixed(1)} MB` : ''}
              </Text>
              <View style={styles.mediaPreview}>
                {promoMedia.type === 'image' ? (
                  <Image source={{ uri: promoMedia.uri }} style={styles.mediaImage} resizeMode="contain" />
                ) : videoPreviewError ? (
                  <View style={styles.mediaVideoPlaceholder}>
                    <Text style={styles.mediaVideoText}>{videoPreviewError}</Text>
                  </View>
                ) : (
                  <Video
                    key={promoMedia.uri}
                    source={{ uri: promoMedia.uri }}
                    style={styles.mediaVideo}
                    resizeMode={ResizeMode.CONTAIN}
                    useNativeControls
                    shouldPlay={false}
                    isLooping
                    onError={(error) => {
                      setVideoPreviewError('No se pudo reproducir el video seleccionado.');
                      console.warn('[SecondaryDisplaySettings] Error al previsualizar video', error);
                    }}
                  />
                )}
              </View>
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.actionButton, isProcessingMedia && styles.actionButtonDisabled]}
                  activeOpacity={0.85}
                  onPress={handleSelectPromoMedia}
                  disabled={isProcessingMedia}
                >
                  {isProcessingMedia ? (
                    <ActivityIndicator color={palette.primaryStrong} />
                  ) : (
                    <Text style={styles.actionButtonLabel}>Cambiar archivo</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.dangerButton]}
                  activeOpacity={0.85}
                  onPress={handleRemovePromoMedia}
                  disabled={isProcessingMedia}
                >
                  <Text style={styles.actionButtonLabel}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={[styles.mediaCard, styles.mediaCardEmpty]}>
              <Text style={styles.mediaEmptyText}>
                No hay archivo promocional cargado. Selecciona una imagen o video desde el dispositivo.
              </Text>
              <TouchableOpacity
                style={[styles.actionButton, isProcessingMedia && styles.actionButtonDisabled]}
                activeOpacity={0.85}
                onPress={handleSelectPromoMedia}
                disabled={isProcessingMedia}
              >
                {isProcessingMedia ? (
                  <ActivityIndicator color={palette.primaryStrong} />
                ) : (
                  <Text style={styles.actionButtonLabel}>Seleccionar archivo</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.inputHint}>
            {cartItemCount > 0
              ? `Se mostrarán los datos de venta mientras el carrito tenga productos (${cartItemCount}).`
              : 'La multimedia se mostrará automáticamente mientras el carrito esté vacío.'}
          </Text>
        </View>

        <View style={styles.divider} />

        <TouchableOpacity
          style={[styles.actionButton, styles.dangerButton]}
          activeOpacity={0.85}
          onPress={handleResetDisplayPreferences}
        >
          <Text style={styles.actionButtonLabel}>Restablecer pantalla</Text>
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
  inputHint: {
    color: palette.textMuted,
    fontSize: 12,
    marginTop: 6,
    lineHeight: 16,
  },
  mediaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mediaCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  mediaCardEmpty: {
    alignItems: 'flex-start',
  },
  mediaName: {
    color: palette.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  mediaMeta: {
    color: palette.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  mediaPreview: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: palette.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
  },
  mediaImage: {
    width: '100%',
    height: 180,
  },
  mediaVideo: {
    width: '100%',
    height: 180,
    backgroundColor: palette.surfaceMuted,
  },
  mediaVideoPlaceholder: {
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  mediaVideoText: {
    color: palette.primaryStrong,
    fontWeight: '600',
    fontSize: 14,
  },
  mediaEmptyText: {
    color: palette.textMuted,
    fontSize: 13,
    marginBottom: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.divider,
    marginVertical: 24,
  },
});

export default SecondaryDisplaySettingsScreen;
