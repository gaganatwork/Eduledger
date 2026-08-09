import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getStudentById, updateStudent } from '../../../database/db';
import LoadingScreen from '../../../components/LoadingScreen';
import { useTheme } from '../../../context/ThemeContext';

function Field({ label, required, children, C }) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: C.textSecondary }]}>
        {label}{required && <Text style={{ color: C.danger }}> *</Text>}
      </Text>
      {children}
    </View>
  );
}

export default function EditStudentScreen() {
  const { id } = useLocalSearchParams();
  const { C } = useTheme();
  const [form, setForm] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));
  const classRef = useRef(null);
  const feeRef   = useRef(null);
  const phoneRef = useRef(null);
  const emailRef = useRef(null);
  const parentRef = useRef(null);

  useEffect(() => {
    getStudentById(id).then((s) => {
      if (!s) { Alert.alert('Error', 'Student not found'); router.back(); return; }
      setForm({
        name: s.name, class: s.class, phone: s.phone,
        email: s.email || '', parentName: s.parent_name || '',
        monthlyFee: String(s.monthly_fee),
      });
      setPageLoading(false);
    });
  }, [id]);

  const handleSave = async () => {
    if (!form.name.trim() || !form.class.trim() || !form.phone.trim() || !form.monthlyFee) {
      Alert.alert('Missing fields', 'Name, class, phone and monthly fee are required.'); return;
    }
    const fee = Number(form.monthlyFee);
    if (isNaN(fee) || fee <= 0) { Alert.alert('Invalid fee', 'Monthly fee must be a positive number.'); return; }
    setSaving(true);
    try {
      await updateStudent(id, { name: form.name.trim(), class: form.class.trim(), phone: form.phone.trim(), email: form.email.trim(), parent_name: form.parentName.trim(), monthly_fee: fee });
      Alert.alert('Saved', 'Student updated successfully!', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (err) { Alert.alert('Error', err.message); }
    finally { setSaving(false); }
  };

  if (pageLoading) return <LoadingScreen message="Loading..." />;

  const inputStyle = [styles.input, { borderColor: C.border, color: C.text, backgroundColor: C.background }];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.header, { backgroundColor: C.primary }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Student</Text>
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
          <Field label="Full Name" required C={C}>
            <TextInput style={inputStyle} value={form.name} onChangeText={set('name')} placeholderTextColor={C.textMuted} autoCapitalize="words" returnKeyType="next" onSubmitEditing={() => classRef.current?.focus()} blurOnSubmit={false} />
          </Field>
          <Field label="Class" required C={C}>
            <TextInput ref={classRef} style={inputStyle} value={form.class} onChangeText={set('class')} placeholderTextColor={C.textMuted} autoCapitalize="characters" returnKeyType="next" onSubmitEditing={() => feeRef.current?.focus()} blurOnSubmit={false} />
          </Field>
          <Field label="Monthly Fee (₹)" required C={C}>
            <TextInput ref={feeRef} style={inputStyle} value={form.monthlyFee} onChangeText={set('monthlyFee')} placeholderTextColor={C.textMuted} keyboardType="numeric" returnKeyType="next" onSubmitEditing={() => phoneRef.current?.focus()} blurOnSubmit={false} />
          </Field>
        </View>

        <View style={[styles.section, { backgroundColor: C.surface, shadowColor: C.shadow }]}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIconBox, { backgroundColor: C.primaryGhost }]}>
              <Ionicons name="call" size={16} color={C.primary} />
            </View>
            <Text style={[styles.sectionTitle, { color: C.text }]}>Contact Info</Text>
          </View>
          <Field label="Phone Number" required C={C}>
            <TextInput ref={phoneRef} style={inputStyle} value={form.phone} onChangeText={set('phone')} placeholderTextColor={C.textMuted} keyboardType="phone-pad" returnKeyType="next" onSubmitEditing={() => emailRef.current?.focus()} blurOnSubmit={false} />
          </Field>
          <Field label="Email (optional)" C={C}>
            <TextInput ref={emailRef} style={inputStyle} value={form.email} onChangeText={set('email')} placeholderTextColor={C.textMuted} keyboardType="email-address" autoCapitalize="none" returnKeyType="next" onSubmitEditing={() => parentRef.current?.focus()} blurOnSubmit={false} />
          </Field>
          <Field label="Parent Name (optional)" C={C}>
            <TextInput ref={parentRef} style={inputStyle} value={form.parentName} onChangeText={set('parentName')} placeholderTextColor={C.textMuted} autoCapitalize="words" returnKeyType="done" onSubmitEditing={handleSave} />
          </Field>
        </View>

        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: C.primary, shadowColor: C.primary }, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
          {saving ? <ActivityIndicator color="#fff" /> : <><Ionicons name="checkmark-circle" size={18} color="#fff" style={{ marginRight: 8 }} /><Text style={styles.saveBtnText}>Save Changes</Text></>}
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16 },
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
  saveBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderRadius: 16, height: 54, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 8 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
