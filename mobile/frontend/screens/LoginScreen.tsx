import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
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
import { login } from '../services/apiService';
import { RootStackParamList } from '../navigation/types';
import { usePosStore } from '../store/usePosStore';

const MAX_PASSWORD_LENGTH = 64;

export type LoginScreenProps = NativeStackScreenProps<RootStackParamList, 'Login'>;

function LoginScreen({ navigation }: LoginScreenProps) {
  const setUser = usePosStore((state) => state.setUser);
  const resetSession = usePosStore((state) => state.resetSession);
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!userName.trim() || !password.trim()) {
      Alert.alert('Credenciales requeridas', 'Ingresa usuario y contraseña para continuar.');
      return;
    }

    setIsSubmitting(true);
    try {
      const authenticated = await login(userName.trim(), password.trim());
      resetSession();
      setUser({
        id: authenticated.id,
        userName: authenticated.userName,
        personId: authenticated.personId,
        personName: authenticated.personName,
        role: authenticated.role,
      });
      navigation.reset({ index: 0, routes: [{ name: 'SessionSetup' }] });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo iniciar sesión.';
      Alert.alert('Error al iniciar sesión', message);
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
        <Text style={styles.title}>Sesión de Caja</Text>
        <Text style={styles.subtitle}>Inicia sesión para seleccionar un punto de venta.</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isSubmitting}
          keyboardType="email-address"
          onChangeText={setUserName}
          placeholder="Usuario"
          placeholderTextColor="#6b7280"
          style={styles.input}
          value={userName}
        />
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isSubmitting}
          maxLength={MAX_PASSWORD_LENGTH}
          onChangeText={setPassword}
          placeholder="Contraseña"
          placeholderTextColor="#6b7280"
          secureTextEntry
          style={styles.input}
          value={password}
        />
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={isSubmitting}
          onPress={handleSubmit}
          style={[styles.button, isSubmitting && styles.buttonDisabled]}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#f8fafc" />
          ) : (
            <Text style={styles.buttonLabel}>Continuar</Text>
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
    marginBottom: 24,
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
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#2563eb',
  },
  buttonDisabled: {
    backgroundColor: '#1d4ed8',
  },
  buttonLabel: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LoginScreen;
