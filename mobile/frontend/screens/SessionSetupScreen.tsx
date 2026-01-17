import { useFocusEffect } from '@react-navigation/native';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
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
import { createCashSession, fetchPointsOfSale } from '../services/apiService';
import { RootStackParamList } from '../navigation/types';
import { usePosStore, type PointOfSaleSummary } from '../store/usePosStore';

export type SessionSetupScreenProps = NativeStackScreenProps<RootStackParamList, 'SessionSetup'>;

function SessionSetupScreen({ navigation }: SessionSetupScreenProps) {
  const user = usePosStore((state) => state.user);
  const setPointOfSale = usePosStore((state) => state.setPointOfSale);
  const setCashSession = usePosStore((state) => state.setCashSession);
  const cashSession = usePosStore((state) => state.cashSession);
  const pointOfSale = usePosStore((state) => state.pointOfSale);

  const [pointsOfSale, setPointsOfSale] = useState<PointOfSaleSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreating, setIsCreating] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    }
  }, [navigation, user]);

  useEffect(() => {
    if (user && pointOfSale && cashSession) {
      navigation.reset({ index: 0, routes: [{ name: 'Pos' }] });
    }
  }, [cashSession, navigation, pointOfSale, user]);

  const loadPointsOfSale = useCallback(async () => {
    if (!user) {
      return;
    }
    setIsLoading(true);
    try {
      const payload = await fetchPointsOfSale();
      setPointsOfSale(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudieron cargar las cajas.';
      Alert.alert('Error al cargar cajas', message);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const refreshPointsOfSale = useCallback(async () => {
    if (!user) {
      return;
    }
    setIsRefreshing(true);
    try {
      const payload = await fetchPointsOfSale();
      setPointsOfSale(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudieron cargar las cajas.';
      Alert.alert('Error al cargar cajas', message);
    } finally {
      setIsRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadPointsOfSale();
    }, [loadPointsOfSale]),
  );

  const handleSelectPointOfSale = async (selected: PointOfSaleSummary) => {
    if (!user) {
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      return;
    }
    setIsCreating(selected.id);
    try {
      const result = await createCashSession({
        userName: user.userName,
        pointOfSaleId: selected.id,
      });

      setPointOfSale(
        result.pointOfSale ?? {
          id: selected.id,
          name: selected.name,
          deviceId: selected.deviceId,
          branchId: selected.branchId,
          branchName: selected.branchName,
        },
      );
      setCashSession(result.session);

      navigation.navigate('Opening', {
        suggestedOpeningAmount: result.suggestedOpeningAmount ?? result.session.openingAmount,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo abrir la sesión de caja.';
      Alert.alert('Error al abrir sesión', message);
    } finally {
      setIsCreating(null);
    }
  };

  if (isLoading && !pointsOfSale.length) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#2563eb" size="large" />
        <Text style={styles.loadingText}>Cargando puntos de venta...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.root}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={refreshPointsOfSale} tintColor="#2563eb" />
      }
    >
      <Text style={styles.title}>Selecciona un punto de venta</Text>
      <Text style={styles.subtitle}>
        Abre una nueva sesión de caja para continuar con las ventas del día.
      </Text>
      {pointsOfSale.length ? (
        pointsOfSale.map((pos) => {
          const isBusy = isCreating === pos.id;
          return (
            <TouchableOpacity
              key={pos.id}
              activeOpacity={0.85}
              disabled={Boolean(isCreating)}
              onPress={() => handleSelectPointOfSale(pos)}
              style={[styles.posCard, isBusy && styles.posCardSelected]}
            >
              <View style={styles.posHeader}>
                <Text style={styles.posName}>{pos.name}</Text>
                {isBusy ? <ActivityIndicator color="#f8fafc" size="small" /> : null}
              </View>
              <Text style={styles.posMeta}>ID: {pos.id}</Text>
              {pos.branchName ? <Text style={styles.posMeta}>Sucursal: {pos.branchName}</Text> : null}
              {pos.deviceId ? <Text style={styles.posMeta}>Dispositivo: {pos.deviceId}</Text> : null}
            </TouchableOpacity>
          );
        })
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
    backgroundColor: '#0b1120',
    minHeight: '100%',
  },
  title: {
    fontSize: 24,
    color: '#f8fafc',
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0b1120',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#cbd5f5',
    fontSize: 16,
  },
  posCard: {
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#1f2937',
    backgroundColor: '#111827',
  },
  posCardSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#1d4ed8',
  },
  posHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  posName: {
    fontSize: 18,
    color: '#f8fafc',
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  posMeta: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 2,
  },
  emptyState: {
    marginTop: 64,
    padding: 24,
    borderRadius: 14,
    backgroundColor: '#111827',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#1f2937',
  },
  emptyTitle: {
    fontSize: 18,
    color: '#f8fafc',
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#2563eb',
  },
  retryButtonDisabled: {
    backgroundColor: '#1d4ed8',
  },
  retryButtonLabel: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default SessionSetupScreen;
