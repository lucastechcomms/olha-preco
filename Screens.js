// Screens.js
// 🖥️ Arquivo contendo todas as telas do app (Home, Leitura, Cadastro e Histórico)

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  FlatList,
  Button,
  Dimensions,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';
import firebase from 'firebase';
import { useHeaderHeight } from '@react-navigation/elements';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RegistroItem, MiniCard } from './Components';
import { Vibration } from 'react-native';
import { Audio } from 'expo-av';
import sucesso from './assets/sucesso.mp3';
import { calcularResumoCarrinho } from './Utils';
import { haversineDistance } from './Utils';
import { styles } from './Styles';
import {
  db,
  firebaseTimestamp,
  categorias,
  unidadesPorCategoria,
  calcularDistancia,
  encontrarMercadoProximo,
  formatarPreco,
  handlePrecoChange,
} from './Utils';
import { LineChart } from 'react-native-chart-kit';
import { unidadesDisponiveis } from './Utils';

// Componentes reutilizáveis

// =========================
// 🏠 TELA: HOME
// =========================
export function HomeScreen({ navigation }) {
  const [mercadoProximo, setMercadoProximo] = useState(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permissão negada',
          'Não foi possível acessar a localização.'
        );
        return;
      }

      let location =
        (await Location.getLastKnownPositionAsync()) ||
        (await Location.getCurrentPositionAsync());
      const { latitude, longitude } = location.coords;

      const snapshot = await db.collection('mercados').get();
      const mercados = snapshot.docs
        .map((doc) => {
          const data = doc.data();
          const coords = data.coordenadas; //Correção no firebase "C" para "c"

          if (
            !coords ||
            coords.latitude === undefined ||
            coords.longitude === undefined
          ) {
            return null;
          }

          return {
            id: doc.id,
            nome: data.Nome,
            coordenadas: coords,
          };
        })
        .filter((m) => m !== null);

      const mercado = encontrarMercadoProximo(latitude, longitude, mercados);

      if (mercado) {
        const distanciaKm = calcularDistancia(
          latitude,
          longitude,
          mercado.coordenadas.latitude,
          mercado.coordenadas.longitude
        );
        const distanciaMetros = Math.round(distanciaKm * 1000);
        setMercadoProximo({ ...mercado, distanciaMetros });
      }
    })();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {mercadoProximo && (
        <View
          style={{
            padding: 10,
            backgroundColor: '#eee',
            borderRadius: 8,
            marginBottom: 10,
          }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold' }}>
            📍 {mercadoProximo?.nome || 'Mercado desconhecido'}
            {mercadoProximo?.distanciaMetros
              ? ` (${mercadoProximo.distanciaMetros}m)`
              : ''}
          </Text>
        </View>
      )}

      <Text style={styles.title}>Olha Preço!</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Leitura')}>
        <Text style={styles.buttonText}>Iniciar Leitura</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Mercados Próximos')}>
        <Text style={styles.buttonText}>Mercados Próximos</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Instruções')}>
        <Text style={styles.buttonText}>Instruções</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Sugestões')}>
        <Text style={styles.buttonText}>Sugestão</Text>
      </TouchableOpacity>
      <Text
        style={{
          fontSize: 10,
          color: '#777',
          marginTop: 20,
          textAlign: 'center',
        }}>
        🧠 Protótipo Olha Preço! • v1.0
      </Text>
      <Text
        style={{
          fontSize: 10,
          color: '#777',
          textAlign: 'center',
        }}>
        @lucastechcomms
      </Text>
    </SafeAreaView>
  );
}

// =========================
// 📷 TELA: LEITOR DE CÓDIGO
// =========================

export function BarcodeScannerScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [produtoModal, setProdutoModal] = useState(null);
  const [preco, setPreco] = useState('');
  const [leiturasHoje, setLeiturasHoje] = useState([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [precisaAtualizar, setPrecisaAtualizar] = useState(false);
  const [feedbackVisual, setFeedbackVisual] = useState(false);
  const [totalCarrinho, setTotalCarrinho] = useState(0);
  const [quantidadeCarrinho, setQuantidadeCarrinho] = useState(0);
  const [mercadoProximo, setMercadoProximo] = useState(null);
  const [variacaoCarrinho, setVariacaoCarrinho] = useState(0);
  const [leiturasOutros, setLeiturasOutros] = useState([]);
  const [linhaDoTempo, setLinhaDoTempo] = useState([]);

  //executa a consulta no Firebase sempre que um novo produto for selecionado no carrinho
  useEffect(() => {
    const carregarLeiturasOutrosMercados = async () => {
      if (!produtoSelecionado?.codigo || !mercadoProximo) return;

      try {
        const snapshot = await db
          .collection('leituras')
          .where('codigo', '==', produtoSelecionado.codigo)
          .orderBy('timestamp', 'desc')
          .limit(50) // buscamos várias para garantir que temos amostras recentes
          .get();

        const leituras = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((item) => typeof item.preco === 'number' && item.mercado);

        // Agrupa por mercado, pegando apenas a leitura mais recente de cada mercado
        const ultimaLeituraPorMercado = {};
        for (const leitura of leituras) {
          if (!ultimaLeituraPorMercado[leitura.mercado]) {
            ultimaLeituraPorMercado[leitura.mercado] = leitura;
          }
        }

        // Transforma em array e filtra
        const leiturasFiltradas = Object.values(ultimaLeituraPorMercado).filter(
          (leitura) => {
            // Ignora o próprio mercado atual
            if (leitura.mercado === mercadoProximo.nome) return false;

            // Garante que tenha geopoint válido
            if (!leitura.geopoint) return false;

            // Calcula a distância até o mercado atual
            const distanciaKm = calcularDistancia(
              mercadoProximo.coordenadas.latitude,
              mercadoProximo.coordenadas.longitude,
              leitura.geopoint.latitude,
              leitura.geopoint.longitude
            );

            leitura.distanciaKm = distanciaKm; // salva para usar na ordenação depois

            return distanciaKm <= 20; // mantém apenas se for até 20km
          }
        );

        // Ordena por distância crescente
        leiturasFiltradas.sort((a, b) => a.distanciaKm - b.distanciaKm);

        // Atualiza o estado com os resultados
        setLeiturasOutros(leiturasFiltradas);
      } catch (error) {
        console.error('Erro ao buscar leituras de outros mercados:', error);
      }
    };

    carregarLeiturasOutrosMercados();
  }, [produtoSelecionado?.codigo, mercadoProximo]);

  // Busca mercado ao abrir a tela
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permissão negada',
          'Não foi possível acessar a localização.'
        );
        return;
      }

      let location =
        (await Location.getLastKnownPositionAsync()) ||
        (await Location.getCurrentPositionAsync());

      if (!location) {
        Alert.alert(
          'Erro ao obter localização',
          'Não foi possível acessar a localização atual. Verifique se o GPS está ativado.'
        );
        setScanned(false);
        return;
      }

      const { latitude, longitude } = location.coords;

      const snapshot = await db.collection('mercados').get();
      const mercados = snapshot.docs
        .map((doc) => {
          const data = doc.data();
          const coords = data.coordenadas; //Correção no firebase "C" para "c"

          if (
            !coords ||
            coords.latitude === undefined ||
            coords.longitude === undefined
          ) {
            return null;
          }

          return {
            id: doc.id,
            nome: data.Nome,
            coordenadas: coords,
          };
        })
        .filter((m) => m !== null);

      const mercado = encontrarMercadoProximo(latitude, longitude, mercados);

      if (mercado) {
        const distanciaKm = calcularDistancia(
          latitude,
          longitude,
          mercado.coordenadas.latitude,
          mercado.coordenadas.longitude
        );
        const distanciaMetros = Math.round(distanciaKm * 1000);
        setMercadoProximo({ ...mercado, distanciaMetros });
      }
    })();
  }, []);

  //Carregue os dados da linha do tempo
  useEffect(() => {
    const carregarLinhaDoTempo = async () => {
      if (!produtoSelecionado?.codigo || !mercadoProximo?.nome) return;

      try {
        const snapshot = await db
          .collection('leituras')
          .where('codigo', '==', produtoSelecionado.codigo)
          .where('mercado', '==', mercadoProximo.nome)
          .orderBy('timestamp', 'desc')
          .limit(50) // traz mais para garantir variedade de dias
          .get();

        const leituras = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((doc) => typeof doc.preco === 'number' && doc.timestamp);

        // Agrupar por data (ignorando horas/minutos)
        const ultimaLeituraPorDia = {};

        for (const leitura of leituras) {
          const data = leitura.timestamp.toDate();
          const chaveDia = data.toISOString().split('T')[0]; // "YYYY-MM-DD"

          // Só adiciona se ainda não tiver leitura desse dia
          if (!ultimaLeituraPorDia[chaveDia]) {
            ultimaLeituraPorDia[chaveDia] = leitura;
          }
        }

        // Transforma em array e ordena por data decrescente
        const leiturasFiltradas = Object.values(ultimaLeituraPorDia).sort(
          (a, b) => b.timestamp.toDate() - a.timestamp.toDate()
        );

        setLinhaDoTempo(leiturasFiltradas);
      } catch (error) {
        console.error('Erro ao buscar histórico do produto:', error);
      }
    };

    carregarLinhaDoTempo();
  }, [produtoSelecionado?.codigo, mercadoProximo?.nome]);

  useEffect(() => {
    if (leiturasHoje.length > 0) {
      const { total, quantidade } = calcularResumoCarrinho(leiturasHoje);
      setTotalCarrinho(total);
      setQuantidadeCarrinho(quantidade);
    } else {
      setTotalCarrinho(0);
      setQuantidadeCarrinho(0);
    }
  }, [leiturasHoje]);

  const [salvando, setSalvando] = useState(false);
  const confirmarLeitura = async () => {
    const produto = produtoModal;

    if (!produto || !produto.codigo) {
      console.error('Produto inválido:', produto);
      Alert.alert('Erro', 'Produto não carregado corretamente.');
      return;
    }

    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permissão negada',
          'Não foi possível acessar a localização.'
        );
        return;
      }

      let location =
        (await Location.getLastKnownPositionAsync()) ||
        (await Location.getCurrentPositionAsync());
      const { latitude, longitude } = location.coords;

      const geopoint = new firebase.firestore.GeoPoint(latitude, longitude);

      await db.collection('leituras').add({
        codigo: produto.codigo,
        preco: parseFloat(preco.replace(',', '.')),
        timestamp: firebaseTimestamp(),
        geopoint: geopoint,
        mercado: mercadoProximo?.nome,
      });

      // Atualiza a lista de leituras
      setPrecisaAtualizar(true);

      // Limpa estado
      setProdutoModal(null);
      setPreco('');
      setScanned(false);
    } catch (error) {
      console.error('Erro ao salvar leitura:', error.message || error);
      Alert.alert(
        'Erro',
        `Falha ao salvar leitura. ERROR ID: ${error.message || error}`
      );
    } finally {
      setSalvando(false);
    }
  };

  const handleBarCodeScanned = async ({ data }) => {
    setScanned(true);

    // ✅ Feedback sensorial imediato
    Vibration.vibrate(100); // vibra por 100ms
    setFeedbackVisual(true); // ativa a borda verde (caso esteja implementando)
    setTimeout(() => setFeedbackVisual(false), 300); // desativa após 300ms

    try {
      const soundObject = new Audio.Sound();
      await soundObject.loadAsync(sucesso);
      await soundObject.playAsync();
    } catch (error) {
      console.error('Erro ao reproduzir som:', error);
    }

    try {
      const docRef = db.collection('produtos').doc(data);
      const docSnap = await docRef.get();

      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permissão negada',
          'Não foi possível acessar a localização.'
        );
        setScanned(false);
        return;
      }

      let location =
        (await Location.getLastKnownPositionAsync()) ||
        (await Location.getCurrentPositionAsync());
      const geopoint = new firebase.firestore.GeoPoint(
        location.coords.latitude,
        location.coords.longitude
      );

      if (docSnap.exists) {
        const produto = docSnap.data();

        // ✅ Preenche corretamente o produtoModal antes de salvar leitura
        const produtoFinal = {
          nome: produto.nome || 'Sem nome',
          codigo: data,
          marca: produto.marca || '',
          descricao: produto.descricao || '',
          quantidade: produto.quantidade || '',
          unidade: produto.unidade || '',
        };

        setProdutoModal(produtoFinal);
        setPreco('');

        console.log('🧾 Leitura salva:', {
          codigo: produtoFinal.codigo,
          preco: parseFloat(preco.replace(',', '.')), // este ainda será ajustado no modal
          timestamp: new Date(),
          mercado: mercadoProximo?.nome,
        });

        // ✅ Agora sim: salva a leitura básica (com confirmado: false)
        await db.collection('leituras').add({
          codigo: produtoFinal.codigo,
          timestamp: firebaseTimestamp(),
          geopoint: geopoint,
          mercado: mercadoProximo.nome,
          confirmado: false,
        });
        console.log('✅ Leitura salva no Firebase:', {
          codigo: produto.codigo,
          preco: parseFloat(preco.replace(',', '.')),
          mercado: mercadoProximo?.nome,
          timestamp: new Date(),
        });
      } else {
        Alert.alert(
          '📦 Produto desconhecido',
          'O produto não está cadastrado. Vamos registrá-lo agora.',
          [
            {
              text: 'OK',
              onPress: () => {
                setScanned(false);
                navigation.navigate('Cadastrar Produto', { codigo: data });
              },
            },
          ],
          { cancelable: false }
        );
      }
    } catch (error) {
      console.error('Erro ao salvar leitura:', error.message || error);
      Alert.alert(
        'Erro',
        `Falha ao salvar leitura. ERROR ID:  ${error.message || error}`
      );
      setScanned(false);
    }
  };

  // Fora do useEffect, mas DENTRO do BarcodeScannerScreen
  const carregarLeiturasDoDia = async () => {
    if (!mercadoProximo?.nome) return;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const timestampHoje = firebase.firestore.Timestamp.fromDate(hoje);

    try {
      const snapshot = await db
        .collection('leituras')
        .where('timestamp', '>=', timestampHoje)
        .where('mercado', '==', mercadoProximo.nome)
        .get();

      const resultados = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((doc) => doc.preco);

      console.log('📦 Leituras carregadas:', resultados);
      setLeiturasHoje(resultados);
    } catch (error) {
      console.error('Erro ao buscar leituras do dia:', error);
    }
  };

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (precisaAtualizar) {
      carregarLeiturasDoDia();
      setPrecisaAtualizar(false); // reseta o gatilho
    }
  }, [precisaAtualizar, mercadoProximo?.nome]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (mercadoProximo?.nome) {
      carregarLeiturasDoDia();
    }
  }, [mercadoProximo?.nome]);

  //UseEffect para atualização de estado da câmera
  /*useEffect(() => {
    (async () => {
      const { status } = await CameraView.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        alert('Precisamos da permissão da câmera!');
      }
    })();
  }, []);

  if (!permission?.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Permissão da Câmera não concedida.</Text>
        <Button title="Solicitar Permissão" onPress={requestPermission} />
      </SafeAreaView>
    );
  }*/

  const screenHeight = Dimensions.get('window').height;
  const headerHeight = useHeaderHeight();
  const usableHeight = screenHeight - headerHeight;

  // 📊 Prepara os dados do gráfico de linha da linha do tempo
  const dadosGrafico = {
    labels: linhaDoTempo
      .map((item) => {
        const data = item.timestamp.toDate();
        return `${data.getDate().toString().padStart(2, '0')}/${(
          data.getMonth() + 1
        )
          .toString()
          .padStart(2, '0')}`; // formato DD/MM
      })
      .reverse(), // do mais antigo para o mais recente
    datasets: [
      {
        data: linhaDoTempo.map((item) => item.preco).reverse(), // mesmos índices da label
        color: () => '#007bff', // cor da linha
        strokeWidth: 2, // espessura da linha
      },
    ],
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f4f4f4' }}>
      {/* 1️⃣ Câmera reduzida */}
      <View
        style={{
          flex: 1,
          borderWidth: 4,
          borderColor: feedbackVisual ? 'limegreen' : 'transparent',
          borderRadius: 12,
          overflow: 'hidden',
        }}>
        <CameraView
          style={{ flex: 1 }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'],
          }}>
          {/* Overlay */}
          <View style={styles.layerContainer}>
            <View style={styles.layerTop} />
            <View style={styles.layerCenter}>
              <View style={styles.layerLeft} />
              <View style={styles.layerFocused} />
              <View style={styles.layerRight} />
            </View>
            <View style={styles.layerBottom} />
          </View>
        </CameraView>
      </View>
      {/* 2️⃣ Modal para confirmar preço no topo de tudo */}
      {produtoModal && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10,
          }}>
          <View
            style={{
              backgroundColor: 'white',
              padding: 20,
              borderRadius: 10,
              width: '80%',
              alignItems: 'center',
            }}>
            <View style={{ width: '100%', alignItems: 'flex-start' }}>
              <Text style={{ fontSize: 12, color: '#555', marginBottom: 5 }}>
                📍 {mercadoProximo?.nome || 'Mercado desconhecido'}
              </Text>
              <Text
                style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 2 }}>
                {produtoModal?.nome} ({produtoModal?.quantidade}
                {produtoModal?.unidade})
              </Text>
              <Text
                style={{ fontSize: 16, fontWeight: '600', marginBottom: 4 }}>
                {produtoModal?.marca}
              </Text>
              <Text style={{ fontSize: 14, color: '#444', marginBottom: 15 }}>
                {produtoModal?.descricao}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  width: '100%',
                  borderColor: '#ccc',
                  borderWidth: 1,
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  marginBottom: 15,
                }}>
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: 'bold',
                    color: '#000',
                    marginRight: 8,
                  }}>
                  R$
                </Text>
                <TextInput
                  style={{ flex: 1, fontSize: 20, textAlign: 'center' }}
                  value={preco}
                  onChangeText={(text) => handlePrecoChange(text, setPreco)}
                  keyboardType="numeric"
                  placeholder="0,00"
                />
              </View>
            </View>

            {/* Botões */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                width: '100%',
              }}>
              <TouchableOpacity
                onPress={() => {
                  setProdutoModal(null);
                  setPreco('');
                  setScanned(false);
                }}
                style={{
                  backgroundColor: '#dc3545',
                  padding: 10,
                  borderRadius: 8,
                  flex: 1,
                  marginRight: 5,
                }}>
                <Text
                  style={{
                    color: '#fff',
                    textAlign: 'center',
                    fontWeight: 'bold',
                  }}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={salvando || !produtoModal || !produtoModal.codigo}
                onPress={confirmarLeitura}
                style={{
                  backgroundColor:
                    salvando || !produtoModal ? '#aaa' : '#28a745',
                  padding: 10,
                  borderRadius: 8,
                  flex: 1,
                  marginLeft: 5,
                }}>
                <Text
                  style={{
                    color: '#fff',
                    textAlign: 'center',
                    fontWeight: 'bold',
                  }}>
                  {salvando ? 'Salvando...' : 'Confirmar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
      {/* 3️⃣ Segundo terço: Carrinho e Consolidado */}
      <View style={{ flex: 2, flexDirection: 'row' }}>
        {/* Parte esquerda - carrinho */}
        <View style={{ flex: 1, padding: 8 }}>
          <View style={{ height: usableHeight / 3 }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: 'bold',
                textAlign: 'center',
                marginBottom: 6,
              }}>
              Carrinho
            </Text>

            {leiturasHoje.length === 0 && (
              <Text
                style={{
                  color: '#888',
                  textAlign: 'center',
                  marginBottom: 10,
                }}>
                Nenhuma leitura registrada hoje
              </Text>
            )}

            <FlatList
              data={leiturasHoje}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <MiniCard
                  item={item}
                  onSelect={(itemSelecionado) => {
                    if (produtoSelecionado?.id === itemSelecionado.id) {
                      setProdutoSelecionado(null); // desmarca se já estiver selecionado
                    } else {
                      setProdutoSelecionado(itemSelecionado); // marca novo
                    }
                  }}
                  selecionado={produtoSelecionado?.id === item.id}
                />
              )}
              showsVerticalScrollIndicator={true}
            />
          </View>
        </View>

        {/* Parte direita - consolidado */}
        <View style={{ height: screenHeight / 3, padding: 8 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: '#f8f9fa',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#ccc',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 10,
              paddingHorizontal: 12,
            }}>
            {/* Nome do mercado */}
            <Text
              style={{
                fontSize: 12,
                color: '#555',
                marginBottom: 8,
                textAlign: 'center',
                lineHeight: 16,
              }}
              numberOfLines={2}
              ellipsizeMode="tail">
              📍 {mercadoProximo?.nome || 'Localizando...'}
              {mercadoProximo?.distanciaMetros
                ? ` (${mercadoProximo.distanciaMetros}m)`
                : ''}
            </Text>

            {/* Pares: Itens / Total / Economia */}
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 10, color: '#888' }}>itens</Text>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#000' }}>
                {quantidadeCarrinho}
              </Text>
            </View>

            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 10, color: '#888' }}>total</Text>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#000' }}>
                R$ {totalCarrinho.toFixed(2)}
              </Text>
            </View>

            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 10, color: '#888' }}>economia</Text>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: 'bold',
                  color: variacaoCarrinho >= 0 ? 'green' : 'red',
                }}>
                {variacaoCarrinho >= 0 ? '+' : '-'}R${' '}
                {Math.abs(variacaoCarrinho).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>
      </View>
      {/*
      // 4️⃣ Terço inferior: Gráfico e lista (ou fallback)
      */}
      <View
        style={{
          flex: 2,
          backgroundColor: produtoSelecionado ? '#cce5ff' : '#e0e0e0',
          padding: 10,
          borderTopWidth: 1,
          borderColor: '#ccc',
          justifyContent: 'flex-start',
        }}>
        {produtoSelecionado ? (
          <>
            {/* TÍTULOS no topo da área azul */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginBottom: 6,
              }}>
              <View style={{ width: '48%' }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: 'bold',
                    textAlign: 'center',
                    color: '#004080',
                  }}>
                  Linha do tempo
                </Text>
              </View>
              <View style={{ width: '48%' }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: 'bold',
                    textAlign: 'center',
                    color: '#004080',
                  }}>
                  Outros Mercados
                </Text>
              </View>
            </View>

            {/* BLOCO VISUAL CINZA COM CONTEÚDO */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                flex: 1,
              }}>
              {/* 📈 Linha do tempo */}
              <View
                style={{
                  width: '48%',
                  backgroundColor: '#e0e0e0',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#999',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: 10,
                }}>
                {linhaDoTempo.length < 2 ? (
                  <Text style={{ color: '#555', fontSize: 12 }}>
                    Não há dados suficientes para exibir o gráfico
                  </Text>
                ) : (
                  <LineChart
                    data={dadosGrafico}
                    width={Dimensions.get('window').width * 0.45} // 48% da tela com padding
                    height={200}
                    fromZero={true}
                    chartConfig={{
                      backgroundColor: '#e0e0e0',
                      backgroundGradientFrom: '#e0e0e0',
                      backgroundGradientTo: '#e0e0e0',
                      decimalPlaces: 2,
                      color: (opacity = 1) => `rgba(0, 123, 255, ${opacity})`,
                      labelColor: () => '#333',
                      style: { borderRadius: 12 },
                      propsForDots: {
                        r: '5',
                        strokeWidth: '2',
                        stroke: '#007bff',
                      },
                    }}
                    bezier
                    style={{
                      marginVertical: 8,
                      borderRadius: 12,
                    }}
                  />
                )}
              </View>

              {/* 🏪 Outros Mercados */}
              <View
                style={{
                  width: '48%',
                  backgroundColor: '#e0e0e0',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#999',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: 10,
                }}>
                {/* Conteúdo futuro de mercados alternativos */}
                {leiturasOutros.length === 0 ? (
                  <Text
                    style={{
                      fontSize: 12,
                      color: '#777',
                      textAlign: 'center',
                    }}>
                    Nenhuma leitura encontrada
                  </Text>
                ) : (
                  <FlatList
                    data={leiturasOutros}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                      <MiniCard
                        item={item}
                        onSelect={() => {}}
                        selecionado={false}
                        exibirMercado={true}
                        localizacaoUsuario={mercadoProximo?.coordenadas}
                        precoComparativo={produtoSelecionado?.preco || 0} // ✅ AQUI ESTÁ O TRECHO
                      />
                    )}
                    showsVerticalScrollIndicator={true}
                    contentContainerStyle={{ paddingBottom: 8 }}
                  />
                )}
              </View>
            </View>
          </>
        ) : (
          <View
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text
              style={{
                fontSize: 14,
                color: '#555',
                textAlign: 'center',
                paddingHorizontal: 20,
              }}>
              Estamos de olho no histórico... selecione um produto para
              investigar 👀
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// =========================
// 📍 TELA: MERCADOS PRÓXIMOS
// =========================
export function MercadosProximosScreen({ navigation }) {
  const [mercadosProximos, setMercadosProximos] = useState([]);
  const [localizacao, setLocalizacao] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const carregarDados = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permissão negada',
            'Não foi possível acessar a localização.'
          );
          setCarregando(false);
          return;
        }

        const location =
          (await Location.getLastKnownPositionAsync()) ||
          (await Location.getCurrentPositionAsync());

        if (!location) {
          Alert.alert('Erro', 'Não foi possível obter sua localização atual.');
          setCarregando(false);
          return;
        }

        const { latitude, longitude } = location.coords;
        setLocalizacao({ latitude, longitude });

        const snapshot = await db.collection('mercados').get();

        if (snapshot.empty) {
          Alert.alert('Nenhum mercado encontrado no banco de dados.');
          setCarregando(false);
          return;
        }

        const mercados = snapshot.docs
          .map((doc) => {
            const data = doc.data();
            const coordenadas = data.coordenadas; //Correção no firebase "C" para "c"

            // Verifica se coordenadas estão presentes
            if (
              !coordenadas ||
              coordenadas.latitude === undefined ||
              coordenadas.longitude === undefined
            ) {
              return null; // Ignora este mercado
            }

            const distancia = calcularDistancia(
              latitude,
              longitude,
              coordenadas.latitude,
              coordenadas.longitude
            );

            return {
              id: doc.id,
              nome: data.Nome,
              cidade: data.Cidade || 'Cidade não informada', // 👈 aqui garantimos que terá cidade
              geopoint: coordenadas,
              distanciaKm: distancia,
            };
          })
          .filter((item) => item !== null); // Remove os nulos

        const maisProximos = mercados
          .sort((a, b) => a.distanciaKm - b.distanciaKm)
          .slice(0, 20);

        console.log('📡 Localização obtida:', latitude, longitude);
        console.log(
          '📦 Mercados carregados do Firebase:',
          snapshot.docs.length
        );
        console.log('✅ Mercados com coordenadas válidas:', mercados.length);
        console.log('🏪 Mercados mais próximos:', maisProximos);

        setMercadosProximos(maisProximos);
      } catch (erro) {
        console.error('Erro ao carregar mercados próximos:', erro);
        Alert.alert('Erro', 'Falha ao carregar os mercados próximos.');
      } finally {
        setCarregando(false);
      }
    };

    carregarDados();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Mercados Próximos</Text>

      {carregando ? (
        <Text style={{ textAlign: 'center', color: '#888', marginTop: 20 }}>
          Buscando mercados próximos...
        </Text>
      ) : mercadosProximos.length === 0 ? (
        <Text style={{ textAlign: 'center', color: '#888', marginTop: 20 }}>
          Nenhum mercado encontrado próximo à sua localização.
        </Text>
      ) : (
        <FlatList
          data={mercadosProximos}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            console.log('🛒 Item do mercado:', item);
            // Cria um objeto com os campos que o MiniCard espera
            // 🔧 Adapta os campos esperados pelo MiniCard com segurança
            const itemFormatado = {
              id: item.id,
              mercado: item.nome || 'Mercado sem nome',
              cidade: item.cidade || 'Cidade não informada',
              preco: 0, // obrigatório para o MiniCard, mesmo que sem preço
              geopoint: item.geopoint || item.coordenadas || null, // garante que sempre tenha geopoint
            };

            return (
              <MiniCard
                item={itemFormatado}
                modoLocalizacao={true} // mostra distância no lugar do preço
                exibirMercado={true} // mostra nome do mercado
                localizacaoUsuario={localizacao} // posição do usuário
                onSelect={() => {}} // sem ação ao clicar por enquanto
                selecionado={false}
              />
            );
          }}
          contentContainerStyle={{ paddingBottom: 16 }}
        />
      )}
    </SafeAreaView>
  );
}

// =========================
// 📝 TELA: CADASTRO MANUAL
// =========================
export function CadastroProdutoScreen({ route, navigation }) {
  const [codigo, setCodigo] = useState(route.params?.codigo || '');
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [marca, setMarca] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [unidade, setUnidade] = useState(unidadesDisponiveis[0]);

  const cadastrarProduto = async () => {
    if (!codigo) return Alert.alert('Erro', 'Código de barras é obrigatório.');

    try {
      await db
        .collection('produtos')
        .doc(codigo)
        .set({
          nome,
          descricao,
          marca,
          quantidade: Number(quantidade),
          unidade,
          timestamp: firebaseTimestamp(),
        });

      Alert.alert('Sucesso', 'Produto cadastrado com sucesso!');
      navigation.goBack();
    } catch (err) {
      console.error(err);
      Alert.alert('Erro', 'Não foi possível cadastrar o produto.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Cadastro de Produto</Text>
      <TextInput
        style={styles.input}
        placeholder="Código de Barras"
        value={codigo}
        onChangeText={setCodigo}
      />
      <TextInput
        style={styles.input}
        placeholder="Nome"
        value={nome}
        onChangeText={setNome}
      />
      <TextInput
        style={styles.input}
        placeholder="Descrição"
        value={descricao}
        onChangeText={setDescricao}
      />
      <TextInput
        style={styles.input}
        placeholder="Marca"
        value={marca}
        onChangeText={setMarca}
      />

      <Text style={{ fontSize: 16, marginBottom: 4 }}>Unidade:</Text>
      <Picker
        selectedValue={unidade}
        style={styles.input}
        onValueChange={(itemValue) => setUnidade(itemValue)}>
        {unidadesDisponiveis.map((uni) => (
          <Picker.Item label={uni} value={uni} key={uni} />
        ))}
      </Picker>

      <TextInput
        style={styles.input}
        placeholder="Quantidade"
        keyboardType="numeric"
        value={quantidade}
        onChangeText={setQuantidade}
      />

      <TouchableOpacity style={styles.button} onPress={cadastrarProduto}>
        <Text style={styles.buttonText}>Salvar Produto</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// =========================
// 📘 TELA: INSTRUÇÕES DE TESTE
// =========================
export function InstrucoesScreen() {
  const produtos = [
    { nome: 'Arroz', emoji: '🍚' },
    { nome: 'Feijão', emoji: '🥣' },
    { nome: 'Leite', emoji: '🥛' },
    { nome: 'Ovos', emoji: '🥚' },
    { nome: 'Óleo de cozinha', emoji: '🛢️' },
  ];

  return (
    <ScrollView
      contentContainerStyle={{
        padding: 20,
        backgroundColor: '#f9f9f9',
        flexGrow: 1,
      }}>
      <Text
        style={{
          fontSize: 22,
          fontWeight: 'bold',
          marginBottom: 12,
          textAlign: 'center',
        }}>
        🧪 Instruções para Teste
      </Text>
      <Text
        style={{
          fontSize: 16,
          marginBottom: 20,
          textAlign: 'center',
          color: '#333',
        }}>
        Durante esta fase de teste, pedimos que você registre os preços dos
        seguintes produtos básicos. Utilize o leitor de código de barras para
        cada item listado abaixo:
      </Text>

      {produtos.map((item, index) => (
        <View
          key={index}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#fff',
            padding: 12,
            marginVertical: 6,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#ddd',
          }}>
          <Text style={{ fontSize: 28, marginRight: 12 }}>{item.emoji}</Text>
          <Text style={{ fontSize: 18 }}>{item.nome}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

// =========================
// 💬 TELA: SUGESTÕES
// =========================
export function SugestoesScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [enviado, setEnviado] = useState(false);

  const enviarSugestao = async () => {
    try {
      await db.collection('contato').add({
        email,
        mensagem,
        timestamp: firebaseTimestamp(),
      });
      setEmail('');
      setMensagem('');
      setEnviado(true);
      setTimeout(() => setEnviado(false), 3000); // Oculta após 3s
    } catch (error) {
      console.error('Erro ao enviar sugestão:', error);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Sugestões e Comentários</Text>

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        keyboardType="email-address"
      />

      <TextInput
        placeholder="Escreva aqui sua sugestão..."
        value={mensagem}
        onChangeText={setMensagem}
        style={[styles.input, { height: 120, textAlignVertical: 'top' }]}
        multiline
      />

      <TouchableOpacity style={styles.button} onPress={enviarSugestao}>
        <Text style={styles.buttonText}>Enviar</Text>
      </TouchableOpacity>

      {enviado && (
        <Text style={{ color: 'green', marginTop: 10, textAlign: 'center' }}>
          Obrigado pela sua sugestão! 💬
        </Text>
      )}
    </ScrollView>
  );
}
