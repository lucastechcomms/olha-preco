// Screens.js
// 🖥️ Arquivo contendo todas as telas do app (Home, Leitura, Cadastro e Histórico)

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, Alert, FlatList, Button
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';
import firebase from 'firebase';

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
import { RegistroItem } from './Components';

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
    <View style={styles.container}>
      {mercadoProximo && (
        <View style={{ padding: 10, backgroundColor: '#eee', borderRadius: 8, marginBottom: 10 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold' }}>
            📍 {mercadoProximo.nome} ({mercadoProximo.distanciaMetros}m)
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
    </View>
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

  const confirmarLeitura = async () => {
    if (!produtoModal) return;

    try {
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

      const mercadoProximo = encontrarMercadoProximo(latitude, longitude, mercados);

      if (!mercadoProximo) {
        Alert.alert('Erro', 'Não foi possível encontrar o mercado mais próximo.');
        return;
      }

      const geopoint = new firebase.firestore.GeoPoint(latitude, longitude);

      await db.collection('leituras').add({
        codigo: produtoModal.codigo,
        preco: parseFloat(preco.replace(",", ".")),
        timestamp: firebaseTimestamp(),
        geopoint: geopoint,
        mercado: mercadoProximo.nome
      });

      setProdutoModal(null);
      setPreco("");
      setScanned(false);
    } catch (error) {
      console.error('Erro ao salvar leitura:', error.message || error);
      Alert.alert("Erro", "Não foi possível salvar o preço.");
      Alert.alert("Erro", `Não foi possível salvar o preço. ERROR ID: ${error.message || error}`);
    }
  };

  const handleBarCodeScanned = async ({ data }) => {
    setScanned(true);

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

      await db.collection('leituras').add({
        codigo: data,
        timestamp: firebaseTimestamp(),
        geopoint: geopoint,
      });

      if (docSnap.exists) {
        const produto = docSnap.data();
        setProdutoModal({
          nome: produto.nome || 'Sem nome',
          codigo: data,
          marca: produto.marca || '',
          descricao: produto.descricao || '',
          quantidade: produto.quantidade || '',
          unidade: produto.unidade || '',
        });
        setPreco("");
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

  useEffect(() => {
    (async () => {
      const { status } = await CameraView.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        alert('Precisamos da permissão da câmera!');
      }
    })();
  }, []);

  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <Text>Permissão da Câmera não concedida.</Text>
        <Button title="Solicitar Permissão" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <CameraView
        style={styles.camera}
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

        {/* Modal para confirmar preço */}
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
                  📍 {produtoModal?.mercado || 'Mercado'}
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
                  onPress={confirmarLeitura}
                  style={{ backgroundColor: '#28a745', padding: 10, borderRadius: 8, flex: 1, marginLeft: 5 }}
                >
                  <Text style={{ color: '#fff', textAlign: 'center', fontWeight: 'bold' }}>Confirmar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </CameraView>
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
    <View style={styles.container}>
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
    </View>
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
