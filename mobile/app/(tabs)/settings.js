import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Switch, TouchableOpacity,
  ScrollView, Linking, Alert, TextInput, ActivityIndicator, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { clearLocalData } from '../../services/firebase';

// ─── Sub-components ───────────────────────────────────────────────────────────
function SectionHeader({ title, C }) {
  return (
    <View style={[styles.sectionHeader, { borderLeftColor: C.primary }]}>
      <Text style={[styles.sectionHeaderText, { color: C.primary }]}>{title}</Text>
    </View>
  );
}

function SettingRow({ icon, iconBg, iconColor, label, sublabel, right, onPress, C, danger }) {
  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: C.surface, borderBottomColor: C.border }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={17} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, { color: danger ? C.danger : C.text }]}>{label}</Text>
        {sublabel ? <Text style={[styles.rowSublabel, { color: C.textMuted }]}>{sublabel}</Text> : null}
      </View>
      {right ?? (onPress && !danger
        ? <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
        : null
      )}
    </TouchableOpacity>
  );
}

// ─── Change Password Modal ────────────────────────────────────────────────────
function ChangePasswordModal({ visible, onClose, C }) {
  const [current, setCurrent]   = useState('');
  const [next, setNext]         = useState('');
  const [confirm, setConfirm]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPwd, setShowPwd]   = useState(false);

  const reset = () => { setCurrent(''); setNext(''); setConfirm(''); setLoading(false); };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async () => {
    if (!current || !next || !confirm) {
      Alert.alert('Missing fields', 'Please fill in all fields.'); return;
    }
    if (next.length < 6) {
      Alert.alert('Weak password', 'New password must be at least 6 characters.'); return;
    }
    if (next !== confirm) {
      Alert.alert('Mismatch', 'New passwords do not match.'); return;
    }
    setLoading(true);
    try {
      const user = auth().currentUser;
      const cred = auth.EmailAuthProvider.credential(user.email, current);
      await user.reauthenticateWithCredential(cred);
      await user.updatePassword(next);
      Alert.alert('Success', 'Password changed successfully!');
      handleClose();
    } catch (err) {
      const msg =
        err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential'
          ? 'Current password is incorrect.'
          : err.message;
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = [styles.modalInput, { borderColor: C.border, color: C.text, backgroundColor: C.background }];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: C.surface }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={[styles.modalIconBox, { backgroundColor: C.primaryGhost }]}>
              <Ionicons name="lock-closed" size={20} color={C.primary} />
            </View>
            <Text style={[styles.modalTitle, { color: C.text }]}>Change Password</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color={C.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.modalSub, { color: C.textSecondary }]}>
            Enter your current password then choose a new one.
          </Text>

          {/* Fields */}
          <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Current Password</Text>
          <View style={[styles.pwdWrap, { borderColor: C.border, backgroundColor: C.background }]}>
            <TextInput
              style={[styles.pwdInput, { color: C.text }]}
              value={current} onChangeText={setCurrent}
              placeholder="Enter current password"
              placeholderTextColor={C.textMuted}
              secureTextEntry={!showPwd}
              autoCapitalize="none"
            />
          </View>

          <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>New Password</Text>
          <View style={[styles.pwdWrap, { borderColor: C.border, backgroundColor: C.background }]}>
            <TextInput
              style={[styles.pwdInput, { color: C.text }]}
              value={next} onChangeText={setNext}
              placeholder="Min. 6 characters"
              placeholderTextColor={C.textMuted}
              secureTextEntry={!showPwd}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPwd(!showPwd)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={18} color={C.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Confirm New Password</Text>
          <TextInput
            style={[inputStyle, { marginBottom: 20 }]}
            value={confirm} onChangeText={setConfirm}
            placeholder="Re-enter new password"
            placeholderTextColor={C.textMuted}
            secureTextEntry={!showPwd}
            autoCapitalize="none"
          />

          {/* Actions */}
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalCancelBtn, { borderColor: C.border }]}
              onPress={handleClose}
            >
              <Text style={[styles.modalCancelText, { color: C.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalSubmitBtn, { backgroundColor: C.primary }, loading && { opacity: 0.7 }]}
              onPress={handleSubmit} disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.modalSubmitText}>Update</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const { C, isDark, toggleTheme } = useTheme();
  const { profile, logout, saveProfile } = useAuth();

  // Edit profile state
  const [editMode, setEditMode]       = useState(false);
  const [editName, setEditName]       = useState('');
  const [editInstitute, setEditInstitute] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Modals
  const [showChangePwd, setShowChangePwd] = useState(false);

  const initials = profile?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) ?? 'AD';

  // ─── Edit profile ────────────────────────────────────────────────────────────
  const startEdit = () => {
    setEditName(profile?.name ?? '');
    setEditInstitute(profile?.institute ?? '');
    setEditMode(true);
  };

  const cancelEdit = () => setEditMode(false);

  const handleSaveProfile = async () => {
    if (!editName.trim()) { Alert.alert('Required', 'Name cannot be empty.'); return; }
    if (!editInstitute.trim()) { Alert.alert('Required', 'Institute name cannot be empty.'); return; }
    setSavingProfile(true);
    try {
      await saveProfile({ name: editName.trim(), institute: editInstitute.trim() });
      setEditMode(false);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  // ─── Delete account ──────────────────────────────────────────────────────────
  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and ALL your data (students, fees, attendance). This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete My Account',
          style: 'destructive',
          onPress: () => confirmDelete(),
        },
      ]
    );
  };

  const confirmDelete = () => {
    Alert.alert(
      'Are you absolutely sure?',
      'All your Firestore data will be deleted permanently.',
      [
        { text: 'Go Back', style: 'cancel' },
        {
          text: 'Yes, Delete Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              const user = auth().currentUser;
              if (!user) return;
              const uid = user.uid;

              // Delete all Firestore subcollections
              const cols = ['students', 'fee_records', 'notifications', 'attendance', 'sync_queue'];
              for (const col of cols) {
                const snap = await firestore().collection('users').doc(uid).collection(col).get();
                const batch = firestore().batch();
                snap.docs.forEach(d => batch.delete(d.ref));
                if (snap.docs.length > 0) await batch.commit();
              }

              // Delete user document
              await firestore().collection('users').doc(uid).delete();

              // Clear local SQLite
              await clearLocalData();

              // Delete Firebase Auth user
              await user.delete();

              // Sign out
              await logout();
            } catch (err) {
              // If delete requires re-auth
              if (err.code === 'auth/requires-recent-login') {
                Alert.alert(
                  'Re-authentication Required',
                  'For security, please log out and log back in, then try deleting your account again.'
                );
              } else {
                Alert.alert('Error', err.message);
              }
            }
          },
        },
      ]
    );
  };

  // ─── Logout ──────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout', style: 'destructive',
        onPress: async () => { await clearLocalData(); await logout(); },
      },
    ]);
  };

  const handleContact = () => {
    Linking.openURL('mailto:exegaganjot@gmail.com?subject=EduLedger%20Query');
  };

  const inputStyle = [styles.editInput, { borderColor: C.border, color: C.text, backgroundColor: C.background }];

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.headerBg, { backgroundColor: C.primary }]} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>

        {/* ── Profile Card ── */}
        <View style={[styles.profileCard, { backgroundColor: C.surface, shadowColor: C.shadow }]}>
          <View style={[styles.profileAvatar, { backgroundColor: C.primaryGhost }]}>
            <Text style={[styles.profileAvatarText, { color: C.primary }]}>{initials}</Text>
          </View>

          {editMode ? (
            // Edit mode
            <View style={{ flex: 1, gap: 8 }}>
              <TextInput
                style={inputStyle}
                value={editName}
                onChangeText={setEditName}
                placeholder="Your name"
                placeholderTextColor={C.textMuted}
                autoCapitalize="words"
              />
              <TextInput
                style={inputStyle}
                value={editInstitute}
                onChangeText={setEditInstitute}
                placeholder="Institute name"
                placeholderTextColor={C.textMuted}
                autoCapitalize="words"
              />
              <View style={styles.editActions}>
                <TouchableOpacity
                  style={[styles.editCancelBtn, { borderColor: C.border }]}
                  onPress={cancelEdit}
                >
                  <Text style={[styles.editCancelText, { color: C.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editSaveBtn, { backgroundColor: C.primary }, savingProfile && { opacity: 0.7 }]}
                  onPress={handleSaveProfile} disabled={savingProfile}
                >
                  {savingProfile
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.editSaveText}>Save</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            // View mode
            <View style={{ flex: 1 }}>
              <Text style={[styles.profileName, { color: C.text }]}>{profile?.name ?? 'Admin'}</Text>
              <Text style={[styles.profileInstitute, { color: C.textSecondary }]}>
                {profile?.institute ?? 'EduLedger'}
              </Text>
              <Text style={[styles.profileEmail, { color: C.textMuted }]}>{profile?.email ?? ''}</Text>
            </View>
          )}

          {!editMode && (
            <TouchableOpacity
              style={[styles.editProfileBtn, { backgroundColor: C.primaryGhost }]}
              onPress={startEdit}
            >
              <Ionicons name="pencil" size={15} color={C.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Appearance ── */}
        <SectionHeader title="APPEARANCE" C={C} />
        <View style={[styles.section, { backgroundColor: C.surface, shadowColor: C.shadow }]}>
          <SettingRow
            C={C}
            icon={isDark ? 'moon' : 'sunny'}
            iconBg={isDark ? '#1E1A3A' : '#FFF3D6'}
            iconColor={isDark ? C.primary : C.warning}
            label="Dark Mode"
            sublabel={isDark ? 'Dark theme is on' : 'Light theme is on'}
            right={
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: C.border, true: C.primary + '80' }}
                thumbColor={isDark ? C.primary : C.white}
              />
            }
          />
        </View>

        {/* ── Account ── */}
        <SectionHeader title="ACCOUNT" C={C} />
        <View style={[styles.section, { backgroundColor: C.surface, shadowColor: C.shadow }]}>
          <SettingRow
            C={C}
            icon="lock-closed-outline"
            iconBg={C.infoLight}
            iconColor={C.info}
            label="Change Password"
            sublabel="Update your login password"
            onPress={() => setShowChangePwd(true)}
          />
          <SettingRow
            C={C}
            icon="log-out-outline"
            iconBg={C.dangerLight}
            iconColor={C.danger}
            label="Logout"
            sublabel="Sign out of your account"
            onPress={handleLogout}
            danger
          />
          <SettingRow
            C={C}
            icon="trash-outline"
            iconBg={C.dangerLight}
            iconColor={C.danger}
            label="Delete Account"
            sublabel="Permanently delete account and all data"
            onPress={handleDeleteAccount}
            danger
          />
        </View>

        {/* ── About ── */}
        <SectionHeader title="ABOUT" C={C} />
        <View style={[styles.section, { backgroundColor: C.surface, shadowColor: C.shadow }]}>
          <SettingRow
            C={C}
            icon="phone-portrait-outline"
            iconBg={C.infoLight}
            iconColor={C.info}
            label="App Version"
            sublabel="EduLedger v1.0.0"
          />
          <SettingRow
            C={C}
            icon="code-slash-outline"
            iconBg={C.primaryGhost}
            iconColor={C.primary}
            label="Developer"
            sublabel="Gaganjot Singh"
          />
          <SettingRow
            C={C}
            icon="mail-outline"
            iconBg={C.successLight}
            iconColor={C.success}
            label="Contact / Support"
            sublabel="exegaganjot@gmail.com"
            onPress={handleContact}
          />
        </View>

        <Text style={[styles.footer, { color: C.textMuted }]}>
          Built with React Native + Expo{'\n'}Firebase Firestore · SQLite · NetInfo
        </Text>
      </ScrollView>

      {/* Change Password Modal */}
      <ChangePasswordModal
        visible={showChangePwd}
        onClose={() => setShowChangePwd(false)}
        C={C}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBg: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 140,
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
  },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 },
  headerTitle: { fontSize: 26, fontWeight: '900', color: '#fff' },

  // Profile card
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginHorizontal: 16, marginBottom: 20,
    borderRadius: 22, padding: 18,
    shadowOpacity: 0.1, shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  profileAvatar: {
    width: 56, height: 56, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
    alignSelf: 'flex-start',
  },
  profileAvatarText: { fontSize: 20, fontWeight: '900' },
  profileName: { fontSize: 16, fontWeight: '800' },
  profileInstitute: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  profileEmail: { fontSize: 11, marginTop: 2 },
  editProfileBtn: {
    width: 36, height: 36, borderRadius: 11,
    justifyContent: 'center', alignItems: 'center',
    alignSelf: 'flex-start',
  },

  // Inline edit
  editInput: {
    borderWidth: 1.5, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 9,
    fontSize: 14,
  },
  editActions: { flexDirection: 'row', gap: 8, marginTop: 2 },
  editCancelBtn: {
    flex: 1, paddingVertical: 9, borderRadius: 10,
    borderWidth: 1.5, alignItems: 'center',
  },
  editCancelText: { fontSize: 13, fontWeight: '700' },
  editSaveBtn: {
    flex: 1, paddingVertical: 9, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  editSaveText: { fontSize: 13, fontWeight: '800', color: '#fff' },

  // Section header
  sectionHeader: {
    borderLeftWidth: 3, marginHorizontal: 16,
    marginBottom: 6, paddingLeft: 10,
  },
  sectionHeaderText: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },

  // Section card
  section: {
    marginHorizontal: 16, marginBottom: 16, borderRadius: 18,
    overflow: 'hidden', shadowOpacity: 0.06, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1,
  },
  rowIcon: { width: 36, height: 36, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  rowLabel: { fontSize: 14, fontWeight: '700' },
  rowSublabel: { fontSize: 11, marginTop: 2 },

  footer: { textAlign: 'center', fontSize: 11, lineHeight: 18, marginTop: 8 },

  // Change password modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 36,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  modalIconBox: { width: 40, height: 40, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  modalTitle: { flex: 1, fontSize: 18, fontWeight: '900' },
  modalSub: { fontSize: 13, marginBottom: 18, lineHeight: 19 },
  fieldLabel: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  pwdWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 12,
    paddingHorizontal: 14, marginBottom: 14,
  },
  pwdInput: { flex: 1, height: 46, fontSize: 15 },
  modalInput: {
    borderWidth: 1.5, borderRadius: 12,
    paddingHorizontal: 14, height: 46, fontSize: 15,
  },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalCancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 13,
    borderWidth: 1.5, alignItems: 'center',
  },
  modalCancelText: { fontSize: 14, fontWeight: '700' },
  modalSubmitBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  modalSubmitText: { fontSize: 14, fontWeight: '800', color: '#fff' },
});
