// Screens.js
// 🖥️ Arquivo contendo todas as telas do app (Home, Leitura, Cadastro e Histórico)

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, 
  ScrollView, Alert, FlatList, Button, Dimensions
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







// Estilos centralizados
import { styles } from './Styles';

// Funções utilitárias
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
        Alert.alert('Permissão negada', 'Não foi possível acessar a localização.');
        return;
      }

      let location = await Location.getLastKnownPositionAsync() || await Location.getCurrentPositionAsync();
      const { latitude, longitude } = location.coords;

      const snapshot = await db.collection('mercados').get();
      const mercados = snapshot.docs.map(doc => ({
        id: doc.id,
        nome: doc.data().Nome,
        coordenadas: doc.data().Coordenadas
      }));

      const mercado = encontrarMercadoProximo(latitude, longitude, mercados);

      if (mercado) {
        const distanciaKm = calcularDistancia(
          latitude, longitude,
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
        <View style={{ padding: 10, backgroundColor: '#eee', borderRadius: 8, marginBottom: 10 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold' }}>
            📍 {mercadoProximo?.nome || 'Mercado desconhecido'}{mercadoProximo?.distanciaMetros ? ` (${mercadoProximo.distanciaMetros}m)` : ''}
          </Text>
        </View>
      )}

      <Text style={styles.title}>Controle de Preços</Text>
      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("Leitura")}>
        <Text style={styles.buttonText}>Iniciar Leitura</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("Histórico")}>
        <Text style={styles.buttonText}>Histórico</Text>
      </TouchableOpacity>
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
  const [preco, setPreco] = useState("");
  const [leiturasHoje, setLeiturasHoje] = useState([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [precisaAtualizar, setPrecisaAtualizar] = useState(false);
  const [feedbackVisual, setFeedbackVisual] = useState(false);
  const [totalCarrinho, setTotalCarrinho] = useState(0);
  const [quantidadeCarrinho, setQuantidadeCarrinho] = useState(0);
  const [mercadoProximo, setMercadoProximo] = useState(null);
  const [variacaoCarrinho, setVariacaoCarrinho] = useState(0);


  // Busca mercado ao abrir a tela
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão negada', 'Não foi possível acessar a localização.');
        return;
      }

      let location =
        (await Location.getLastKnownPositionAsync()) ||
        (await Location.getCurrentPositionAsync());

      if (!location) {
        Alert.alert(
          "Erro ao obter localização",
          "Não foi possível acessar a localização atual. Verifique se o GPS está ativado."
        );
        setScanned(false);
        return;
      }

      const { latitude, longitude } = location.coords;

      const snapshot = await db.collection('mercados').get();
      const mercados = snapshot.docs.map(doc => ({
        id: doc.id,
        nome: doc.data().Nome,
        coordenadas: doc.data().Coordenadas
      }));

      const mercado = encontrarMercadoProximo(latitude, longitude, mercados);

      if (mercado) {
        const distanciaKm = calcularDistancia(
          latitude, longitude,
          mercado.coordenadas.latitude,
          mercado.coordenadas.longitude
        );
        const distanciaMetros = Math.round(distanciaKm * 1000);
        setMercadoProximo({ ...mercado, distanciaMetros });
      }
    })();
  }, []);

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
        console.error("Produto inválido:", produto);
        Alert.alert("Erro", "Produto não carregado corretamente.");
        return;
      }

      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permissão negada', 'Não foi possível acessar a localização.');
          return;
        }

        let location = await Location.getLastKnownPositionAsync() || await Location.getCurrentPositionAsync();
        const { latitude, longitude } = location.coords;

        const geopoint = new firebase.firestore.GeoPoint(latitude, longitude);

        await db.collection('leituras').add({
          codigo: produto.codigo,
          preco: parseFloat(preco.replace(",", ".")),
          timestamp: firebaseTimestamp(),
          geopoint: geopoint,
          mercado: mercadoProximo?.nome
        });

        // Atualiza a lista de leituras
        setPrecisaAtualizar(true);

        // Limpa estado
        setProdutoModal(null);
        setPreco("");
        setScanned(false);

      } catch (error) {
        console.error('Erro ao salvar leitura:', error.message || error);
        Alert.alert("Erro", `Falha ao salvar leitura. ERROR ID: ${error.message || error}`);
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
        console.error("Erro ao reproduzir som:", error);
      }

      try {
        const docRef = db.collection("produtos").doc(data);
        const docSnap = await docRef.get();

        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permissão negada', 'Não foi possível acessar a localização.');
          setScanned(false);
          return;
        }

        let location = await Location.getLastKnownPositionAsync() || await Location.getCurrentPositionAsync();
        const geopoint = new firebase.firestore.GeoPoint(location.coords.latitude, location.coords.longitude);

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
          setPreco("");

          console.log("🧾 Leitura salva:", {
            codigo: produtoFinal.codigo,
            preco: parseFloat(preco.replace(",", ".")), // este ainda será ajustado no modal
            timestamp: new Date(),
            mercado: mercadoProximo?.nome
          });

          // ✅ Agora sim: salva a leitura básica (com confirmado: false)
          await db.collection('leituras').add({
            codigo: produtoFinal.codigo,
            timestamp: firebaseTimestamp(),
            geopoint: geopoint,
            mercado: mercadoProximo.nome,
            confirmado: false,
          });
          console.log("✅ Leitura salva no Firebase:", {
            codigo: produto.codigo,
            preco: parseFloat(preco.replace(",", ".")),
            mercado: mercadoProximo?.nome,
            timestamp: new Date()
          });


        } else {
          Alert.alert(
            "📦 Produto desconhecido",
            "O produto não está cadastrado. Vamos registrá-lo agora.",
            [{
              text: 'OK',
              onPress: () => {
                setScanned(false);
                navigation.navigate("Cadastrar Produto", { codigo: data });
              }
            }],
            { cancelable: false }
          );
        }
      } catch (error) {
        console.error('Erro ao salvar leitura:', error.message || error);
        Alert.alert("Erro", `Falha ao salvar leitura. ERROR ID:  ${error.message || error}`);
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
          const snapshot = await db.collection("leituras")
            .where("timestamp", ">=", timestampHoje)
            .where("mercado", "==", mercadoProximo.nome)
            .get();

          const resultados = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(doc => doc.preco);

          console.log("📦 Leituras carregadas:", resultados);
          setLeiturasHoje(resultados);
        } catch (error) {
          console.error("Erro ao buscar leituras do dia:", error);
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
        }}
      >
      <CameraView
        style={{ flex: 1 }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
      >
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
      <View style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center',
        alignItems: 'center', zIndex: 10
      }}>
        <View style={{
          backgroundColor: 'white', padding: 20, borderRadius: 10,
          width: '80%', alignItems: 'center'
        }}>
          <View style={{ width: '100%', alignItems: 'flex-start' }}>
            <Text style={{ fontSize: 12, color: '#555', marginBottom: 5 }}>
              📍 {mercadoProximo?.nome || 'Mercado desconhecido'}
            </Text>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 2 }}>
              {produtoModal?.nome} ({produtoModal?.quantidade}{produtoModal?.unidade})
            </Text>
            <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 4 }}>
              {produtoModal?.marca}
            </Text>
            <Text style={{ fontSize: 14, color: '#444', marginBottom: 15 }}>
              {produtoModal?.descricao}
            </Text>
            <View style={{
              flexDirection: 'row', alignItems: 'center', width: '100%',
              borderColor: '#ccc', borderWidth: 1, borderRadius: 8,
              paddingHorizontal: 10, paddingVertical: 8, marginBottom: 15
            }}>
              <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#000', marginRight: 8 }}>R$</Text>
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
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
            <TouchableOpacity
              onPress={() => { setProdutoModal(null); setPreco(""); setScanned(false); }}
              style={{ backgroundColor: '#dc3545', padding: 10, borderRadius: 8, flex: 1, marginRight: 5 }}
            >
              <Text style={{ color: '#fff', textAlign: 'center', fontWeight: 'bold' }}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={salvando || !produtoModal || !produtoModal.codigo}
              onPress={confirmarLeitura}
              style={{
                backgroundColor: (salvando || !produtoModal) ? '#aaa' : '#28a745',
                padding: 10,
                borderRadius: 8,
                flex: 1,
                marginLeft: 5
              }}
            >
              <Text style={{ color: '#fff', textAlign: 'center', fontWeight: 'bold' }}>
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
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              textAlign: 'center',
              marginBottom: 6
            }}>
              Carrinho
            </Text>

            {leiturasHoje.length === 0 && (
              <Text style={{ color: '#888', textAlign: 'center', marginBottom: 10 }}>
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
            }}
          >
            {/* Nome do mercado */}
            <Text
              style={{
                fontSize: 12,
                color: '#555',
                marginBottom: 8,
                textAlign: 'center',
                lineHeight: 16
              }}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              📍 {mercadoProximo?.nome || 'Localizando...'}{mercadoProximo?.distanciaMetros ? ` (${mercadoProximo.distanciaMetros}m)` : ''}
            </Text>


            {/* Pares: Itens / Total / Economia */}
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 10, color: '#888' }}>itens</Text>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#000' }}>{quantidadeCarrinho}</Text>
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
                  color: variacaoCarrinho >= 0 ? 'green' : 'red'
                }}
              >
                {variacaoCarrinho >= 0 ? '+' : '-'}R$ {Math.abs(variacaoCarrinho).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      // 4️⃣ Terço inferior: Gráfico e lista (ou fallback)
      <View style={{
        flex: 1,
        backgroundColor: produtoSelecionado ? '#cce5ff' : '#e0e0e0',
        padding: 10,
        borderTopWidth: 1,
        borderColor: '#ccc',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        {produtoSelecionado ? (
          <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-between' }}>
            
            {/* 📈 Gráfico */}
            <View style={{
              flex: 1,
              backgroundColor: '#fff',
              marginRight: 5,
              borderRadius: 8,
              padding: 10,
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 4 }}>📈 Histórico</Text>
              <Text style={{ fontSize: 12 }}>{produtoSelecionado.codigo}</Text>
            </View>

            {/* 🏪 Mercados próximos */}
            <View style={{
              flex: 1,
              backgroundColor: '#fff',
              marginLeft: 5,
              borderRadius: 8,
              padding: 10,
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 4 }}>🏪 Outros mercados</Text>
              <Text style={{ fontSize: 12 }}>{produtoSelecionado.codigo}</Text>
            </View>
          </View>
        ) : (
          <Text style={{ fontSize: 14, color: '#555', textAlign: 'center', paddingHorizontal: 20 }}>
            Estamos de olho no histórico... selecione um produto para investigar 👀
          </Text>
        )}
      </View>
    </View>


  );
  
}

// =========================
// 📋 TELA: HISTÓRICO
// =========================
export function RegistrosScreen({ navigation }) {
  const [registros, setRegistros] = useState([]);
  const [filtro, setFiltro] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const snapshot = await db.collection('leituras').orderBy('timestamp', 'desc').limit(20).get();
        const dados = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRegistros(dados);
      } catch (error) {
        console.error('Erro ao buscar documentos:', error.message || error);
        Alert.alert("Erro", `Falha ao buscar documentos. ERROR ID:  ${error.message || error}`);
      }
    };
    fetchData();
  }, []);

  const registrosFiltrados = registros.filter(item =>
    item.codigo?.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Últimos Registros</Text>
      <TextInput
        style={styles.input}
        placeholder="Filtrar por código de barras..."
        value={filtro}
        onChangeText={setFiltro}
      />
      <FlatList
        contentContainerStyle={{ paddingBottom: 100, alignItems: 'center', width: '100%' }}
        data={registrosFiltrados}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <RegistroItem item={item} />}
      />
      <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
        <Text style={styles.buttonText}>Voltar</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// =========================
// 📝 TELA: CADASTRO MANUAL
// =========================
export function CadastroProdutoScreen({ route, navigation }) {
  const [codigo, setCodigo] = useState(route.params?.codigo || "");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [marca, setMarca] = useState("");
  const [categoria, setCategoria] = useState(categorias[0]);
  const [quantidade, setQuantidade] = useState("");
  const [unidade, setUnidade] = useState(unidadesPorCategoria[categorias[0]][0]);

  const cadastrarProduto = async () => {
    if (!codigo) return Alert.alert("Erro", "Código de barras é obrigatório.");

    try {
      await db.collection('produtos').doc(codigo).set({
        nome, descricao, marca, categoria,
        quantidade: Number(quantidade), unidade,
        timestamp: firebaseTimestamp()
      });
      Alert.alert("Sucesso", "Produto cadastrado com sucesso!");
      navigation.goBack();
    } catch (err) {
      console.error(err);
      Alert.alert("Erro", "Não foi possível cadastrar o produto.");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Cadastro de Produto</Text>
      <TextInput style={styles.input} placeholder="Código de Barras" value={codigo} onChangeText={setCodigo} />
      <TextInput style={styles.input} placeholder="Nome" value={nome} onChangeText={setNome} />
      <TextInput style={styles.input} placeholder="Descrição" value={descricao} onChangeText={setDescricao} />
      <TextInput style={styles.input} placeholder="Marca" value={marca} onChangeText={setMarca} />

      <Text style={{ fontSize: 16, marginBottom: 4 }}>Categoria:</Text>
      <Picker
        selectedValue={categoria}
        style={styles.input}
        onValueChange={(itemValue) => {
          setCategoria(itemValue);
          setUnidade(unidadesPorCategoria[itemValue][0]);
        }}
      >
        {categorias.map((cat) => (
          <Picker.Item label={cat} value={cat} key={cat} />
        ))}
      </Picker>

      <Text style={{ fontSize: 16, marginBottom: 4 }}>Unidade:</Text>
      <Picker
        selectedValue={unidade}
        style={styles.input}
        onValueChange={(itemValue) => setUnidade(itemValue)}
      >
        {unidadesPorCategoria[categoria].map((uni) => (
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
