import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import LoginScreen from './screens/LoginScreen';
import OpeningScreen from './screens/OpeningScreen';
import PosScreen from './screens/PosScreen';
import SessionSetupScreen from './screens/SessionSetupScreen';
import SettingsScreen from './screens/SettingsScreen';
import PrinterSettingsScreen from './screens/PrinterSettingsScreen';
import SecondaryDisplaySettingsScreen from './screens/SecondaryDisplaySettingsScreen';
import { type RootStackParamList } from './navigation/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{
            headerStyle: { backgroundColor: '#111827' },
            headerTintColor: '#f8fafc',
            headerTitleStyle: { color: '#f8fafc', fontWeight: '600' },
            contentStyle: { backgroundColor: '#0b1120' },
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
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
