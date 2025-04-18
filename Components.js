// Components.js
// 🧩 Arquivo de componentes visuais reutilizáveis (pequenos ou modulares)

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { db } from './Utils'; // Importa acesso ao Firestore via Utils.js

// 🔁 Componente: RegistroItem
// Usado na tela de histórico para exibir cada leitura de preço com detalhes
export function RegistroItem({ item }) {
  const [produto, setProduto] = useState(null);

  const dataObj = item.timestamp?.toDate();
  const dataStr = dataObj?.toLocaleDateString() || '';
  const horaStr = dataObj?.toLocaleTimeString() || '';

  useEffect(() => {
    const fetchProduto = async () => {
      try {
        const doc = await db.collection('produtos').doc(item.codigo).get();
        if (doc.exists) {
          setProduto(doc.data());
        }
      } catch (error) {
        console.error('Erro ao buscar produto:', error);
      }
    };
    fetchProduto();
  }, [item.codigo]);

  return (
    <View style={styles.card}>
      {/* Nome do mercado */}
      <View style={styles.header}>
        <Text style={styles.mercado}>📍 {item.mercado || 'Mercado desconhecido'}</Text>
      </View>

      {/* Detalhes do produto e preço */}
      <View style={styles.content}>
        <View style={styles.info}>
          <Text style={styles.nome}>
            {produto?.nome || 'Produto'}
            {produto?.quantidade ? ` (${produto.quantidade}${produto.unidade})` : ''}
          </Text>
          <Text style={styles.marca}>{produto?.marca}</Text>
          <Text style={styles.descricao}>{produto?.descricao}</Text>
        </View>
        <View style={styles.precoContainer}>
          <Text style={styles.preco}>
            {typeof item.preco === 'number' ? `R$ ${item.preco.toFixed(2)}` : '-'}
          </Text>
        </View>
      </View>

      {/* Data e hora */}
      <View style={styles.footer}>
        <Text style={styles.data}>{dataStr}</Text>
        <Text style={styles.hora}>{horaStr}</Text>
      </View>
    </View>
  );
}

// 🎨 Estilos internos do componente (não vai para Styles.js pois são específicos)
const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    marginVertical: 8,
    padding: 12,
    borderRadius: 12,
    alignSelf: 'center',
    maxWidth: 360,
    minWidth: 300,
    width: '100%',
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  mercado: {
    fontWeight: 'bold',
    color: '#444',
    fontSize: 16,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  info: {
    flex: 1,
  },
  nome: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  marca: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
  },
  descricao: {
    fontSize: 13,
    color: '#666',
  },
  precoContainer: {
    minWidth: 80,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  preco: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007BFF',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  data: {
    color: '#777',
  },
  hora: {
    color: '#777',
  },
});
