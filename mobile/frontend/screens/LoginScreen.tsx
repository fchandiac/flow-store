import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { palette } from '../theme/palette';

const MAX_PASSWORD_LENGTH = 64;

export type LoginScreenProps = NativeStackScreenProps<RootStackParamList, 'Login'>;

function LoginScreen({ navigation }: LoginScreenProps) {
  const setUser = usePosStore((state) => state.setUser);
  const resetSession = usePosStore((state) => state.resetSession);
  const [userName, setUserName] = useState('admin');
  const [password, setPassword] = useState('098098');
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
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      style={styles.root}
    >
      <View style={styles.topActions}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.settingsButton}
          onPress={() => navigation.navigate('Settings')}
          accessibilityRole="button"
          accessibilityLabel="Abrir configuración de dispositivos"
        >
          <Ionicons name="settings-outline" size={18} color={palette.primary} />
          <Text style={styles.settingsLabel}>Configurar dispositivos</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.card}>
        <Image
          source={require('../assets/icon.png')}
          style={styles.logo}
          accessibilityRole="image"
          accessibilityLabel="Logo de FlowStore"
        />
        <Text style={styles.brandTitle}>POS</Text>
        <Text style={styles.subtitle}>Ingresa para abrir una nueva sesión de caja.</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          editable={false}
          keyboardType="email-address"
          onChangeText={setUserName}
          placeholder="Usuario"
          placeholderTextColor={palette.textMuted}
          style={styles.input}
          value={userName}
        />
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          editable={false}
          maxLength={MAX_PASSWORD_LENGTH}
          onChangeText={setPassword}
          placeholder="Contraseña"
          placeholderTextColor={palette.textMuted}
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
            <ActivityIndicator color={palette.primaryText} />
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
    backgroundColor: palette.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  topActions: {
    position: 'absolute',
    top: 48,
    right: 24,
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.primary,
    backgroundColor: palette.surface,
  },
  settingsLabel: {
    color: palette.primary,
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: palette.surface,
    padding: 24,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    alignItems: 'center',
  },
  logo: {
    width: 96,
    height: 96,
    marginBottom: 16,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 24,
    color: palette.primary,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  brandTitle: {
    fontSize: 28,
    color: palette.primary,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: palette.textMuted,
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    alignSelf: 'stretch',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    color: palette.textPrimary,
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
    alignSelf: 'stretch',
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

export default LoginScreen;
