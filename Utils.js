// Utils.js
// 🔧 Funções auxiliares, constantes e inicialização segura do Firebase

import firebase from 'firebase';

// ==============================
// 🔐 Inicialização do Firebase
// ==============================

const firebaseConfig = {
  apiKey: "AIzaSyBpjbVuH8KKv1yDT158_W-EHUJlO7ZZHSU",
  authDomain: "prot3-armazenamento.firebaseapp.com",
  databaseURL: "https://prot3-armazenamento-default-rtdb.firebaseio.com",
  projectId: "prot3-armazenamento",
  storageBucket: "prot3-armazenamento.appspot.com",
  messagingSenderId: "151777765601",
  appId: "1:151777765601:web:3f5940d4e807ad73baafa0"
};

// Garante que o Firebase será inicializado uma única vez
if (firebase.apps.length === 0) {
  firebase.initializeApp(firebaseConfig);
  firebase.firestore().settings({ experimentalForceLongPolling: true });
}

// ==============================
// 🔥 Firebase Atalhos
// ==============================

export const db = firebase.firestore();
export const firebaseTimestamp = () => firebase.firestore.FieldValue.serverTimestamp();

// ==============================
// 📦 Constantes do domínio
// ==============================

// Lista única de unidades disponíveis para qualquer produto
export const unidadesDisponiveis = [ "un", "kg", "g", "mg", "l", "ml"];


// ==============================
// 📍 Geolocalização
// ==============================

export function calcularDistancia(lat1, lon1, lat2, lon2) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371; // km

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function encontrarMercadoProximo(latitude, longitude, mercados) {
  let mercadoMaisProximo = null;
  let distanciaMinima = Infinity;

  mercados.forEach((mercado) => {
    const coords = mercado.coordenadas;
    if (!coords || coords.latitude === undefined || coords.longitude === undefined) {
      return; // pula mercados com coordenadas inválidas
    }

    const distancia = calcularDistancia(
      latitude,
      longitude,
      coords.latitude,
      coords.longitude
    );

    if (distancia < distanciaMinima) {
      distanciaMinima = distancia;
      mercadoMaisProximo = mercado;
    }
  });

  return mercadoMaisProximo;
}


// ==============================
// 💲 Preço
// ==============================

export function formatarPreco(valor) {
  const numeric = valor.replace(/\D/g, "");
  const numero = (parseFloat(numeric) / 100).toFixed(2);
  return numero.replace(".", ",");
}

export function handlePrecoChange(text, setFunction) {
  const numeric = text.replace(/\D/g, "");
  const valor = (parseFloat(numeric) / 100).toFixed(2);
  setFunction(valor.replace(".", ","));
}

// ==============================
// Exibição de informação
// ==============================

export function calcularResumoCarrinho(leituras) {
  const total = leituras.reduce((soma, item) => soma + (item.preco || 0), 0);
  const quantidade = leituras.length;
  return { total, quantidade };
}



// ==============================
// 📏 Formatação de distância
// ==============================

/**
 * Formata a distância em metros com base em regras de exibição:
 * - Até 1000m: arredonda para múltiplos de 10m (ex: 730m → 730m)
 * - Acima de 1000m: converte para km com dois algarismos significativos (ex: 1.2km, 3.3km)
 */
export function formatarDistancia(distanciaMetros) {
  if (distanciaMetros < 1000) {
    // Arredonda para o múltiplo de 10 mais próximo
    const arredondado = Math.round(distanciaMetros / 10) * 10;
    return `${arredondado}m`;
  } else {
    // Converte para km e limita para 2 algarismos significativos
    const km = distanciaMetros / 1000;

    // Usa Intl.NumberFormat para controlar precisão e formato
    const formatador = new Intl.NumberFormat('pt-BR', {
      maximumSignificantDigits: 2,
    });

    return `${formatador.format(km)}km`;
  }
}



// ==============================
// 🎨 Cores por comparação de preço
// ==============================

/**
 * Retorna a cor do texto com base na comparação de preços
 * @param {number} precoOutroMercado - preço do mercado alternativo
 * @param {number} precoCarrinho - preço do produto no carrinho
 */
export function corDoPrecoComparado(precoOutroMercado, precoCarrinho) {
  if (precoOutroMercado > precoCarrinho) return 'red';     // mais caro
  if (precoOutroMercado < precoCarrinho) return 'green';   // mais barato
  return '#007bff'; // azul padrão (igual)
}
