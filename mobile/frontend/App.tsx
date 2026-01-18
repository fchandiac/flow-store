import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import LoginScreen from './screens/LoginScreen';
import OpeningScreen from './screens/OpeningScreen';
import PosScreen from './screens/PosScreen';
import SessionSetupScreen from './screens/SessionSetupScreen';
import SettingsScreen from './screens/SettingsScreen';
import PrinterSettingsScreen from './screens/PrinterSettingsScreen';
import SecondaryDisplaySettingsScreen from './screens/SecondaryDisplaySettingsScreen';
import ServerSettingsScreen from './screens/ServerSettingsScreen';
import CashClosingScreen from './screens/CashClosingScreen';
import { type RootStackParamList } from './navigation/types';
import { normalizeBaseUrl } from './services/apiService';
import { loadDeviceSettings, updateDeviceSettings } from './services/settingsStorage';
import { usePosStore } from './store/usePosStore';
import { palette } from './theme/palette';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const setPreferredUsbPrinter = usePosStore((state) => state.setPreferredUsbPrinter);
  const setPreferredCustomerDisplay = usePosStore((state) => state.setPreferredCustomerDisplay);
  const setPromoMediaEnabled = usePosStore((state) => state.setPromoMediaEnabled);
  const setPromoMedia = usePosStore((state) => state.setPromoMedia);
  const setBackendBaseUrl = usePosStore((state) => state.setBackendBaseUrl);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      try {
        const settings = await loadDeviceSettings();
        if (!isMounted) {
          return;
        }
        setPreferredUsbPrinter(settings.preferredUsbPrinter ?? null);
        setPreferredCustomerDisplay(settings.preferredCustomerDisplayId ?? null);
        setPromoMediaEnabled(Boolean(settings.promoMediaEnabled));
        setPromoMedia(settings.promoMedia ?? null);
        const sanitizedBackend = normalizeBaseUrl(settings.backendBaseUrl ?? null);
        setBackendBaseUrl(sanitizedBackend);

        if (sanitizedBackend !== (settings.backendBaseUrl ?? null)) {
          await updateDeviceSettings({ backendBaseUrl: sanitizedBackend });
        }
      } catch (error) {
        console.warn('[App] No se pudieron cargar los ajustes del dispositivo', error);
      }
    };

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, [
    setBackendBaseUrl,
    setPreferredCustomerDisplay,
    setPreferredUsbPrinter,
    setPromoMedia,
    setPromoMediaEnabled,
  ]);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" backgroundColor={palette.secondary} />
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{
            headerStyle: { backgroundColor: palette.secondary },
            headerTintColor: palette.textPrimary,
            headerTitleStyle: { color: palette.textPrimary, fontWeight: '600' },
            contentStyle: { backgroundColor: palette.background },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ title: 'Iniciar sesión', headerShown: false }}
          />
          <Stack.Screen
            name="SessionSetup"
            component={SessionSetupScreen}
            options={{ title: 'Seleccionar caja' }}
          />
          <Stack.Screen
            name="Opening"
            component={OpeningScreen}
            options={{ title: 'Apertura de caja' }}
          />
          <Stack.Screen name="Pos" component={PosScreen} options={{ headerShown: false }} />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ title: 'Configuración del punto de venta' }}
          />
          <Stack.Screen
            name="SecondaryDisplaySettings"
            component={SecondaryDisplaySettingsScreen}
            options={{ title: 'Pantalla secundaria' }}
          />
          <Stack.Screen
            name="PrinterSettings"
            component={PrinterSettingsScreen}
            options={{ title: 'Impresora POS' }}
          />
          <Stack.Screen
            name="ServerSettings"
            component={ServerSettingsScreen}
            options={{ title: 'Servidor POS' }}
          />
          <Stack.Screen
            name="CashClosing"
            component={CashClosingScreen}
            options={{ title: 'Cierre de caja' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
