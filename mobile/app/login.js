import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert, Animated, ScrollView, Linking,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { Colors } from '../constants/colors'; // Login always uses light theme

const TAB_LOGIN = 'login';
const TAB_SIGNUP = 'signup';

export default function LoginScreen() {
  const { signIn, signUp, forgotPassword, user, isVerified, hasProfile, loading: authLoading, profileReady } = useAuth();

  const [tab, setTab] = useState(TAB_LOGIN);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Sign-up fields
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const passwordRef = useRef(null);
  const confirmRef = useRef(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const tabAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  // Already authenticated — skip login, wait for profileReady before redirecting
  useEffect(() => {
    if (authLoading || !user || !profileReady) return;
    if (!isVerified) { router.replace('/verify-email'); return; }
    if (!hasProfile) { router.replace('/setup-profile'); return; }
    router.replace('/(tabs)/dashboard');
  }, [authLoading, user, isVerified, hasProfile, profileReady]);

  useEffect(() => {
    Animated.timing(tabAnim, {
      toValue: tab === TAB_LOGIN ? 0 : 1, duration: 250, useNativeDriver: false,
    }).start();
  }, [tab]);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleLogin = async () => {
    if (!loginEmail.trim() || !loginPassword.trim()) {
      shake();
      Alert.alert('Missing fields', 'Please enter email and password.');
      return;
    }
    setLoading(true);
    try {
      await signIn(loginEmail.trim().toLowerCase(), loginPassword);
      router.replace('/');
    } catch (err) {
      shake();
      Alert.alert('Login Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!signupEmail.trim() || !signupPassword.trim() || !signupConfirm.trim()) {
      shake(); Alert.alert('Missing fields', 'Please fill in all fields.'); return;
    }
    if (signupPassword !== signupConfirm) {
      shake(); Alert.alert('Password mismatch', 'Passwords do not match.'); return;
    }
    if (signupPassword.length < 6) {
      shake(); Alert.alert('Weak password', 'Password must be at least 6 characters.'); return;
    }
    setLoading(true);
    try {
      await signUp(signupEmail.trim().toLowerCase(), signupPassword);
      router.replace('/verify-email');
    } catch (err) {
      shake();
      Alert.alert('Sign Up Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    setForgotEmail(loginEmail);
    setShowForgotModal(true);
  };

  const submitForgotPassword = async () => {
    const email = forgotEmail.trim().toLowerCase();
    if (!email) { Alert.alert('Missing email', 'Please enter your email address.'); return; }
    setLoading(true);
    try {
      await forgotPassword(email);
      setShowForgotModal(false);
      setForgotEmail('');
      Alert.alert('Email Sent', 'Check your inbox for a password reset link.');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !profileReady || user) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const indicatorLeft = tabAnim.interpolate({
    inputRange: [0, 1], outputRange: ['2%', '52%'],
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Background blobs */}
      <View style={styles.blob1} />
      <View style={styles.blob2} />
      <View style={styles.blob3} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <Animated.View style={[styles.hero, { opacity: fadeAnim }]}>
          <View style={styles.logoRing}>
            <View style={styles.logoInner}>
              <Ionicons name="school" size={40} color="#fff" />
            </View>
          </View>
          <Text style={styles.appName}>EduLedger</Text>
          <Text style={styles.appTagline}>Smart Fee Management</Text>
        </Animated.View>

        {/* Card */}
        <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateX: shakeAnim }] }]}>
          {/* Tab switcher */}
          <View style={styles.tabBar}>
            <Animated.View style={[styles.tabIndicator, { left: indicatorLeft }]} />
            <TouchableOpacity style={styles.tabBtn} onPress={() => setTab(TAB_LOGIN)}>
              <Text style={[styles.tabText, tab === TAB_LOGIN && styles.tabTextActive]}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabBtn} onPress={() => setTab(TAB_SIGNUP)}>
              <Text style={[styles.tabText, tab === TAB_SIGNUP && styles.tabTextActive]}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          {tab === TAB_LOGIN ? (
            <>
              <Text style={styles.cardTitle}>Welcome Back 👋</Text>
              <Text style={styles.cardSub}>Sign in to your account</Text>

              <InputField
                label="Email" icon="mail-outline" value={loginEmail}
                onChangeText={setLoginEmail} placeholder="you@example.com"
                keyboardType="email-address" autoCapitalize="none"
                focused={focusedField === 'lemail'}
                onFocus={() => setFocusedField('lemail')}
                onBlur={() => setFocusedField(null)}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />

              <InputField
                label="Password" icon="lock-closed-outline" value={loginPassword}
                onChangeText={setLoginPassword} placeholder="Enter password"
                secureTextEntry={!showPassword}
                focused={focusedField === 'lpass'}
                onFocus={() => setFocusedField('lpass')}
                onBlur={() => setFocusedField(null)}
                inputRef={passwordRef}
                returnKeyType="done" onSubmitEditing={handleLogin}
                rightIcon={
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textMuted} />
                  </TouchableOpacity>
                }
              />

              <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotBtn}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, loading && { opacity: 0.7 }]}
                onPress={handleLogin} disabled={loading} activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <><Text style={styles.btnText}>Sign In</Text>
                      <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} /></>
                }
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.cardTitle}>Create Account 🎉</Text>
              <Text style={styles.cardSub}>Set up your EduLedger account</Text>

              <InputField
                label="Email" icon="mail-outline" value={signupEmail}
                onChangeText={setSignupEmail} placeholder="you@example.com"
                keyboardType="email-address" autoCapitalize="none"
                focused={focusedField === 'semail'}
                onFocus={() => setFocusedField('semail')}
                onBlur={() => setFocusedField(null)}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />

              <InputField
                label="Password" icon="lock-closed-outline" value={signupPassword}
                onChangeText={setSignupPassword} placeholder="Min. 6 characters"
                secureTextEntry={!showPassword}
                focused={focusedField === 'spass'}
                onFocus={() => setFocusedField('spass')}
                onBlur={() => setFocusedField(null)}
                inputRef={passwordRef}
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
                rightIcon={
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textMuted} />
                  </TouchableOpacity>
                }
              />

              <InputField
                label="Confirm Password" icon="lock-closed-outline" value={signupConfirm}
                onChangeText={setSignupConfirm} placeholder="Re-enter password"
                secureTextEntry={!showPassword}
                focused={focusedField === 'sconfirm'}
                onFocus={() => setFocusedField('sconfirm')}
                onBlur={() => setFocusedField(null)}
                inputRef={confirmRef}
                returnKeyType="done" onSubmitEditing={handleSignUp}
              />

              <TouchableOpacity
                style={[styles.btn, loading && { opacity: 0.7 }]}
                onPress={handleSignUp} disabled={loading} activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <><Text style={styles.btnText}>Create Account</Text>
                      <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} /></>
                }
              </TouchableOpacity>

              <Text style={styles.termsText}>
                A verification email will be sent to your inbox after sign-up.
              </Text>
            </>
          )}
        </Animated.View>

        <View style={styles.devCredit}>
          <Text style={styles.devCreditText}>Designed & Developed by</Text>
          <Text style={styles.devCreditName}>Gaganjot Singh</Text>
          <TouchableOpacity
            style={styles.contactBtn}
            onPress={() => Linking.openURL('mailto:exegaganjot@gmail.com?subject=EduLedger%20Query')}
            activeOpacity={0.7}
          >
            <Ionicons name="mail-outline" size={13} color={Colors.primary} />
            <Text style={styles.contactText}>exegaganjot@gmail.com</Text>
          </TouchableOpacity>
        </View>
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Forgot password modal */}
      {showForgotModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Forgot Password</Text>
            <Text style={styles.modalSub}>Enter your email to receive a reset link.</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="you@example.com"
              placeholderTextColor={Colors.textMuted}
              value={forgotEmail}
              onChangeText={setForgotEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => { setShowForgotModal(false); setForgotEmail(''); }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmit, loading && { opacity: 0.7 }]}
                onPress={submitForgotPassword} disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.modalSubmitText}>Send Link</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

// ─── Reusable input field ─────────────────────────────────────────────────────
function InputField({
  label, icon, value, onChangeText, placeholder,
  secureTextEntry, keyboardType, focused, onFocus, onBlur,
  inputRef, returnKeyType, onSubmitEditing, rightIcon, autoCapitalize,
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, focused && styles.inputWrapFocused]}>
        <Ionicons
          name={icon} size={18}
          color={focused ? Colors.primary : Colors.textMuted}
          style={styles.inputIcon}
        />
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onBlur={onBlur}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize || 'none'}
          autoCorrect={false}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          blurOnSubmit={false}
        />
        {rightIcon}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEEAFF' },
  blob1: {
    position: 'absolute', width: 300, height: 300, borderRadius: 150,
    backgroundColor: Colors.primary, opacity: 0.12, top: -80, right: -80,
  },
  blob2: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: Colors.accent, opacity: 0.08, top: 120, left: -60,
  },
  blob3: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: Colors.primary, opacity: 0.07, bottom: 40, right: -50,
  },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingTop: 60 },
  hero: { alignItems: 'center', marginBottom: 28 },
  logoRing: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: 'rgba(108,99,255,0.15)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
    borderWidth: 2, borderColor: 'rgba(108,99,255,0.25)',
  },
  logoInner: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: Colors.primary, shadowOpacity: 0.45, shadowRadius: 14, elevation: 10,
  },
  appName: { fontSize: 28, fontWeight: '900', color: Colors.text },
  appTagline: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  card: {
    backgroundColor: '#fff', borderRadius: 28, padding: 24,
    shadowColor: '#6C63FF', shadowOpacity: 0.15, shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 }, elevation: 14,
  },
  tabBar: {
    flexDirection: 'row', backgroundColor: Colors.background, borderRadius: 14,
    padding: 4, marginBottom: 20, position: 'relative',
  },
  tabIndicator: {
    position: 'absolute', top: 4, bottom: 4, width: '46%',
    backgroundColor: Colors.primary, borderRadius: 11,
  },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', zIndex: 1 },
  tabText: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary },
  tabTextActive: { color: '#fff' },
  cardTitle: { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: 2 },
  cardSub: { fontSize: 13, color: Colors.textSecondary, marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.background, borderRadius: 14,
    borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: 12, paddingVertical: 2,
  },
  inputWrapFocused: { borderColor: Colors.primary, backgroundColor: Colors.primaryGhost },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: Colors.text, paddingVertical: 13 },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 4, marginTop: -6 },
  forgotText: { fontSize: 12, color: Colors.primary, fontWeight: '700' },
  btn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 15, marginTop: 16,
    shadowColor: Colors.primary, shadowOpacity: 0.4, shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 }, elevation: 8,
  },
  btnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  termsText: {
    fontSize: 11, color: Colors.textMuted, textAlign: 'center', marginTop: 12, lineHeight: 16,
  },
  devCredit: { alignItems: 'center', marginTop: 24 },
  devCreditText: { fontSize: 11, color: Colors.textMuted },
  devCreditName: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginTop: 2 },
  contactBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: 8, paddingVertical: 6, paddingHorizontal: 14,
    backgroundColor: Colors.primaryGhost, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border,
  },
  contactText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  // Forgot modal
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalCard: { width: '100%', backgroundColor: '#fff', borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.text, marginBottom: 6 },
  modalSub: { fontSize: 13, color: Colors.textSecondary, marginBottom: 14 },
  modalInput: {
    backgroundColor: Colors.background, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: Colors.text, marginBottom: 16,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalCancel: { paddingVertical: 12, paddingHorizontal: 16 },
  modalCancelText: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary },
  modalSubmit: {
    backgroundColor: Colors.primary, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 18,
    minWidth: 100, alignItems: 'center',
  },
  modalSubmitText: { fontSize: 14, fontWeight: '800', color: '#fff' },
});
