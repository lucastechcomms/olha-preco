// ===============================================
// 📦 App.js — Navegação Principal do Aplicativo
// ===============================================

import React from 'react';

// Navegação Principal
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Área Segura (para telas notch, iPhone X, etc.)
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Importação das telas
import {
  HomeScreen,
  BarcodeScannerScreen,
  RegistrosScreen,
  CadastroProdutoScreen,
  MercadosProximosScreen,
  InstrucoesScreen,
  SugestoesScreen
} from './Screens';


// Criação da pilha de navegação
const Stack = createStackNavigator();

// ==============================
// 📱 Componente Principal
// ==============================
export default function App() {
  return (
    // Provider para controlar margens seguras em qualquer aparelho
    <SafeAreaProvider style={{ flex: 1 }}>
      {/* Container de Navegação */}
      <NavigationContainer>
        {/* Definição da pilha de navegação */}
        <Stack.Navigator
          initialRouteName="Home" // Define a primeira tela
          screenOptions={{
            headerShown: true, // Exibe cabeçalho por padrão
            gestureEnabled: true, // Permite gestos para voltar
          }}>
          {/* Tela Inicial */}
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ title: 'Início' }}
          />

          {/* Tela de Leitura de Código de Barras */}
          <Stack.Screen
            name="Leitura"
            component={BarcodeScannerScreen}
            options={{ title: 'Leitura de Código' }}
          />

          {/* Tela de Mercados Proximos */}
          <Stack.Screen
            name="Mercados Próximos"
            component={MercadosProximosScreen}
            options={{ title: 'Mercados Próximos' }}
          />

          {/* Tela de Instruções */}
          <Stack.Screen
            name="Instruções"
            component={InstrucoesScreen}
            options={{ title: 'Instruções' }}
          />

          <Stack.Screen
            name="Sugestões"
            component={SugestoesScreen}
            options={{ title: 'Sugestões' }}
          />

          {/* Tela de Cadastro Manual de Produto */}
          <Stack.Screen
            name="Cadastrar Produto"
            component={CadastroProdutoScreen}
            options={{ title: 'Cadastrar Produto' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
