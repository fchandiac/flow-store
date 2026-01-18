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
import { formatCurrency } from '../utils/formatCurrency';
import { palette } from '../theme/palette';

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

  const initialAmount = useMemo(() => {
    if (!Number.isFinite(suggestedAmount)) {
      return null;
    }
    const rounded = Math.max(0, Math.round(suggestedAmount));
    return Number.isFinite(rounded) ? rounded : null;
  }, [suggestedAmount]);

  const [amountDigits, setAmountDigits] = useState(() =>
    initialAmount !== null ? String(initialAmount) : '',
  );
  const [amountValue, setAmountValue] = useState<number | null>(initialAmount);
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

  useEffect(() => {
    if (initialAmount !== null) {
      setAmountDigits(String(initialAmount));
      setAmountValue(initialAmount);
    }
  }, [initialAmount]);

  const formattedAmount = amountValue !== null ? formatCurrency(amountValue) : '—';

  const handleAmountChange = (raw: string) => {
    const digitsOnly = raw.replace(/[^0-9]/g, '');
    if (!digitsOnly) {
      setAmountDigits('');
      setAmountValue(null);
      return;
    }

    const numeric = Number.parseInt(digitsOnly, 10);
    if (Number.isNaN(numeric) || numeric < 0) {
      setAmountDigits('');
      setAmountValue(null);
      return;
    }

    setAmountDigits(digitsOnly);
    setAmountValue(numeric);
  };

  const handleConfirmOpening = async () => {
    if (!user || !session) {
      return;
    }
    if (amountValue === null) {
      Alert.alert('Monto inválido', 'Ingresa un monto de apertura válido.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await registerOpeningTransaction({
        cashSessionId: session.id,
        userName: user.userName,
        openingAmount: amountValue,
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
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
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
          keyboardType="number-pad"
          onChangeText={handleAmountChange}
          placeholder="Monto de apertura"
          placeholderTextColor={palette.textMuted}
          style={styles.input}
          value={amountDigits}
          editable={!isSubmitting}
        />
        <View style={styles.formattedRow}>
          <Text style={styles.formattedLabel}>Monto formateado:</Text>
          <Text style={styles.formattedValue}>{formattedAmount}</Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={isSubmitting}
          onPress={handleConfirmOpening}
          style={[styles.button, isSubmitting && styles.buttonDisabled]}
        >
          {isSubmitting ? (
            <ActivityIndicator color={palette.primaryText} />
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
    backgroundColor: palette.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: palette.surface,
    padding: 24,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
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
    marginBottom: 16,
  },
  meta: {
    fontSize: 13,
    color: palette.textMuted,
    marginBottom: 8,
  },
  input: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    color: palette.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: Platform.select({ ios: 14, default: 12 }),
    fontSize: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  formattedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  formattedLabel: {
    fontSize: 14,
    color: palette.textMuted,
  },
  formattedValue: {
    fontSize: 18,
    color: palette.primary,
    fontWeight: '700',
  },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: palette.primary,
  },
  buttonDisabled: {
    backgroundColor: palette.primaryStrong,
  },
  buttonLabel: {
    color: palette.primaryText,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default OpeningScreen;
