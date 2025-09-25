import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Image } from 'react-native';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';

const TREASURE_COORDS = {
  latitude: -23.11443,
  longitude: -45.70780,
};

const STEP_LENGTH_METERS = 0.8;

export default function TreasureHunt() {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [distanceSteps, setDistanceSteps] = useState(null);
  const [hint, setHint] = useState('Buscando localização...');
  const [bgColor, setBgColor] = useState('#87CEFA');
  const [angle, setAngle] = useState(0);
  const soundRef = useRef(null);
  const [foundTreasure, setFoundTreasure] = useState(false);

  function getDistanceMeters(lat1, lon1, lat2, lon2) {
    const toRad = (value) => (value * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function getBearing(lat1, lon1, lat2, lon2) {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const toDeg = (rad) => (rad * 180) / Math.PI;
    const dLon = toRad(lon2 - lon1);
    const lat1Rad = toRad(lat1);
    const lat2Rad = toRad(lat2);

    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x =
      Math.cos(lat1Rad) * Math.sin(lat2Rad) -
      Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
    let brng = Math.atan2(y, x);
    brng = toDeg(brng);
    return (brng + 360) % 360;
  }

  function updateHintAndColor(steps) {
    if (steps < 10) {
      setHint('Muito quente! Está quase lá!');
      setBgColor('#FF4500');
    } else if (steps < 25) {s
      setHint('Quente! Está perto!');
      setBgColor('#FF4500');
    } else if (steps < 50) {
      setHint('Morno! Continue procurando.');
      setBgColor('#87CEFA');
    } else {
      setHint('Frio! Está longe do tesouro.');
      setBgColor('#87CEFA');
    }
  }

  async function playSound() {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('./assets/treasure.mp3'),
        { shouldPlay: true, isLooping: true }
      );
      soundRef.current = sound;
    } catch (error) {
      console.log('Erro ao carregar som:', error);
    }
  }

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permissão para acessar localização negada');
        return;
      }

      Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Highest,
          distanceInterval: 1,
        },
        (loc) => {
          setLocation(loc.coords);
        }
      );
    })();
  }, []);

  useEffect(() => {
    if (!location) return;

    const distMeters = getDistanceMeters(
      location.latitude,
      location.longitude,
      TREASURE_COORDS.latitude,
      TREASURE_COORDS.longitude
    );
    const steps = distMeters / STEP_LENGTH_METERS;
    setDistanceSteps(steps);
    updateHintAndColor(steps);

    const bearing = getBearing(
      location.latitude,
      location.longitude,
      TREASURE_COORDS.latitude,
      TREASURE_COORDS.longitude
    );
    setAngle(bearing);

    if (steps < 1 && !foundTreasure) {
      setFoundTreasure(true);
      playSound();
    }
  }, [location]);

  if (errorMsg) {
    return (
      <View style={[styles.container, { backgroundColor: '#87CEFA' }]}>
        <Text>{errorMsg}</Text>
      </View>
    );
  }

  if (!location) {
    return (
      <View style={[styles.container, { backgroundColor: '#87CEFA' }]}>
        <Text>Buscando localização...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Exibe a dica textual */}
      <Text style={styles.hintText}>{hint}</Text>
      {}
      <Text style={styles.distanceText}>
        Distância: {distanceSteps ? distanceSteps.toFixed(1) : '--'} passos
      </Text>
      {}
      <View style={styles.arrowContainer}>
        <Animated.Image
          source={require('./src/assets/seta.png')}
          style={[
            styles.arrow,
            {
              transform: [{ rotate: `${angle}deg` }],
            },
          ]}
        />
      </View>
      {}
      {foundTreasure && (
        <Text style={styles.foundText}>🎉 Você encontrou o tesouro! 🎉</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
hintText: {
  fontSize: 24,
  fontWeight: 'bold',
  marginBottom: 20,
  color: '#fff',
  textAlign: 'center',
},
distanceText: {
  fontSize: 18,
  marginBottom: 40,
  color: '#fff',
},
arrowContainer: {
  width: 100,
  height: 100,
  justifyContent: 'center',
  alignItems: 'center',
},
arrow: {
  width: 80,
  height: 80,
  tintColor: '#fff',
},
foundText: {
  marginTop: 40,
  fontSize: 28,
  fontWeight: 'bold',
  color: '#FFD700',
  textAlign: 'center',
},
});
