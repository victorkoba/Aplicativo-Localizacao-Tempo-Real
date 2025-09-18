import React, { useEffect, useState, useRef } from 'react'; // Importa React e hooks necessários
import { View, Text, StyleSheet, Animated, Easing, Image } from 'react-native'; // Componentes e APIs do React Native
import * as Location from 'expo-location'; // API para obter localização do dispositivo
import { Audio } from 'expo-av'; // API para tocar áudio

// Coordenadas fixas do tesouro para teste
const TREASURE_COORDS = {
  latitude: -23.11443,
  longitude: -45.70780,
};

// Define o comprimento de um passo em metros
const STEP_LENGTH_METERS = 0.8;

export default function TreasureHunt() {
  // Estado para armazenar a localização atual do jogador
  const [location, setLocation] = useState(null);
  // Estado para armazenar mensagem de erro na permissão de localização
  const [errorMsg, setErrorMsg] = useState(null);
  // Estado para armazenar a distância em passos entre jogador e tesouro
  const [distanceSteps, setDistanceSteps] = useState(null);
  // Estado para armazenar a dica textual de proximidade
  const [hint, setHint] = useState('Buscando localização...');
  // Estado para armazenar a cor de fundo da tela
  const [bgColor, setBgColor] = useState('#87CEFA'); // azul claro inicial
  // Estado para armazenar o ângulo da seta que aponta para o tesouro
  const [angle, setAngle] = useState(0);
  // Referência para o objeto de som para controlar a reprodução
  const soundRef = useRef(null);
  // Estado para indicar se o tesouro foi encontrado
  const [foundTreasure, setFoundTreasure] = useState(false);

  // Função para calcular a distância em metros entre duas coordenadas geográficas
  function getDistanceMeters(lat1, lon1, lat2, lon2) {
    const toRad = (value) => (value * Math.PI) / 180; // converte graus para radianos
    const R = 6371000; // raio da Terra em metros
    const dLat = toRad(lat2 - lat1); // diferença de latitude em radianos
    const dLon = toRad(lon2 - lon1); // diferença de longitude em radianos
    // fórmula de Haversine para distância entre dois pontos na esfera
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // distância em metros
  }

  // Função para calcular o ângulo (azimute) entre duas coordenadas
  function getBearing(lat1, lon1, lat2, lon2) {
    const toRad = (deg) => (deg * Math.PI) / 180; // graus para radianos
    const toDeg = (rad) => (rad * 180) / Math.PI; // radianos para graus

    const dLon = toRad(lon2 - lon1); // diferença de longitude em radianos
    const lat1Rad = toRad(lat1); // latitude inicial em radianos
    const lat2Rad = toRad(lat2); // latitude destino em radianos

    // cálculo do azimute usando fórmula trigonométrica
    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x =
      Math.cos(lat1Rad) * Math.sin(lat2Rad) -
      Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
    let brng = Math.atan2(y, x); // ângulo em radianos
    brng = toDeg(brng); // converte para graus
    return (brng + 360) % 360; // normaliza para valor entre 0 e 360 graus
  }

  // Atualiza a dica textual e a cor de fundo com base na distância em passos
  function updateHintAndColor(steps) {
    if (steps < 10) {
      setHint('Muito quente! Está quase lá!'); // dica para menos de 10 passos
      setBgColor('#FF4500'); // cor vermelha para muito quente
    } else if (steps < 25) {
      setHint('Quente! Está perto!'); // dica para menos de 25 passos
      setBgColor('#FF4500'); // mantém vermelho
    } else if (steps < 50) {
      setHint('Morno! Continue procurando.'); // dica para menos de 50 passos
      setBgColor('#87CEFA'); // azul claro para morno
    } else {
      setHint('Frio! Está longe do tesouro.'); // dica para 50 passos ou mais
      setBgColor('#87CEFA'); // azul claro para frio
    }
  }

  // Função assíncrona para tocar música de fundo ao encontrar o tesouro
  async function playSound() {
    try {
      // Carrega o arquivo de áudio e inicia a reprodução em loop
      const { sound } = await Audio.Sound.createAsync(
        require('./assets/treasure.mp3'), // arquivo mp3 na pasta assets
        { shouldPlay: true, isLooping: true }
      );
      soundRef.current = sound; // armazena referência para controle futuro
    } catch (error) {
      console.log('Erro ao carregar som:', error); // log de erro se falhar
    }
  }

  // Hook para descarregar o som quando o componente for desmontado
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync(); // libera recursos do som
      }
    };
  }, []);

  // Hook para solicitar permissão e iniciar o monitoramento da localização
  useEffect(() => {
    (async () => {
      // Solicita permissão para acessar localização em primeiro plano
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permissão para acessar localização negada'); // mensagem de erro
        return;
      }

      // Inicia o monitoramento da posição com alta precisão e atualização a cada 1 metro
      Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Highest,
          distanceInterval: 1, // atualiza a cada 1 metro de movimento
        },
        (loc) => {
          setLocation(loc.coords); // atualiza estado com nova localização
        }
      );
    })();
  }, []);

  // Hook que atualiza distância, dica, cor e ângulo sempre que a localização muda
  useEffect(() => {
    if (!location) return; // se localização não disponível, não faz nada

    // Calcula distância em metros entre jogador e tesouro
    const distMeters = getDistanceMeters(
      location.latitude,
      location.longitude,
      TREASURE_COORDS.latitude,
      TREASURE_COORDS.longitude
    );
    // Converte distância para passos
    const steps = distMeters / STEP_LENGTH_METERS;
    setDistanceSteps(steps); // atualiza estado da distância em passos

    updateHintAndColor(steps); // atualiza dica e cor de fundo

    // Calcula o ângulo para a seta apontar para o tesouro
    const bearing = getBearing(
      location.latitude,
      location.longitude,
      TREASURE_COORDS.latitude,
      TREASURE_COORDS.longitude
    );
    setAngle(bearing); // atualiza estado do ângulo

    // Se estiver a menos de 1 passo do tesouro e ainda não encontrou
    if (steps < 1 && !foundTreasure) {
      setFoundTreasure(true); // marca como encontrado
      playSound(); // toca música de fundo
    }
  }, [location]);

  // Se houver erro na permissão, exibe mensagem de erro
  if (errorMsg) {
    return (
      <View style={[styles.container, { backgroundColor: '#87CEFA' }]}>
        <Text>{errorMsg}</Text>
      </View>
    );
  }

  // Enquanto a localização não estiver disponível, exibe mensagem de carregamento
  if (!location) {
    return (
      <View style={[styles.container, { backgroundColor: '#87CEFA' }]}>
        <Text>Buscando localização...</Text>
      </View>
    );
  }

  // Renderiza a interface principal do jogo
  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Exibe a dica textual */}
      <Text style={styles.hintText}>{hint}</Text>
      {/* Exibe a distância em passos */}
      <Text style={styles.distanceText}>
        Distância: {distanceSteps ? distanceSteps.toFixed(1) : '--'} passos
      </Text>
      {/* Container para a seta */}
      <View style={styles.arrowContainer}>
        <Animated.Image
          source={require('./assets/arrow.png')} // imagem da seta apontando para cima
          style={[
            styles.arrow,
            {
              transform: [{ rotate: `${angle}deg` }], // gira a seta conforme o ângulo calculado
            },
          ]}
        />
      </View>
      {/* Mensagem especial quando o tesouro é encontrado */}
      {foundTreasure && (
        <Text style={styles.foundText}>🎉 Você encontrou o tesouro! 🎉</Text>
      )}
    </View>
  );
}

// Estilos para os componentes da interface
const styles = StyleSheet.create({
  container: {
    flex: 1, // ocupa toda a tela
    justifyContent: 'center', // centraliza verticalmente
    alignItems: 'center', // centraliza horizontalmente
  },
  hintText: {
    fontSize: 24, // tamanho da fonte grande
    fontWeight: 'bold', // texto em negrito
    marginBottom: 20, // espaço abaixo do texto
    color: '#fff', // cor branca
    textAlign: 'center', // centraliza texto
  },
  distanceText: {
    fontSize: 18, // tamanho da fonte médio
    marginBottom: 40, // espaço abaixo do texto
    color: '#fff', // cor branca
  },
  arrowContainer: {
    width: 100, // largura do container da seta
    height: 100, // altura do container da seta
    justifyContent: 'center', // centraliza verticalmente
    alignItems: 'center', // centraliza horizontalmente
  },
  arrow: {
    width: 80, // largura da imagem da seta
    height: 80, // altura da imagem da seta
    tintColor: '#fff', // cor branca para a seta (se for imagem vetorial)
  },
  foundText: {
    marginTop: 40, // espaço acima do texto
    fontSize: 28, // tamanho da fonte grande
    fontWeight: 'bold', // texto em negrito
    color: '#FFD700', // cor dourada
    textAlign: 'center', // centraliza texto
  },
});
