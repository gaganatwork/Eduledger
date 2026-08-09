import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Colors } from '../constants/colors';

const RING = 120; // base size of logo circle and pulse rings

export default function LoadingScreen({ message = 'Loading...' }) {
  const pulse1 = useRef(new Animated.Value(1)).current;
  const pulse2 = useRef(new Animated.Value(1)).current;
  const pulse3 = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const dotAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo entrance
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start(() => {
      Animated.timing(textOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    });

    // Ripple rings staggered 500ms apart
    const createPulse = (anim, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 2.4, duration: 1600,
            easing: Easing.out(Easing.ease), useNativeDriver: true,
          }),
          Animated.timing(anim, { toValue: 1, duration: 0, useNativeDriver: true }),
        ])
      );

    const p1 = createPulse(pulse1, 0);
    const p2 = createPulse(pulse2, 520);
    const p3 = createPulse(pulse3, 1040);
    p1.start(); p2.start(); p3.start();

    // Spinner
    Animated.loop(
      Animated.timing(dotAnim, {
        toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: true,
      })
    ).start();

    return () => { p1.stop(); p2.stop(); p3.stop(); };
  }, []);

  const spin = dotAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const ringOpacity = (anim) =>
    anim.interpolate({ inputRange: [1, 2.4], outputRange: [0.4, 0] });

  return (
    <View style={styles.container}>
      {/* Decorative background blobs */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      {/* Logo + rings share the same anchor point */}
      <View style={styles.logoArea}>
        {/* Rings sit behind the logo via absolute positioning within logoArea */}
        {[pulse1, pulse2, pulse3].map((anim, i) => (
          <Animated.View
            key={i}
            style={[
              styles.pulseRing,
              {
                transform: [{ scale: anim }],
                opacity: ringOpacity(anim),
              },
            ]}
          />
        ))}

        {/* Logo circle on top */}
        <Animated.View
          style={[
            styles.logoWrap,
            { transform: [{ scale: logoScale }], opacity: logoOpacity },
          ]}
        >
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>EL</Text>
          </View>
        </Animated.View>
      </View>

      {/* App name + tagline */}
      <Animated.View style={[styles.textBlock, { opacity: textOpacity }]}>
        <Text style={styles.appName}>EduLedger</Text>
        <Text style={styles.tagline}>Fee Management System</Text>
      </Animated.View>

      {/* Status row pinned to bottom */}
      <Animated.View style={[styles.statusRow, { opacity: textOpacity }]}>
        <Animated.View style={[styles.spinner, { transform: [{ rotate: spin }] }]} />
        <Text style={styles.statusText}>{message}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primary,
  },

  // Background decorative circles
  bgCircle1: {
    position: 'absolute', width: 400, height: 400, borderRadius: 200,
    backgroundColor: 'rgba(255,255,255,0.05)', top: -100, right: -100,
  },
  bgCircle2: {
    position: 'absolute', width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.05)', bottom: -50, left: -80,
  },

  // Shared container for logo + rings — all children share the same center
  logoArea: {
    width: RING,
    height: RING,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Rings are absolute within logoArea so they scale from the center
  pulseRing: {
    position: 'absolute',
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.65)',
  },

  // Logo sits on top of the rings (rendered last = highest z-index)
  logoWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoCircle: {
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: { fontSize: 42, fontWeight: '900', color: '#fff', letterSpacing: 2 },

  textBlock: { alignItems: 'center', marginTop: 28 },
  appName: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  tagline: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4, letterSpacing: 0.5 },

  statusRow: {
    position: 'absolute', bottom: 80,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  spinner: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
  },
  statusText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },
});
