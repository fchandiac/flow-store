import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  createCashSession,
  fetchActiveCashSession,
  fetchPointsOfSale,
  type CashSessionOwnerSummary,
} from '../services/apiService';
import { RootStackParamList } from '../navigation/types';
import { usePosStore, type CashSessionSummary, type PointOfSaleSummary } from '../store/usePosStore';
import { formatCurrency } from '../utils/formatCurrency';
import { palette } from '../theme/palette';

export type SessionSetupScreenProps = NativeStackScreenProps<RootStackParamList, 'SessionSetup'>;

function formatDateTimeLabel(value: string): string {
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString('es-CL', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch (error) {
    return value;
  }
}

function SessionSetupScreen({ navigation }: SessionSetupScreenProps) {
  const isFocused = useIsFocused();
  const loginRedirectRef = useRef(false);
  const posRedirectRef = useRef(false);
  const user = usePosStore((state) => state.user);
  const setUser = usePosStore((state) => state.setUser);
  const setPointOfSale = usePosStore((state) => state.setPointOfSale);
  const setCashSession = usePosStore((state) => state.setCashSession);
  const cashSession = usePosStore((state) => state.cashSession);
  const pointOfSale = usePosStore((state) => state.pointOfSale);

  const [pointsOfSale, setPointsOfSale] = useState<PointOfSaleSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPointOfSaleId, setSelectedPointOfSaleId] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<CashSessionSummary | null>(null);
  const [openedByUser, setOpenedByUser] = useState<CashSessionOwnerSummary | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  const selectedPointOfSale = useMemo(
    () => pointsOfSale.find((pos) => pos.id === selectedPointOfSaleId) ?? null,
    [pointsOfSale, selectedPointOfSaleId],
  );
  const sessionRequestRef = useRef(0);

  const handleLogout = useCallback(() => {
    Alert.alert('Cerrar sesión', '¿Deseas salir de la sesión actual?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: () => {
          setUser(null);
          setPointOfSale(null);
          setCashSession(null);
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        },
      },
    ]);
  }, [navigation, setCashSession, setPointOfSale, setUser]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={handleLogout}
          style={styles.headerButton}
          accessibilityLabel="Cerrar sesión"
          accessibilityRole="button"
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <Ionicons name="log-out-outline" size={22} color="#000000" />
        </TouchableOpacity>
      ),
    });
  }, [handleLogout, navigation]);

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
  }, [isFocused, navigation, user]);

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    if (!user || !pointOfSale || !cashSession) {
      posRedirectRef.current = false;
      return;
    }

    if (cashSession.status !== 'OPEN') {
      posRedirectRef.current = false;
      return;
    }

    if (cashSession.openingAmount > 0) {
      if (!posRedirectRef.current) {
        posRedirectRef.current = true;
        navigation.reset({ index: 0, routes: [{ name: 'Pos' }] });
      }
    } else {
      posRedirectRef.current = false;
    }
  }, [cashSession?.id, cashSession?.openingAmount, cashSession?.status, isFocused, navigation, pointOfSale, user]);

  const loadPointsOfSale = useCallback(async () => {
    if (!user) {
      return;
    }
    setIsLoading(true);
    try {
      const payload = await fetchPointsOfSale();
      setPointsOfSale(payload);
      if (!payload.some((pos) => pos.id === selectedPointOfSaleId)) {
        setSelectedPointOfSaleId(null);
        setActiveSession(null);
        setOpenedByUser(null);
        setSessionError(null);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudieron cargar las cajas.';
      Alert.alert('Error al cargar cajas', message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedPointOfSaleId, user]);

  const refreshPointsOfSale = useCallback(async () => {
    if (!user) {
      return;
    }
    setIsRefreshing(true);
    try {
      const payload = await fetchPointsOfSale();
      setPointsOfSale(payload);
      if (!payload.some((pos) => pos.id === selectedPointOfSaleId)) {
        setSelectedPointOfSaleId(null);
        setActiveSession(null);
        setOpenedByUser(null);
        setSessionError(null);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudieron cargar las cajas.';
      Alert.alert('Error al cargar cajas', message);
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedPointOfSaleId, user]);

  useFocusEffect(
    useCallback(() => {
      loadPointsOfSale();
    }, [loadPointsOfSale]),
  );

  const handleSelectPointOfSale = useCallback(
    async (selected: PointOfSaleSummary) => {
      if (!user) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }

      setSelectedPointOfSaleId(selected.id);
      setActiveSession(null);
      setOpenedByUser(null);
      setSessionError(null);

      const requestId = sessionRequestRef.current + 1;
      sessionRequestRef.current = requestId;
      setIsSessionLoading(true);

      try {
        const result = await fetchActiveCashSession(selected.id);
        if (sessionRequestRef.current !== requestId) {
          return;
        }
        setActiveSession(result.session);
        setOpenedByUser(result.openedByUser);
      } catch (error) {
        if (sessionRequestRef.current !== requestId) {
          return;
        }
        const message = error instanceof Error ? error.message : 'No se pudo revisar la sesión de caja.';
        setSessionError(message);
      } finally {
        if (sessionRequestRef.current === requestId) {
          setIsSessionLoading(false);
        }
      }
    },
    [navigation, user],
  );

  const handleOpenNewSession = useCallback(async () => {
    if (!user) {
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      return;
    }

    if (!selectedPointOfSale) {
      Alert.alert('Selecciona un punto de venta', 'Elige un punto de venta antes de abrir la sesión.');
      return;
    }

    setIsCreatingSession(true);
    setSessionError(null);
    try {
      const result = await createCashSession({
        userName: user.userName,
        pointOfSaleId: selectedPointOfSale.id,
      });

      setPointOfSale(
        result.pointOfSale ?? {
          id: selectedPointOfSale.id,
          name: selectedPointOfSale.name,
          deviceId: selectedPointOfSale.deviceId,
          branchId: selectedPointOfSale.branchId,
          branchName: selectedPointOfSale.branchName,
        },
      );
      setCashSession(result.session);

      navigation.navigate('Opening', {
        suggestedOpeningAmount: result.suggestedOpeningAmount ?? result.session.openingAmount,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo abrir la sesión de caja.';
      Alert.alert('Error al abrir sesión', message);
      if (selectedPointOfSale) {
        await handleSelectPointOfSale(selectedPointOfSale);
      }
    } finally {
      setIsCreatingSession(false);
    }
  }, [handleSelectPointOfSale, navigation, selectedPointOfSale, setCashSession, setPointOfSale, user]);

  const handleResumeSession = useCallback(() => {
    if (!user) {
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      return;
    }

    if (!selectedPointOfSale || !activeSession) {
      return;
    }

    if (activeSession.status !== 'OPEN') {
      Alert.alert(
        'Sesión inactiva',
        'La sesión seleccionada ya fue cerrada. Actualiza la lista para continuar.',
      );
      return;
    }

    setPointOfSale({
      id: selectedPointOfSale.id,
      name: selectedPointOfSale.name,
      deviceId: selectedPointOfSale.deviceId,
      branchId: selectedPointOfSale.branchId,
      branchName: selectedPointOfSale.branchName,
    });
    setCashSession(activeSession);
    if (activeSession.openingAmount > 0) {
      navigation.reset({ index: 0, routes: [{ name: 'Pos' }] });
    } else {
      navigation.navigate('Opening', {
        suggestedOpeningAmount: activeSession.openingAmount,
      });
    }
  }, [activeSession, navigation, selectedPointOfSale, setCashSession, setPointOfSale, user]);

  const isSessionOwner = Boolean(activeSession && user?.id && activeSession.openedById === user.id);
  const openedAtLabel = activeSession ? formatDateTimeLabel(activeSession.openedAt) : null;
  const sessionOwnerName = openedByUser
    ? (openedByUser.personName?.trim() ? openedByUser.personName : openedByUser.userName)
    : null;

  if (isLoading && !pointsOfSale.length) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={palette.primary} size="large" />
        <Text style={styles.loadingText}>Cargando puntos de venta...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.root}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={refreshPointsOfSale} tintColor={palette.primary} />
      }
    >
      <Text style={styles.title}>Selecciona un punto de venta</Text>
      <Text style={styles.subtitle}>
        Elige un punto de venta para continuar con una sesión existente o abrir una nueva.
      </Text>
      {pointsOfSale.length ? (
        <>
          {pointsOfSale.map((pos) => {
            const isSelected = selectedPointOfSaleId === pos.id;
            return (
              <TouchableOpacity
                key={pos.id}
                activeOpacity={0.85}
                disabled={isCreatingSession}
                onPress={() => handleSelectPointOfSale(pos)}
                style={[styles.posCard, isSelected && styles.posCardSelected]}
              >
                <View style={styles.posHeader}>
                  <Text style={styles.posName}>{pos.name}</Text>
                  {isSelected && isSessionLoading ? <ActivityIndicator color={palette.primary} size="small" /> : null}
                </View>
                <Text style={styles.posMeta}>ID: {pos.id}</Text>
                {pos.branchName ? <Text style={styles.posMeta}>Sucursal: {pos.branchName}</Text> : null}
                {pos.deviceId ? <Text style={styles.posMeta}>Dispositivo: {pos.deviceId}</Text> : null}
              </TouchableOpacity>
            );
          })}
          {selectedPointOfSale ? (
            <View style={styles.sessionCard}>
              <Text style={styles.sessionTitle}>Resumen de sesión</Text>
              <Text style={styles.sessionMeta}>{selectedPointOfSale.name}</Text>
              {selectedPointOfSale.branchName ? (
                <Text style={styles.sessionMeta}>Sucursal: {selectedPointOfSale.branchName}</Text>
              ) : null}
              {isSessionLoading ? (
                <View style={styles.sessionLoadingRow}>
                  <ActivityIndicator color={palette.primary} size="small" />
                  <Text style={styles.sessionLoadingText}>Revisando sesión abierta...</Text>
                </View>
              ) : sessionError ? (
                <>
                  <Text style={styles.sessionWarning}>{sessionError}</Text>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => handleSelectPointOfSale(selectedPointOfSale)}
                    style={styles.sessionButtonSecondary}
                  >
                    <Text style={styles.sessionButtonSecondaryLabel}>Intentar nuevamente</Text>
                  </TouchableOpacity>
                </>
              ) : activeSession ? (
                <>
                  {openedAtLabel ? <Text style={styles.sessionStatus}>Sesión activa desde {openedAtLabel}</Text> : null}
                  {sessionOwnerName ? (
                    <Text style={styles.sessionInfo}>Abierta por {sessionOwnerName}</Text>
                  ) : null}
                  <Text style={styles.sessionInfo}>
                    Monto de apertura registrado: {formatCurrency(activeSession.openingAmount ?? 0)}
                  </Text>
                  {isSessionOwner ? (
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={handleResumeSession}
                      style={[styles.sessionButton, styles.sessionButtonPrimary]}
                    >
                      <Text style={styles.sessionButtonLabel}>Continuar con la sesión</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.sessionWarning}>
                      {sessionOwnerName
                        ? `La sesión abierta pertenece a ${sessionOwnerName}. Solicita el cierre antes de continuar.`
                        : 'La sesión abierta pertenece a otro usuario.'}
                    </Text>
                  )}
                </>
              ) : (
                <>
                  <Text style={styles.sessionInfo}>
                    No hay una sesión activa en este punto de venta. Abre una nueva para comenzar.
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    disabled={isCreatingSession}
                    onPress={handleOpenNewSession}
                    style={[
                      styles.sessionButton,
                      styles.sessionButtonPrimary,
                      isCreatingSession && styles.sessionButtonDisabled,
                    ]}
                  >
                    {isCreatingSession ? (
                      <ActivityIndicator color={palette.primaryText} />
                    ) : (
                      <Text style={styles.sessionButtonLabel}>Abrir nueva sesión</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          ) : (
            <View style={styles.sessionPlaceholder}>
              <Text style={styles.sessionPlaceholderText}>
                Selecciona un punto de venta para revisar o abrir su sesión de caja.
              </Text>
            </View>
          )}
        </>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No hay puntos de venta disponibles.</Text>
          <Text style={styles.emptySubtitle}>Refresca la lista o verifica la configuración.</Text>
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={isRefreshing}
            onPress={refreshPointsOfSale}
            style={[styles.retryButton, isRefreshing && styles.retryButtonDisabled]}
          >
            <Text style={styles.retryButtonLabel}>
              {isRefreshing ? 'Actualizando...' : 'Intentar de nuevo'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: palette.background,
    minHeight: '100%',
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    color: palette.primary,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: palette.textMuted,
    marginBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: palette.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: palette.textMuted,
    fontSize: 16,
  },
  posCard: {
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  posCardSelected: {
    borderColor: palette.primary,
    backgroundColor: palette.surfaceMuted,
  },
  posHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  posName: {
    fontSize: 18,
    color: palette.textSecondary,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  posMeta: {
    fontSize: 13,
    color: palette.textMuted,
    marginBottom: 2,
  },
  sessionCard: {
    marginTop: 4,
    marginBottom: 24,
    padding: 18,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  sessionTitle: {
    fontSize: 16,
    color: palette.textSecondary,
    fontWeight: '600',
    marginBottom: 6,
  },
  sessionMeta: {
    fontSize: 13,
    color: palette.textMuted,
    marginBottom: 2,
  },
  sessionLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  sessionLoadingText: {
    marginLeft: 8,
    color: palette.textMuted,
    fontSize: 13,
  },
  sessionInfo: {
    marginTop: 12,
    fontSize: 13,
    color: palette.textMuted,
  },
  sessionStatus: {
    marginTop: 12,
    fontSize: 14,
    color: palette.primary,
    fontWeight: '600',
  },
  sessionWarning: {
    marginTop: 12,
    fontSize: 13,
    color: palette.error,
  },
  sessionButton: {
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  sessionButtonPrimary: {
    backgroundColor: palette.primary,
  },
  sessionButtonDisabled: {
    backgroundColor: palette.primaryStrong,
  },
  sessionButtonLabel: {
    color: palette.primaryText,
    fontSize: 15,
    fontWeight: '600',
  },
  sessionButtonSecondary: {
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.primary,
    backgroundColor: 'transparent',
  },
  sessionButtonSecondaryLabel: {
    color: palette.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  sessionPlaceholder: {
    marginTop: 4,
    marginBottom: 24,
    padding: 18,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  sessionPlaceholderText: {
    fontSize: 13,
    color: palette.textMuted,
  },
  emptyState: {
    marginTop: 64,
    padding: 24,
    borderRadius: 14,
    backgroundColor: palette.surface,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  emptyTitle: {
    fontSize: 18,
    color: palette.textSecondary,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: palette.textMuted,
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: palette.primary,
  },
  retryButtonDisabled: {
    backgroundColor: palette.primaryStrong,
  },
  retryButtonLabel: {
    color: palette.primaryText,
    fontSize: 15,
    fontWeight: '600',
  },
});

export default SessionSetupScreen;
