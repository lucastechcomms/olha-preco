// Styles.js
// 🎨 Estilos centralizados e reutilizáveis para todas as telas e componentes

import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  // Container principal de cada tela
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f4f4f4'
  },

  // Título principal
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center'
  },

  // Botão padrão
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
    width: '80%',
    alignItems: 'center'
  },

  // Texto do botão
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  },

  // Campo de entrada de texto
  input: {
    width: '95%',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 16
  },

  // Câmera (Scanner de código de barras)
  camera: {
    flex: 1
  },

  // Overlay de escaneamento
  layerContainer: {
    flex: 1
  },
  layerTop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  layerCenter: {
    flexDirection: 'row'
  },
  layerLeft: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  layerFocused: {
    flex: 2,
    borderWidth: 2,
    borderColor: '#00FF00'
  },
  layerRight: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  layerBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
});
