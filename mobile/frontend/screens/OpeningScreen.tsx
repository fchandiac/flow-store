import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { registerOpeningTransaction } from '../services/apiService';
import { RootStackParamList } from '../navigation/types';
import { usePosStore } from '../store/usePosStore';

export type OpeningScreenProps = NativeStackScreenProps<RootStackParamList, 'Opening'>;

function OpeningScreen({ navigation, route }: OpeningScreenProps) {
  const user = usePosStore((state) => state.user);
  const session = usePosStore((state) => state.cashSession);
  const setCashSession = usePosStore((state) => state.setCashSession);
  const pointOfSale = usePosStore((state) => state.pointOfSale);

  const suggestedAmount = useMemo(() => {
    if (route.params?.suggestedOpeningAmount !== undefined) {
      return route.params.suggestedOpeningAmount;
    }
    return session?.openingAmount ?? 0;
  }, [route.params?.suggestedOpeningAmount, session?.openingAmount]);

  const [amountInput, setAmountInput] = useState(() =>
    suggestedAmount ? String(Number(suggestedAmount.toFixed(2))) : '',
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      return;
    }
    if (!session || !pointOfSale) {
      navigation.reset({ index: 0, routes: [{ name: 'SessionSetup' }] });
    }
  }, [navigation, pointOfSale, session, user]);

  const handleConfirmOpening = async () => {
    if (!user || !session) {
      return;
    }
    const normalized = Number.parseFloat(amountInput.replace(',', '.'));
    if (!Number.isFinite(normalized) || normalized < 0) {
      Alert.alert('Monto inválido', 'Ingresa un monto de apertura válido.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await registerOpeningTransaction({
        cashSessionId: session.id,
        userName: user.userName,
        openingAmount: Number(normalized.toFixed(2)),
      });
      setCashSession(result.session);
      Alert.alert('Sesión abierta', 'El monto de apertura fue registrado.');
      navigation.reset({ index: 0, routes: [{ name: 'Pos' }] });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo registrar la apertura.';
      Alert.alert('Error al registrar apertura', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      style={styles.root}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Registrar apertura</Text>
        <Text style={styles.subtitle}>
          Define el monto inicial disponible en la caja antes de iniciar las ventas.
        </Text>
        {pointOfSale ? <Text style={styles.meta}>Punto de venta: {pointOfSale.name}</Text> : null}
        {session ? <Text style={styles.meta}>Sesión: {session.id}</Text> : null}
        <TextInput
          keyboardType="decimal-pad"
          onChangeText={setAmountInput}
          placeholder="Monto de apertura"
          placeholderTextColor="#6b7280"
          style={styles.input}
          value={amountInput}
          editable={!isSubmitting}
        />
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={isSubmitting}
          onPress={handleConfirmOpening}
          style={[styles.button, isSubmitting && styles.buttonDisabled]}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#f8fafc" />
          ) : (
            <Text style={styles.buttonLabel}>Confirmar apertura</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#111827',
    padding: 24,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#1f2937',
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
    marginBottom: 16,
  },
  meta: {
    fontSize: 13,
    color: '#cbd5f5',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
    backgroundColor: '#0b1120',
    color: '#f8fafc',
    paddingHorizontal: 14,
    paddingVertical: Platform.select({ ios: 14, default: 12 }),
    fontSize: 16,
    marginTop: 8,
    marginBottom: 20,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#22c55e',
  },
  buttonDisabled: {
    backgroundColor: '#15803d',
  },
  buttonLabel: {
    color: '#042f2e',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default OpeningScreen;
