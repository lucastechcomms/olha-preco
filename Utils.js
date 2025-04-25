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

export const categorias = ["Alimentos", "Bebidas", "Higiene", "Limpeza", "Papelaria", "Outros"];

export const unidadesPorCategoria = {
  Alimentos: ["kg", "g", "un"],
  Bebidas: ["L", "ml"],
  Higiene: ["un"],
  Limpeza: ["L", "ml", "un"],
  Papelaria: ["un"],
  Outros: ["un"]
};

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
    const distancia = calcularDistancia(
      latitude,
      longitude,
      mercado.coordenadas.latitude,
      mercado.coordenadas.longitude
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

