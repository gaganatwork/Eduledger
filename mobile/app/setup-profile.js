import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Animated,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { Colors } from '../constants/colors';

export default function SetupProfileScreen() {
  const { saveProfile, user } = useAuth();
  const [name, setName] = useState('');
  const [institute, setInstitute] = useState('');
  const [loading, setLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const instituteRef = useRef(null);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter your name.'); return;
    }
    if (!institute.trim()) {
      Alert.alert('Required', 'Please enter your institute or school name.'); return;
    }
    setLoading(true);
    try {
      await saveProfile({ name: name.trim(), institute: institute.trim() });
      router.replace('/(tabs)/dashboard');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.headerBg} />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Animated.View style={[styles.hero, { opacity: fadeAnim }]}>
          <View style={styles.iconCircle}>
            <Ionicons name="person-add" size={36} color="#fff" />
          </View>
          <Text style={styles.heroTitle}>Set Up Your Profile</Text>
          <Text style={styles.heroSub}>
            Tell us a bit about yourself.{'\n'}This helps personalise your dashboard.
          </Text>
        </Animated.View>

        <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
          {/* Verified email chip */}
          <View style={styles.emailRow}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
            <Text style={styles.emailText}>{user?.email}</Text>
          </View>

          <Text style={styles.label}>
            Your Name <Text style={styles.req}>*</Text>
          </Text>
          <View style={styles.inputWrap}>
            <Ionicons name="person-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g. Gaganjot Singh"
              placeholderTextColor={Colors.textMuted}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => instituteRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>

          <Text style={[styles.label, { marginTop: 14 }]}>
            Institute / School Name <Text style={styles.req}>*</Text>
          </Text>
          <View style={styles.inputWrap}>
            <Ionicons name="school-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              ref={instituteRef}
              style={styles.input}
              placeholder="e.g. Bright Future Academy"
              placeholderTextColor={Colors.textMuted}
              value={institute}
              onChangeText={setInstitute}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && { opacity: 0.7 }]}
            onPress={handleSave} disabled={loading} activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Text style={styles.btnText}>Continue</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
                </>
            }
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerBg: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 240,
    backgroundColor: Colors.primary,
    borderBottomLeftRadius: 40, borderBottomRightRadius: 40,
  },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 60 },
  hero: { alignItems: 'center', marginBottom: 28 },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  heroTitle: { fontSize: 24, fontWeight: '900', color: '#fff', textAlign: 'center' },
  heroSub: {
    fontSize: 13, color: 'rgba(255,255,255,0.8)',
    marginTop: 8, textAlign: 'center', lineHeight: 20,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 28, padding: 24,
    shadowColor: Colors.shadow, shadowOpacity: 0.15,
    shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 14,
  },
  emailRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.successLight, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 20,
  },
  emailText: { fontSize: 13, fontWeight: '600', color: Colors.success, flex: 1 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  req: { color: Colors.danger },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.background, borderRadius: 14,
    borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: 12, paddingVertical: 2,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: Colors.text, paddingVertical: 13 },
  btn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    backgroundColor: Colors.primary, borderRadius: 14,
    paddingVertical: 15, marginTop: 24,
    shadowColor: Colors.primary, shadowOpacity: 0.4,
    shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 8,
  },
  btnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
