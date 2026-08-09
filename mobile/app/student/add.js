import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { createStudent } from '../../database/db';
import { useTheme } from '../../context/ThemeContext';

function Field({ label, required, children, C }) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: C.textSecondary }]}>
        {label}
        {required && <Text style={{ color: C.danger }}> *</Text>}
      </Text>
      {children}
    </View>
  );
}

function FormInput({ inputRef, value, onChangeText, placeholder, keyboardType, autoCapitalize, returnKeyType, onSubmitEditing, C, ...rest }) {
  return (
    <TextInput
      ref={inputRef}
      style={[styles.input, { borderColor: C.border, color: C.text, backgroundColor: C.background }]}
      value={value} onChangeText={onChangeText}
      placeholder={placeholder} placeholderTextColor={C.textMuted}
      keyboardType={keyboardType || 'default'}
      autoCapitalize={autoCapitalize || 'words'}
      autoCorrect={false}
      returnKeyType={returnKeyType || 'next'}
      onSubmitEditing={onSubmitEditing}
      blurOnSubmit={false}
      {...rest}
    />
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function AddStudentScreen() {
  const { C } = useTheme();
  const [form, setForm] = useState({
    name: '', class: '', phone: '', email: '', parentName: '', monthlyFee: '',
  });
  const [loading, setLoading] = useState(false);

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  // Refs for keyboard flow
  const classRef = useRef(null);
  const feeRef = useRef(null);
  const phoneRef = useRef(null);
  const emailRef = useRef(null);
  const parentRef = useRef(null);

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.class.trim() || !form.phone.trim() || !form.monthlyFee) {
      Alert.alert('Missing fields', 'Name, class, phone and monthly fee are required.');
      return;
    }
    const fee = Number(form.monthlyFee);
    if (isNaN(fee) || fee <= 0) {
      Alert.alert('Invalid fee', 'Monthly fee must be a positive number.');
      return;
    }
    setLoading(true);
    try {
      await createStudent({
        name: form.name.trim(),
        class: form.class.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        parent_name: form.parentName.trim(),
        monthly_fee: fee,
      });
      Alert.alert('Success', 'Student added!', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.header, { backgroundColor: C.primary }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Student</Text>
        <View style={{ width: 34 }} />
      </View>
      <ScrollView style={[styles.container, { backgroundColor: C.background }]}
        contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={[styles.section, { backgroundColor: C.surface, shadowColor: C.shadow }]}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIconBox, { backgroundColor: C.primaryGhost }]}>
              <Ionicons name="person" size={16} color={C.primary} />
            </View>
            <Text style={[styles.sectionTitle, { color: C.text }]}>Student Info</Text>
          </View>
          <Field label="Full Name" required C={C}><FormInput value={form.name} onChangeText={set('name')} placeholder="e.g. Aarav Sharma" onSubmitEditing={() => classRef.current?.focus()} C={C} /></Field>
          <Field label="Class" required C={C}><FormInput inputRef={classRef} value={form.class} onChangeText={set('class')} placeholder="e.g. 10-A" onSubmitEditing={() => feeRef.current?.focus()} C={C} /></Field>
          <Field label="Monthly Fee (₹)" required C={C}><FormInput inputRef={feeRef} value={form.monthlyFee} onChangeText={set('monthlyFee')} placeholder="e.g. 2000" keyboardType="numeric" autoCapitalize="none" onSubmitEditing={() => phoneRef.current?.focus()} C={C} /></Field>
        </View>
        <View style={[styles.section, { backgroundColor: C.surface, shadowColor: C.shadow }]}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIconBox, { backgroundColor: C.primaryGhost }]}>
              <Ionicons name="call" size={16} color={C.primary} />
            </View>
            <Text style={[styles.sectionTitle, { color: C.text }]}>Contact Info</Text>
          </View>
          <Field label="Phone Number" required C={C}><FormInput inputRef={phoneRef} value={form.phone} onChangeText={set('phone')} placeholder="e.g. 9800000001" keyboardType="phone-pad" autoCapitalize="none" onSubmitEditing={() => emailRef.current?.focus()} C={C} /></Field>
          <Field label="Email (optional)" C={C}><FormInput inputRef={emailRef} value={form.email} onChangeText={set('email')} placeholder="e.g. student@example.com" keyboardType="email-address" autoCapitalize="none" onSubmitEditing={() => parentRef.current?.focus()} C={C} /></Field>
          <Field label="Parent Name (optional)" C={C}><FormInput inputRef={parentRef} value={form.parentName} onChangeText={set('parentName')} placeholder="e.g. Ravi Sharma" returnKeyType="done" onSubmitEditing={handleSubmit} C={C} /></Field>
        </View>
        <TouchableOpacity style={[styles.submitBtn, { backgroundColor: C.primary, shadowColor: C.primary }, loading && { opacity: 0.7 }]} onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
          {loading ? <ActivityIndicator color="#fff" /> : <><Ionicons name="person-add" size={18} color="#fff" style={{ marginRight: 8 }} /><Text style={styles.submitText}>Add Student</Text></>}
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  container: { flex: 1 },
  scrollContent: { padding: 16 },
  section: { borderRadius: 20, padding: 18, marginBottom: 14, shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  sectionIconBox: { width: 30, height: 30, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 14, fontWeight: '800' },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, height: 48, fontSize: 15 },
  submitBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderRadius: 16, height: 54, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 8 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
