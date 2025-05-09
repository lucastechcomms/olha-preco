// Components.js
// 🧩 Arquivo de componentes visuais reutilizáveis (pequenos ou modulares)

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { db } from './Utils'; // Importa acesso ao Firestore via Utils.js
import {
  calcularDistancia,
  formatarDistancia,
  corDoPrecoComparado,
  exibirData,
} from './Utils';

export function MiniCard({
  item,
  onSelect,
  selecionado,
  exibirMercado = false,
  localizacaoUsuario = null,
  precoComparativo = null, // ✅ Recebe média para comparação
}) {
  const [produto, setProduto] = useState(null);

  // ✅ Função local para exibir a data de forma amigável
  const exibirData = (timestamp) => {
    if (!timestamp) return 'Data não disponível';
    try {
      return timestamp.toDate().toLocaleString('pt-BR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return 'Formato inválido';
    }
  };

  useEffect(() => {
    const fetchProduto = async () => {
      try {
        const doc = await db.collection('produtos').doc(item.codigo).get();
        if (doc.exists) {
          setProduto(doc.data());
        }
      } catch (error) {
        console.error('Erro ao buscar produto no MiniCard:', error);
      }
    };

    fetchProduto();
  }, [item.codigo]);

  // ✅ Cálculo da distância se solicitado
  const [distanciaMetros, setDistanciaMetros] = useState(null);

  useEffect(() => {
    if (exibirMercado && localizacaoUsuario && item.geopoint) {
      const lat1 = localizacaoUsuario.latitude;
      const lon1 = localizacaoUsuario.longitude;
      const lat2 = item.geopoint.latitude;
      const lon2 = item.geopoint.longitude;

      const distanciaKm = calcularDistancia(lat1, lon1, lat2, lon2);
      setDistanciaMetros(Math.round(distanciaKm * 1000));
    }
  }, [exibirMercado, localizacaoUsuario, item.geopoint]);

  return (
    <TouchableOpacity
      onPress={() => onSelect(item)}
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 8,
        marginVertical: 4,
        marginHorizontal: 4,
        backgroundColor: selecionado ? '#cce5ff' : '#fff',
        borderColor: '#007bff',
        borderWidth: 1,
        borderRadius: 8,
        width: '95%',
      }}>
      {/* 🧱 Esquerda: Nome + Marca ou Mercado + Distância */}
      <View style={{ flex: 1, marginRight: 8 }}>
        <Text
          style={{ fontWeight: 'bold', fontSize: 14 }}
          numberOfLines={2}
          ellipsizeMode="tail">
          {exibirMercado
            ? item.mercado
            : produto?.nome || 'Nome não disponível'}
        </Text>

        <Text
          style={{ fontSize: 12, color: '#555' }}
          numberOfLines={1}
          ellipsizeMode="tail">
          {exibirMercado
            ? distanciaMetros !== null
              ? `${formatarDistancia(distanciaMetros)}`
              : ''
            : produto?.marca || ''}
        </Text>
      </View>

      {/* 💰 Direita: Preço + Data */}
      <View style={{ alignItems: 'flex-end', flexShrink: 1 }}>
        {/* Preço */}
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={{
            fontSize: 16,
            fontWeight: 'bold',
            color:
              precoComparativo !== null
                ? corDoPrecoComparado(item.preco, precoComparativo)
                : '#007bff',
          }}>
          R$ {item.preco?.toFixed(2)}
        </Text>

        {/* 📅 Data da leitura (opcional) */}
        {item.timestamp && (
          <Text style={{ fontSize: 10, color: '#777', marginTop: 2 }}>
            {exibirData(item.timestamp)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

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
        <Text style={styles.mercado}>
          📍 {item.mercado || 'Mercado desconhecido'}
        </Text>
      </View>

      {/* Detalhes do produto e preço */}
      <View style={styles.content}>
        <View style={styles.info}>
          <Text style={styles.nome}>
            {produto?.nome || 'Produto'}
            {produto?.quantidade
              ? ` (${produto.quantidade}${produto.unidade})`
              : ''}
          </Text>
          <Text style={styles.marca}>{produto?.marca}</Text>
          <Text style={styles.descricao}>{produto?.descricao}</Text>
        </View>
        <View style={styles.precoContainer}>
          <Text style={styles.preco}>
            {typeof item.preco === 'number'
              ? `R$ ${item.preco.toFixed(2)}`
              : '-'}
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
    color: '#777',
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
