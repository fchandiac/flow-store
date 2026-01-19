import { useIsFocused } from '@react-navigation/native';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { registerCashDeposit } from '../services/apiService';
import { type RootStackParamList } from '../navigation/types';
import { usePosStore } from '../store/usePosStore';
import { palette } from '../theme/palette';
import { formatCurrency } from '../utils/formatCurrency';
import { sanitizeCashAccountMessage } from '../utils/sanitizeCashAccountMessage';

export type CashIncomeScreenProps = NativeStackScreenProps<RootStackParamList, 'CashIncome'>;

function CashIncomeScreen({ navigation }: CashIncomeScreenProps) {
  const isFocused = useIsFocused();
  const loginRedirectRef = useRef(false);
  const setupRedirectRef = useRef(false);
  const amountInputRef = useRef<TextInput>(null);
  const user = usePosStore((state) => state.user);
  const pointOfSale = usePosStore((state) => state.pointOfSale);
  const session = usePosStore((state) => state.cashSession);
  const updateExpectedAmount = usePosStore((state) => state.updateCashSessionExpectedAmount);

  const currentExpectedAmount = useMemo(() => {
    if (!session) {
      return 0;
    }
    const base = session.expectedAmount ?? session.openingAmount ?? 0;
    return Number.isFinite(base) ? Number(base) : 0;
  }, [session]);

  const [amountDigits, setAmountDigits] = useState('0');
  const [amountValue, setAmountValue] = useState(0);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const syncCaretToEnd = useCallback((raw: string | number) => {
    const normalizedInput = typeof raw === 'number' ? String(Math.max(0, Math.round(raw))) : raw;
    const digits = normalizedInput.replace(/[^0-9]/g, '');
    const sanitizedDigits = digits.replace(/^0+(?=\d)/, '') || '0';
    const numeric = Number.parseInt(sanitizedDigits, 10);
    const formatted = Number.isFinite(numeric) ? formatCurrency(numeric) : '$0';
    const length = formatted.length;
    setTimeout(() => {
      amountInputRef.current?.setNativeProps({ selection: { start: length, end: length } });
    }, 0);
  }, []);

  const formattedAmount = useMemo(() => {
    const digits = amountDigits.replace(/[^0-9]/g, '');
    const sanitized = digits.replace(/^0+(?=\d)/, '') || '0';
    const numeric = Number.parseInt(sanitized, 10);
    if (!Number.isFinite(numeric)) {
      return '$0';
    }
    return formatCurrency(numeric);
  }, [amountDigits]);

  const projectedExpectedAmount = useMemo(() => {
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      return null;
    }
    return currentExpectedAmount + amountValue;
  }, [amountValue, currentExpectedAmount]);

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

    if (!session || !pointOfSale) {
      if (!setupRedirectRef.current) {
        setupRedirectRef.current = true;
        navigation.reset({ index: 0, routes: [{ name: 'SessionSetup' }] });
      }
      return;
    }

    setupRedirectRef.current = false;
  }, [isFocused, navigation, pointOfSale, session, user]);

  const handleAmountChange = (rawInput: string) => {
    const digits = rawInput.replace(/[^0-9]/g, '');
    if (!digits) {
      setAmountDigits('0');
      setAmountValue(0);
      syncCaretToEnd(0);
      return;
    }

    const sanitized = digits.replace(/^0+(?=\d)/, '') || '0';
    const numeric = Number.parseInt(sanitized, 10);
    if (Number.isNaN(numeric) || numeric < 0) {
      setAmountDigits('0');
      setAmountValue(0);
      syncCaretToEnd(0);
      return;
    }

    setAmountDigits(sanitized);
    setAmountValue(numeric);
    syncCaretToEnd(numeric);
  };

  const handleReasonChange = (value: string) => {
    setReason(value);
    if (reasonError) {
      setReasonError(null);
    }
  };

  const handleSubmit = async () => {
    if (!user || !pointOfSale || !session) {
      Alert.alert('Sesión requerida', 'Inicia sesión y abre la caja antes de registrar ingresos.');
      return;
    }

    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      Alert.alert('Monto inválido', 'Ingresa un monto de ingreso válido.');
      return;
    }

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setReasonError('El motivo es obligatorio.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await registerCashDeposit({
        userName: user.userName,
        pointOfSaleId: pointOfSale.id,
        cashSessionId: session.id,
        amount: amountValue,
        reason: trimmedReason,
      });

      updateExpectedAmount(result.expectedAmount);
      Alert.alert(
        'Ingreso registrado',
        `Documento ${result.transaction.documentNumber} por ${formatCurrency(result.transaction.total)}.`,
      );
      navigation.goBack();
    } catch (error) {
      const rawMessage =
        error instanceof Error ? error.message : 'No se pudo registrar el ingreso de dinero.';
      const message = sanitizeCashAccountMessage(rawMessage);
      Alert.alert('Error al registrar ingreso', message);
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
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <View style={styles.card}>
          <Text style={styles.title}>Registrar ingreso de dinero</Text>
          <Text style={styles.subtitle}>
            Ingresa el monto recibido y describe el motivo para dejar registro en la caja.
          </Text>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Saldo esperado actual</Text>
            <Text style={styles.infoValue}>{formatCurrency(currentExpectedAmount)}</Text>
            {projectedExpectedAmount !== null ? (
              <Text style={styles.infoHint}>
                Saldo proyectado después del ingreso: {formatCurrency(projectedExpectedAmount)}
              </Text>
            ) : null}
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Monto</Text>
            <TextInput
              ref={amountInputRef}
              keyboardType={Platform.select({ android: 'numeric', default: 'number-pad' })}
              inputMode="numeric"
              onChangeText={handleAmountChange}
              placeholder="$0"
              placeholderTextColor={palette.textMuted}
              style={styles.input}
              value={formattedAmount}
              editable={!isSubmitting}
              onFocus={() => syncCaretToEnd(amountDigits)}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Motivo</Text>
            <TextInput
              multiline
              numberOfLines={3}
              onChangeText={handleReasonChange}
              placeholder="Describe el motivo del ingreso"
              placeholderTextColor={palette.textMuted}
              style={[styles.input, styles.textArea, reasonError ? styles.inputError : null]}
              value={reason}
              editable={!isSubmitting}
            />
            {reasonError ? <Text style={styles.errorText}>{reasonError}</Text> : null}
          </View>
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={isSubmitting}
            onPress={handleSubmit}
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          >
            {isSubmitting ? (
              <ActivityIndicator color={palette.primaryText} />
            ) : (
              <Text style={styles.submitLabel}>Registrar ingreso</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 24,
    alignItems: 'center',
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
    fontSize: 22,
    fontWeight: '700',
    color: palette.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: palette.textMuted,
    marginBottom: 20,
  },
  infoBlock: {
    marginBottom: 20,
  },
  infoLabel: {
    fontSize: 12,
    color: palette.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.primary,
  },
  infoHint: {
    fontSize: 12,
    color: palette.textMuted,
    marginTop: 4,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.textSecondary,
    marginBottom: 6,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    color: palette.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: Platform.select({ ios: 14, default: 12 }),
    fontSize: 16,
  },
  textArea: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: palette.error,
  },
  errorText: {
    marginTop: 6,
    color: palette.error,
    fontSize: 13,
  },
  submitButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: palette.primary,
  },
  submitButtonDisabled: {
    backgroundColor: palette.primaryStrong,
  },
  submitLabel: {
    color: palette.primaryText,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CashIncomeScreen;
