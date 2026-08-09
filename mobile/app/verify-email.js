import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Animated,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { Colors } from '../constants/colors';

export default function VerifyEmailScreen() {
  const { user, reloadUser, logout } = useAuth();
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef(null);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();

    // Pulse the mail icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const startCountdown = (seconds = 30) => {
    setCountdown(seconds);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleCheckVerification = async () => {
    setChecking(true);
    try {
      const refreshed = await reloadUser();
      if (refreshed?.emailVerified) {
        router.replace('/');
      } else {
        Alert.alert(
          'Not Verified Yet',
          "We couldn't confirm your email. Please check your inbox and click the verification link.",
          [{ text: 'OK' }]
        );
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setChecking(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setResending(true);
    try {
      await user?.sendEmailVerification();
      Alert.alert('Email Sent', 'A new verification email has been sent. Check your inbox.');
      startCountdown(30);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setResending(false);
    }
  };

  const handleBack = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <View style={styles.container}>
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Pulsing mail icon */}
        <Animated.View style={[styles.iconWrap, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.iconCircle}>
            <Ionicons name="mail" size={48} color="#fff" />
          </View>
        </Animated.View>

        <Text style={styles.title}>Check Your Email</Text>
        <Text style={styles.subtitle}>We sent a verification link to:</Text>

        <View style={styles.emailBox}>
          <Ionicons name="mail-outline" size={15} color={Colors.primary} />
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        <Text style={styles.instructions}>
          Open the email and tap the verification link.{'\n'}
          Then come back here and tap{' '}
          <Text style={{ fontWeight: '800' }}>"I've Verified"</Text>.
        </Text>

        <TouchableOpacity
          style={[styles.btn, checking && { opacity: 0.7 }]}
          onPress={handleCheckVerification} disabled={checking} activeOpacity={0.85}
        >
          {checking
            ? <ActivityIndicator color={Colors.primary} />
            : <>
                <Ionicons name="checkmark-circle" size={18} color={Colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.btnText}>I've Verified My Email</Text>
              </>
          }
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.resendBtn, (countdown > 0 || resending) && { opacity: 0.5 }]}
          onPress={handleResend} disabled={countdown > 0 || resending}
        >
          {resending
            ? <ActivityIndicator size="small" color="rgba(255,255,255,0.9)" />
            : <Text style={styles.resendText}>
                {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Verification Email'}
              </Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Ionicons name="arrow-back" size={14} color="rgba(255,255,255,0.6)" />
          <Text style={styles.backText}>Back to Login</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: Colors.primary, padding: 24,
  },
  bgCircle1: {
    position: 'absolute', width: 400, height: 400, borderRadius: 200,
    backgroundColor: 'rgba(255,255,255,0.06)', top: -100, right: -100,
  },
  bgCircle2: {
    position: 'absolute', width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.05)', bottom: -60, left: -80,
  },
  content: { width: '100%', alignItems: 'center' },
  iconWrap: { marginBottom: 24 },
  iconCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center', alignItems: 'center',
  },
  title: { fontSize: 28, fontWeight: '900', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 10 },
  emailBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 10, marginBottom: 18,
  },
  email: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  instructions: {
    fontSize: 13, color: 'rgba(255,255,255,0.75)',
    textAlign: 'center', lineHeight: 20, marginBottom: 28,
  },
  btn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16,
    paddingVertical: 15, paddingHorizontal: 28, width: '100%',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },
  btnText: { fontSize: 15, fontWeight: '800', color: Colors.primary },
  resendBtn: {
    marginTop: 16, paddingVertical: 12, paddingHorizontal: 20,
    borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
    width: '100%', alignItems: 'center',
  },
  resendText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 20, paddingVertical: 8,
  },
  backText: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
});
