# 📦 Olha Preço — Estrutura do Projeto

Este projeto foi organizado com foco em **facilidade de modificação assistida por IA**  
e **manutenção simples**.  
A estrutura utiliza o padrão **Minimalista** com apenas 5 arquivos principais.

---

## 🗂️ Estrutura de Arquivos

/ (pasta raiz do projeto) ├── App.js ├── Screens.js ├── Components.js ├── Utils.js ├── Styles.js ├── package.json ├── node_modules/ └── ...


---

## 📋 Descrição dos Arquivos

| Arquivo         | Função                                                                 |
|-----------------|------------------------------------------------------------------------|
| `App.js`         | Controla a navegação principal entre telas.                            |
| `Screens.js`     | Contém todas as telas: Home, Leitura, Cadastro e Histórico.            |
| `Components.js`  | Componentes reutilizáveis como `RegistroItem` e possíveis modais.       |
| `Utils.js`       | Funções auxiliares: geolocalização, cálculos, formatação e Firebase.   |
| `Styles.js`      | Estilos centralizados para manter padrão visual.                       |

---

## 💡 Padrão de Desenvolvimento

- Todas as **telas** devem ser adicionadas ou editadas em `Screens.js`.
- Todos os **componentes pequenos/modulares** vão para `Components.js`.
- Toda **regra de cálculo, formatação ou funções auxiliares** vão para `Utils.js`.
- Os **estilos visuais** ficam no `Styles.js` para manter o código limpo.
- `App.js` **apenas configura a navegação**, sem lógica adicional.

---

## 🔐 Inicialização do Firebase (Importante)

> ⚠️ **A inicialização do Firebase ocorre exclusivamente no arquivo `Utils.js`.**

Isso significa que:
- **Não há configuração do Firebase em `App.js`.**
- O arquivo `Utils.js` garante que o Firebase será inicializado corretamente e apenas uma vez (`firebase.apps.length === 0`).
- Todos os arquivos usam `db` e `firebaseTimestamp()` exportados de `Utils.js`.

**⚠️ Nunca tente inicializar o Firebase fora do `Utils.js`**, para evitar conflitos e erros como:
> `Firebase: No Firebase App '[DEFAULT]' has been created`

Este projeto **depende da versão `8.3.3` do Firebase** por questões de compatibilidade com React Native e `expo`.  
Certifique-se de instalar corretamente essa versão específica:

---

## 🧠 Motivo dessa Estrutura

Esse modelo foi pensado para:

1. Reduzir o número de arquivos que precisam ser passados para IA em cada alteração.
2. Facilitar localizar funções e componentes sem navegar por muitas pastas.
3. Manter desenvolvimento rápido e intuitivo.

---

✅ **Dica:**  
Sempre que for implementar uma nova funcionalidade, como "calcular frequência de leitura de produtos", tente centralizar a lógica no `Utils.js` e o fluxo de exibição no `Screens.js`.  
Assim, a manutenção fica simples e clara, tanto para humanos quanto para IAs.

---

## 🧠 Distribuição detalhada
### 📁 App.js

#### Responsável por:
Inicializar Firebase.
- Configurar e controlar navegação.
- Conectar as telas do Screens.js.

Contém:
- imports React, Firebase.
- configuração do Firebase.
- setup NavigationContainer + Stack.Navigator.

### 📁 Screens.js

#### Responsável por:
Todas as telas:
- HomeScreen
- BarcodeScannerScreen
- RegistrosScreen
- CadastroProdutoScreen

Contém:
- imports de React, Firebase, Utils.js, Components.js.
- toda a lógica de hooks e UI dessas telas.
- export individual de cada tela.

### 📁 Components.js

#### Responsável por:
Componentes reutilizáveis que são pequenos ou modulares.
- RegistroItem
- Modais ou caixas de confirmação.
- Listas pequenas.

Contém:
- imports de React e estilos.
- código de componentes visuais pequenos.
- export de cada componente.

#### 📁 Utils.js

#### Responsável por:
Funções auxiliares puras.
- calcularDistancia
- encontrarMercadoProximo
- firebaseTimestamp e atalhos.
- funções de formatação (formatarPreco, handlePrecoChange).

Contém:
- import de Firebase.
- export de funções e variáveis utilitárias.

### 📁 Styles.js

#### Responsável por:
Todos os estilos centralizados.
- Mantém o código visual limpo.
- Facilita alterações de design.

Contém:
- StyleSheet.create com:
- container, title, button, buttonText, input e afins.
- export único do objeto styles.


---

Feito com 💙 pensando na produtividade.
