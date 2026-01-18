import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { type RootStackParamList } from '../navigation/types';
import { normalizeBaseUrl, testBackendHealth, type BackendHealthResult } from '../services/apiService';
import { updateDeviceSettings } from '../services/settingsStorage';
import { selectBackendBaseUrl, usePosStore } from '../store/usePosStore';
import { palette } from '../theme/palette';

type Props = NativeStackScreenProps<RootStackParamList, 'ServerSettings'>;

type TestState =
  | { status: 'idle'; result: null }
  | { status: 'running'; result: null }
  | { status: 'success'; result: BackendHealthResult }
  | { status: 'error'; result: { message: string } };

const ServerSettingsScreen: React.FC<Props> = () => {
  const backendBaseUrl = usePosStore(selectBackendBaseUrl);
  const setBackendBaseUrl = usePosStore((state) => state.setBackendBaseUrl);

  const [inputValue, setInputValue] = useState(backendBaseUrl ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [testState, setTestState] = useState<TestState>({ status: 'idle', result: null });

  useEffect(() => {
    setInputValue(backendBaseUrl ?? '');
  }, [backendBaseUrl]);

  const isDirty = useMemo(() => {
    return (backendBaseUrl ?? '') !== inputValue;
  }, [backendBaseUrl, inputValue]);

  const handleSave = async () => {
    const trimmed = inputValue.trim();
    let normalized: string | null = null;

    if (trimmed.length > 0) {
      normalized = normalizeBaseUrl(trimmed);
      if (!normalized) {
        Alert.alert('URL inválida', 'Ingresa una URL válida que comience con http:// o https://.');
        return;
      }
    }

    setIsSaving(true);
    try {
      await updateDeviceSettings({ backendBaseUrl: normalized });
      setBackendBaseUrl(normalized);
      setInputValue(normalized ?? '');
      setTestState({ status: 'idle', result: null });
      Alert.alert('Configuración guardada', normalized ? 'Se utilizará la nueva URL del servidor POS.' : 'Se restableció la URL predeterminada.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar la configuración.';
      Alert.alert('Error', message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (!backendBaseUrl) {
      return;
    }

    Alert.alert('Restablecer URL', '¿Deseas volver a la URL predeterminada?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Restablecer',
        style: 'destructive',
        onPress: () => {
          setInputValue('');
          setTestState({ status: 'idle', result: null });
        },
      },
    ]);
  };

  const handleTest = async () => {
    setTestState({ status: 'running', result: null });
    try {
      const result = await testBackendHealth(inputValue.trim());
      setTestState({ status: 'success', result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo contactar al servidor POS.';
      setTestState({ status: 'error', result: { message } });
    }
  };

  const renderTestResult = () => {
    if (testState.status === 'idle' || testState.status === 'running') {
      return null;
    }

    const isSuccess = testState.status === 'success';
    const containerStyle = [
      styles.testResult,
      isSuccess ? styles.testResultSuccess : styles.testResultError,
    ];

    return (
      <View style={containerStyle}>
        <Text style={styles.testResultTitle}>
          {isSuccess ? 'Conexión verificada' : 'Conexión fallida'}
        </Text>
        <Text style={styles.testResultMessage}>
          {isSuccess
            ? `URL: ${testState.result.resolvedUrl}
Tiempo de respuesta: ${testState.result.latencyMs} ms`
            : testState.result.message}
        </Text>
      </View>
    );
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>URL del servidor POS</Text>
        <Text style={styles.sectionDescription}>
          Define la dirección base del backend que utilizará la aplicación. Si dejas el campo vacío se
          utilizará la URL predeterminada.
        </Text>
        <TextInput
          value={inputValue}
          onChangeText={(value) => {
            setInputValue(value);
            setTestState({ status: 'idle', result: null });
          }}
          placeholder="https://pos.midominio.com"
          placeholderTextColor={palette.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
          keyboardType="url"
        />
        <Text style={styles.inputHint}>
          Ejemplos válidos: https://pos.midominio.com, http://192.168.0.10:3010
        </Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleSave}
            disabled={isSaving || !isDirty}
            style={[styles.primaryButton, (isSaving || !isDirty) && styles.primaryButtonDisabled]}
          >
            {isSaving ? (
              <ActivityIndicator color={palette.primaryText} />
            ) : (
              <Text style={styles.primaryButtonLabel}>Guardar</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleReset}
            disabled={!backendBaseUrl}
            style={[styles.secondaryButton, !backendBaseUrl && styles.secondaryButtonDisabled]}
          >
            <Text style={styles.secondaryButtonLabel}>Restablecer</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Probar conexión</Text>
        <Text style={styles.sectionDescription}>
          Ejecuta una verificación contra el endpoint /api/health del servidor configurado para confirmar que
          está accesible.
        </Text>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleTest}
          disabled={testState.status === 'running'}
          style={[styles.primaryButton, testState.status === 'running' && styles.primaryButtonDisabled]}
        >
          {testState.status === 'running' ? (
            <ActivityIndicator color={palette.primaryText} />
          ) : (
            <Text style={styles.primaryButtonLabel}>Probar conexión</Text>
          )}
        </TouchableOpacity>
        {renderTestResult()}
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
    padding: 20,
  },
  section: {
    backgroundColor: palette.surface,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    padding: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: palette.textSecondary,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: palette.textMuted,
    lineHeight: 20,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: palette.textSecondary,
    fontSize: 16,
    backgroundColor: palette.surface,
  },
  inputHint: {
    fontSize: 12,
    color: palette.textMuted,
    marginTop: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  primaryButton: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  primaryButtonDisabled: {
    backgroundColor: palette.primaryStrong,
  },
  primaryButtonLabel: {
    color: palette.primaryText,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flexBasis: 140,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
    marginLeft: 12,
  },
  secondaryButtonDisabled: {
    opacity: 0.5,
  },
  secondaryButtonLabel: {
    color: palette.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  testResult: {
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
  },
  testResultSuccess: {
    backgroundColor: palette.positiveTint,
    borderColor: palette.success,
    borderWidth: StyleSheet.hairlineWidth,
  },
  testResultError: {
    backgroundColor: palette.dangerTint,
    borderColor: palette.danger,
    borderWidth: StyleSheet.hairlineWidth,
  },
  testResultTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    color: palette.textSecondary,
  },
  testResultMessage: {
    fontSize: 13,
    color: palette.textMuted,
    lineHeight: 18,
  },
});

export default ServerSettingsScreen;
