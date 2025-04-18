// App.js
// 📦 Arquivo responsável apenas pela navegação principal

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Importação das telas centralizadas
import {
  HomeScreen,
  BarcodeScannerScreen,
  RegistrosScreen,
  CadastroProdutoScreen,
} from './Screens';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Leitura" component={BarcodeScannerScreen} />
        <Stack.Screen name="Histórico" component={RegistrosScreen} />
        <Stack.Screen name="Cadastrar Produto" component={CadastroProdutoScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
