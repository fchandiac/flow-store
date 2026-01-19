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
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { type NativeStackNavigationProp } from '@react-navigation/native-stack';

import { closeCashSession } from '../services/apiService';
import { formatCurrency } from '../utils/formatCurrency';
import { usePosStore } from '../store/usePosStore';
import { type RootStackParamList } from '../navigation/types';
import { palette } from '../theme/palette';

const MIN_NOTE_LENGTH = 3;

type ClosingNavigation = NativeStackNavigationProp<RootStackParamList, 'CashClosing'>;
type AmountField =
  | 'actualCash'
  | 'voucherDebit'
  | 'voucherCredit'
  | 'transfer'
  | 'check'
  | 'other';
type CashClosingState = Record<AmountField, string> & { notes: string };

type FieldOffsets = Partial<Record<AmountField | 'notes', number>>;
type AmountInputRefs = Partial<Record<AmountField, TextInput | null>>;

const INITIAL_STATE: CashClosingState = {
  actualCash: '',
  voucherDebit: '',
  voucherCredit: '',
  transfer: '',
  check: '',
  other: '',
  notes: '',
};

const normalizeDigits = (value: string): string => value.replace(/[^0-9]/g, '');

const formatDigitsValue = (digits: string): string => {
  if (!digits) {
    return '';
  }
  const numeric = Number(digits);
  if (!Number.isFinite(numeric)) {
    return '';
  }
  return formatCurrency(numeric);
};

const sanitizeAmount = (digits: string): number => {
  if (!digits) {
    return 0;
  }
  const parsed = Number(digits);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return parsed;
};

export default function CashClosingScreen(): JSX.Element {
  const navigation = useNavigation<ClosingNavigation>();
  const isFocused = useIsFocused();
  const scrollRef = useRef<ScrollView | null>(null);
  const formCardOffsetRef = useRef(0);
  const fieldOffsetsRef = useRef<FieldOffsets>({});
  const amountInputRefs = useRef<AmountInputRefs>({});
  const loginRedirectRef = useRef(false);
  const setupRedirectRef = useRef(false);
  const pendingLogoutRef = useRef(false);

  const user = usePosStore((state) => state.user);
  const pointOfSale = usePosStore((state) => state.pointOfSale);
  const session = usePosStore((state) => state.cashSession);
  const clearCart = usePosStore((state) => state.clearCart);
  const setCashSession = usePosStore((state) => state.setCashSession);
  const setUser = usePosStore((state) => state.setUser);

  const [form, setForm] = useState<CashClosingState>(INITIAL_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [closingError, setClosingError] = useState<string | null>(null);
  const [closingResult, setClosingResult] = useState<{
    actual: BreakdownInput;
    expected: BreakdownInput;
    varianceCash: number;
    totalVariance: number;
  } | null>(null);

  const completeLogout = useCallback(() => {
    if (pendingLogoutRef.current) {
      return;
    }

    pendingLogoutRef.current = true;
    clearCart();
    setUser(null);
  }, [clearCart, setUser]);

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

    if (!pointOfSale || !session) {
      if (!setupRedirectRef.current) {
        setupRedirectRef.current = true;
        navigation.reset({ index: 0, routes: [{ name: 'SessionSetup' }] });
      }
      return;
    }

    if (session.status !== 'OPEN' && !closingResult) {
      if (!setupRedirectRef.current) {
        setupRedirectRef.current = true;
        navigation.reset({ index: 0, routes: [{ name: 'SessionSetup' }] });
      }
      return;
    }

    setupRedirectRef.current = false;
    pendingLogoutRef.current = false;
  }, [closingResult, isFocused, navigation, pointOfSale, session, user]);

  useEffect(() => {
    if (!closingResult || !isFocused) {
      return;
    }

    const timeoutId = setTimeout(() => {
      completeLogout();
    }, 1800);

    return () => clearTimeout(timeoutId);
  }, [closingResult, completeLogout, isFocused]);

  const setFieldOffset = (field: AmountField | 'notes', y: number) => {
    fieldOffsetsRef.current[field] = y;
  };

  const scrollToField = (field: AmountField | 'notes') => {
    const offset = fieldOffsetsRef.current[field];
    if (typeof offset !== 'number') {
      return;
    }

    const target = formCardOffsetRef.current + offset;
    scrollRef.current?.scrollTo({ y: Math.max(target - 40, 0), animated: true });
  };

  const syncCaretToEnd = (field: AmountField, digits: string) => {
    const formatted = formatDigitsValue(digits);
    const length = formatted.length;

    requestAnimationFrame(() => {
      amountInputRefs.current[field]?.setNativeProps({
        selection: { start: length, end: length },
      });
    });
  };

  const handleAmountDigitsChange = (field: AmountField, rawInput: string) => {
    const normalized = normalizeDigits(rawInput);
    setForm((current) => {
      if (current[field] === normalized) {
        return current;
      }
      return { ...current, [field]: normalized };
    });

    syncCaretToEnd(field, normalized);

    if (closingError) {
      setClosingError(null);
    }
  };

  const handleAmountFocus = (field: AmountField) => {
    syncCaretToEnd(field, form[field]);
    scrollToField(field);
  };

  const handleNotesChange = (value: string) => {
    setForm((current) => ({ ...current, notes: value }));
    if (closingError) {
      setClosingError(null);
    }
  };

  const handleSubmit = () => {
    if (!user || !pointOfSale || !session) {
      setClosingError('No se detectó la sesión actual. Vuelve a iniciar sesión.');
      return;
    }

    const actualCash = sanitizeAmount(form.actualCash);
    if (actualCash < 0) {
      setClosingError('El efectivo contado no puede ser negativo.');
      return;
    }

    const voucherDebitAmount = sanitizeAmount(form.voucherDebit);
    const voucherCreditAmount = sanitizeAmount(form.voucherCredit);
    const transferAmount = sanitizeAmount(form.transfer);
    const checkAmount = sanitizeAmount(form.check);
    const otherAmount = sanitizeAmount(form.other);

    const payload = {
      actualCash,
      voucherDebitAmount,
      voucherCreditAmount,
      transferAmount,
      checkAmount,
      otherAmount,
    };

    const trimmedNotes = form.notes.trim();
    if (trimmedNotes && trimmedNotes.length > 0 && trimmedNotes.length < MIN_NOTE_LENGTH) {
      setClosingError(`La nota debe tener al menos ${MIN_NOTE_LENGTH} caracteres.`);
      return;
    }

    const confirmMessage =
      'Se registrará el cierre de caja con los montos ingresados. Esta acción no se puede deshacer. ¿Deseas continuar?';

    Alert.alert('Confirmar cierre', confirmMessage, [
      {
        text: 'Cancelar',
        style: 'cancel',
      },
      {
        text: 'Cerrar caja',
        style: 'destructive',
        onPress: () =>
          submitClosing({
            userName: user.userName,
            pointOfSaleId: pointOfSale.id,
            cashSessionId: session.id,
            ...payload,
            notes: trimmedNotes || undefined,
          }),
      },
    ]);
  };

  const submitClosing = async (payload: {
    userName: string;
    pointOfSaleId: string;
    cashSessionId: string;
    actualCash: number;
    voucherDebitAmount: number;
    voucherCreditAmount: number;
    transferAmount: number;
    checkAmount: number;
    otherAmount: number;
    notes?: string;
  }) => {
    if (!user || !session) {
      setClosingError('Debes iniciar sesión nuevamente.');
      return;
    }

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await closeCashSession({
        ...payload,
        notes: payload.notes,
      });

      setCashSession(response.session);

      setClosingResult({
        actual: response.closing.actual,
        expected: response.closing.expected,
        varianceCash: response.closing.difference.cash,
        totalVariance: response.closing.difference.total,
      });
      setClosingError(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No se pudo cerrar la caja. Intenta nuevamente.';
      setClosingError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const differenceBadgeStyle = useMemo(() => {
    if (!closingResult) {
      return styles.differenceBadgeNeutral;
    }

    if (Math.abs(closingResult.varianceCash) <= 0.009) {
      return styles.differenceBadgeOk;
    }

    return closingResult.varianceCash < 0
      ? styles.differenceBadgeNegative
      : styles.differenceBadgePositive;
  }, [closingResult]);

  const handleExit = () => {
    completeLogout();
  };

  const renderForm = () => (
    <View
      style={styles.formCard}
      onLayout={({ nativeEvent }) => {
        formCardOffsetRef.current = nativeEvent.layout.y;
      }}
    >
      <Text style={styles.cardTitle}>Conteo ciego</Text>
      <Text style={styles.cardSubtitle}>
        Ingresa el efectivo real en caja y los comprobantes separados por medio de pago. El sistema mostrará las diferencias luego de confirmar.
      </Text>

      <View
        style={styles.fieldGroup}
        onLayout={({ nativeEvent }) => setFieldOffset('actualCash', nativeEvent.layout.y)}
      >
        <Text style={styles.fieldLabel}>Efectivo en caja *</Text>
        <TextInput
          ref={(ref) => {
            amountInputRefs.current.actualCash = ref;
          }}
          style={styles.input}
          keyboardType={Platform.select({ android: 'numeric', default: 'number-pad' })}
          inputMode="numeric"
          placeholder="$0"
          placeholderTextColor={palette.textMuted}
          value={formatDigitsValue(form.actualCash)}
          onChangeText={(value) => handleAmountDigitsChange('actualCash', value)}
          onFocus={() => handleAmountFocus('actualCash')}
          editable={!isSubmitting && !closingResult}
          returnKeyType="done"
        />
      </View>

      <View style={styles.fieldGroupRow}>
        <View
          style={styles.fieldColumn}
          onLayout={({ nativeEvent }) => setFieldOffset('voucherDebit', nativeEvent.layout.y)}
        >
          <Text style={styles.fieldLabel}>Vouchers débito</Text>
          <TextInput
            ref={(ref) => {
              amountInputRefs.current.voucherDebit = ref;
            }}
            style={styles.input}
            keyboardType={Platform.select({ android: 'numeric', default: 'number-pad' })}
            inputMode="numeric"
            placeholder="$0"
            placeholderTextColor={palette.textMuted}
            value={formatDigitsValue(form.voucherDebit)}
            onChangeText={(value) => handleAmountDigitsChange('voucherDebit', value)}
            onFocus={() => handleAmountFocus('voucherDebit')}
            editable={!isSubmitting && !closingResult}
            returnKeyType="done"
          />
        </View>
        <View
          style={styles.fieldColumn}
          onLayout={({ nativeEvent }) => setFieldOffset('voucherCredit', nativeEvent.layout.y)}
        >
          <Text style={styles.fieldLabel}>Vouchers crédito</Text>
          <TextInput
            ref={(ref) => {
              amountInputRefs.current.voucherCredit = ref;
            }}
            style={styles.input}
            keyboardType={Platform.select({ android: 'numeric', default: 'number-pad' })}
            inputMode="numeric"
            placeholder="$0"
            placeholderTextColor={palette.textMuted}
            value={formatDigitsValue(form.voucherCredit)}
            onChangeText={(value) => handleAmountDigitsChange('voucherCredit', value)}
            onFocus={() => handleAmountFocus('voucherCredit')}
            editable={!isSubmitting && !closingResult}
            returnKeyType="done"
          />
        </View>
      </View>

      <View style={styles.fieldGroupRow}>
        <View
          style={styles.fieldColumn}
          onLayout={({ nativeEvent }) => setFieldOffset('transfer', nativeEvent.layout.y)}
        >
          <Text style={styles.fieldLabel}>Transferencias</Text>
          <TextInput
            ref={(ref) => {
              amountInputRefs.current.transfer = ref;
            }}
            style={styles.input}
            keyboardType={Platform.select({ android: 'numeric', default: 'number-pad' })}
            inputMode="numeric"
            placeholder="$0"
            placeholderTextColor={palette.textMuted}
            value={formatDigitsValue(form.transfer)}
            onChangeText={(value) => handleAmountDigitsChange('transfer', value)}
            onFocus={() => handleAmountFocus('transfer')}
            editable={!isSubmitting && !closingResult}
            returnKeyType="done"
          />
        </View>
        <View
          style={styles.fieldColumn}
          onLayout={({ nativeEvent }) => setFieldOffset('check', nativeEvent.layout.y)}
        >
          <Text style={styles.fieldLabel}>Cheques</Text>
          <TextInput
            ref={(ref) => {
              amountInputRefs.current.check = ref;
            }}
            style={styles.input}
            keyboardType={Platform.select({ android: 'numeric', default: 'number-pad' })}
            inputMode="numeric"
            placeholder="$0"
            placeholderTextColor={palette.textMuted}
            value={formatDigitsValue(form.check)}
            onChangeText={(value) => handleAmountDigitsChange('check', value)}
            onFocus={() => handleAmountFocus('check')}
            editable={!isSubmitting && !closingResult}
            returnKeyType="done"
          />
        </View>
      </View>

      <View
        style={styles.fieldGroup}
        onLayout={({ nativeEvent }) => setFieldOffset('other', nativeEvent.layout.y)}
      >
        <Text style={styles.fieldLabel}>Otros</Text>
        <TextInput
          ref={(ref) => {
            amountInputRefs.current.other = ref;
          }}
          style={styles.input}
          keyboardType={Platform.select({ android: 'numeric', default: 'number-pad' })}
          inputMode="numeric"
          placeholder="$0"
          placeholderTextColor={palette.textMuted}
          value={formatDigitsValue(form.other)}
          onChangeText={(value) => handleAmountDigitsChange('other', value)}
          onFocus={() => handleAmountFocus('other')}
          editable={!isSubmitting && !closingResult}
          returnKeyType="done"
        />
      </View>

      <View
        style={styles.fieldGroup}
        onLayout={({ nativeEvent }) => setFieldOffset('notes', nativeEvent.layout.y)}
      >
        <Text style={styles.fieldLabel}>Notas</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          placeholder="Ej: El cajero entregó $10.000 menos"
          placeholderTextColor={palette.textMuted}
          value={form.notes}
          onChangeText={handleNotesChange}
          onFocus={() => scrollToField('notes')}
          editable={!isSubmitting && !closingResult}
          multiline
          numberOfLines={4}
        />
        <Text style={styles.notesHint}>
          Si se detecta una diferencia en efectivo se solicitará un comentario (mínimo {MIN_NOTE_LENGTH} caracteres).
        </Text>
      </View>

      {closingError ? <Text style={styles.errorText}>{closingError}</Text> : null}

      {!closingResult ? (
        <TouchableOpacity
          style={[styles.primaryButton, isSubmitting ? styles.primaryButtonDisabled : null]}
          activeOpacity={0.85}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={palette.background} />
          ) : (
            <Text style={styles.primaryButtonLabel}>Confirmar cierre</Text>
          )}
        </TouchableOpacity>
      ) : null}
    </View>
  );

  const renderResults = () => {
    if (!closingResult) {
      return null;
    }

    return (
      <View style={styles.resultCard}>
        <Text style={styles.cardTitle}>Resultados del cierre</Text>
        <Text style={styles.cardSubtitle}>
          El sistema comparó tu conteo con los movimientos registrados en la sesión actual.
        </Text>

        <View style={styles.summaryRow}>
          <View style={styles.summaryColumn}>
            <Text style={styles.summaryLabel}>Esperado en efectivo</Text>
            <Text style={styles.summaryValue}>{formatCurrency(closingResult.expected.cash)}</Text>
          </View>
          <View style={styles.summaryColumn}>
            <Text style={styles.summaryLabel}>Contado en efectivo</Text>
            <Text style={styles.summaryValue}>{formatCurrency(closingResult.actual.cash)}</Text>
          </View>
        </View>

        <View style={[styles.differenceBadge, differenceBadgeStyle]}>
          <Text style={styles.differenceBadgeText}>
            Diferencia en efectivo: {formatCurrency(closingResult.varianceCash)}
          </Text>
        </View>
        <View style={[styles.differenceBadge, styles.differenceBadgeNeutral]}>
          <Text style={styles.differenceBadgeText}>
            Variación total (incluyendo vouchers): {formatCurrency(closingResult.totalVariance)}
          </Text>
        </View>

        <View style={styles.breakdownSection}>
          <Text style={styles.breakdownTitle}>Detalle de medios de pago</Text>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownHeader}>Medio</Text>
            <Text style={styles.breakdownHeader}>Esperado</Text>
            <Text style={styles.breakdownHeader}>Contado</Text>
          </View>

          {buildBreakdownDisplay(closingResult.expected, closingResult.actual).map((row) => (
            <View style={styles.breakdownRow} key={row.key}>
              <Text style={styles.breakdownCellLabel}>{row.label}</Text>
              <Text style={styles.breakdownCellValue}>{formatCurrency(row.expected)}</Text>
              <Text style={styles.breakdownCellValue}>{formatCurrency(row.actual)}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.85} onPress={handleExit}>
          <Text style={styles.secondaryButtonLabel}>Volver al login</Text>
        </TouchableOpacity>
        <Text style={styles.autoRedirectHint}>Serás redirigido al login automáticamente.</Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="always"
      >
        <Text style={styles.headerTitle}>Cierre de caja</Text>
        <Text style={styles.headerSubtitle}>
          Registra el conteo final para cerrar la caja. Nada de los montos esperados se mostrará hasta confirmar el cierre.
        </Text>

        {renderForm()}
        {renderResults()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type BreakdownRow = { key: string; label: string; expected: number; actual: number };
type BreakdownInput = {
  cash: number;
  debitCard: number;
  creditCard: number;
  transfer: number;
  check: number;
  other: number;
};

function buildBreakdownDisplay(expected: BreakdownInput, actual: BreakdownInput): BreakdownRow[] {
  return [
    { key: 'cash', label: 'Efectivo', expected: expected.cash, actual: actual.cash },
    { key: 'debit', label: 'Débito', expected: expected.debitCard, actual: actual.debitCard },
    { key: 'credit', label: 'Crédito', expected: expected.creditCard, actual: actual.creditCard },
    { key: 'transfer', label: 'Transferencias', expected: expected.transfer, actual: actual.transfer },
    { key: 'check', label: 'Cheques', expected: expected.check, actual: actual.check },
    { key: 'other', label: 'Otros', expected: expected.other, actual: actual.other },
  ];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  scrollContent: {
    padding: 24,
    gap: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: palette.textPrimary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: palette.textMuted,
  },
  formCard: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  resultCard: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: palette.textPrimary,
  },
  cardSubtitle: {
    fontSize: 14,
    color: palette.textMuted,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldGroupRow: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldColumn: {
    flex: 1,
    gap: 6,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: palette.textPrimary,
  },
  input: {
    backgroundColor: palette.background,
    borderRadius: 8,
    borderColor: palette.border,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: palette.textPrimary,
  },
  notesInput: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  notesHint: {
    fontSize: 12,
    color: palette.textMuted,
  },
  primaryButton: {
    backgroundColor: palette.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonLabel: {
    color: palette.background,
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: palette.secondary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonLabel: {
    color: palette.textPrimary,
    fontWeight: '600',
    fontSize: 16,
  },
  errorText: {
    color: palette.error,
    fontSize: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  summaryColumn: {
    flex: 1,
    gap: 4,
  },
  summaryLabel: {
    fontSize: 13,
    color: palette.textMuted,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '600',
    color: palette.textPrimary,
  },
  differenceBadge: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  differenceBadgeNeutral: {
    backgroundColor: '#E5E7EB',
  },
  differenceBadgeOk: {
    backgroundColor: '#DCFCE7',
  },
  differenceBadgePositive: {
    backgroundColor: '#FEF9C3',
  },
  differenceBadgeNegative: {
    backgroundColor: '#FEE2E2',
  },
  differenceBadgeText: {
    fontSize: 14,
    fontWeight: '500',
    color: palette.textPrimary,
  },
  autoRedirectHint: {
    marginTop: 12,
    fontSize: 12,
    color: palette.textMuted,
    textAlign: 'center',
  },
  breakdownSection: {
    borderTopWidth: 1,
    borderTopColor: palette.border,
    paddingTop: 12,
    gap: 8,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.textPrimary,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  breakdownHeader: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: palette.textMuted,
  },
  breakdownCellLabel: {
    flex: 1,
    fontSize: 14,
    color: palette.textPrimary,
  },
  breakdownCellValue: {
    flex: 1,
    fontSize: 14,
    color: palette.textPrimary,
    textAlign: 'right',
  },
});
