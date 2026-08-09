import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, Alert, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getStudents, deleteStudent } from '../../database/db';
import { useTheme } from '../../context/ThemeContext';
import EmptyState from '../../components/EmptyState';
import LoadingScreen from '../../components/LoadingScreen';

const AVATAR_COLORS = [
  '#6C63FF', '#FF6584', '#00C896',
  '#FFB830', '#3B9EFF', '#8B5CF6', '#EC4899',
];

const StudentCard = React.memo(function StudentCard({ student, onDelete, index, C }) {
  const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];
  const initials = student.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: C.surface, borderLeftColor: avatarColor + '99', shadowColor: C.shadow }]}
      onPress={() => router.push(`/student/${student.id}`)}
      activeOpacity={0.75}
    >
      <View style={[styles.cardAccent, { backgroundColor: avatarColor }]} />
      <View style={[styles.avatar, { backgroundColor: avatarColor + '20' }]}>
        <Text style={[styles.avatarText, { color: avatarColor }]}>{initials}</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={[styles.cardName, { color: C.text }]}>{student.name}</Text>
        <View style={styles.cardTags}>
          <View style={[styles.tag, { backgroundColor: avatarColor + '18' }]}>
            <Ionicons name="school-outline" size={10} color={avatarColor} />
            <Text style={[styles.tagText, { color: avatarColor }]}>{student.class}</Text>
          </View>
          <View style={[styles.tag, { backgroundColor: C.surfaceAlt }]}>
            <Ionicons name="call-outline" size={10} color={C.textSecondary} />
            <Text style={[styles.tagText, { color: C.textSecondary }]}>{student.phone}</Text>
          </View>
        </View>
      </View>
      <View style={styles.cardRight}>
        <View style={[styles.feeChip, { backgroundColor: avatarColor + '18' }]}>
          <Text style={[styles.feeText, { color: avatarColor }]}>₹{student.monthly_fee.toLocaleString()}</Text>
          <Text style={[styles.feePer, { color: avatarColor + 'AA' }]}>/mo</Text>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity
            onPress={() => router.push(`/student/edit/${student.id}`)}
            style={[styles.actionBtn, { backgroundColor: C.primaryGhost }]}
          >
            <Ionicons name="pencil" size={13} color={C.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onDelete(student)}
            style={[styles.actionBtn, { backgroundColor: C.dangerLight }]}
          >
            <Ionicons name="trash" size={13} color={C.danger} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
});
export default function StudentsScreen() {
  const { C } = useTheme();
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStudents = useCallback(async () => {
    try {
      const data = await getStudents(search);
      setStudents(data);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => fetchStudents(), 300);
    return () => clearTimeout(t);
  }, [fetchStudents]);

  const handleDelete = (student) => {
    Alert.alert('Delete Student', `Delete ${student.name}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive',
        onPress: async () => {
          await deleteStudent(student.id);
          setStudents((prev) => prev.filter((s) => s.id !== student.id));
        },
      },
    ]);
  };

  if (loading) return <LoadingScreen message="Loading students..." />;

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.headerBg, { backgroundColor: C.primary }]} />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Students</Text>
          <View style={styles.headerSubRow}>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{students.length}</Text>
            </View>
            <Text style={styles.headerSub}>enrolled</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/student/add')}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={[styles.searchCard, { backgroundColor: C.surface, shadowColor: C.shadow }]}>
        <Ionicons name="search-outline" size={17} color={C.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={[styles.searchInput, { color: C.text }]}
          placeholder="Search by name or phone..."
          placeholderTextColor={C.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={17} color={C.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        data={students}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item, index }) => (
          <StudentCard student={item} onDelete={handleDelete} index={index} C={C} />
        )}
        contentContainerStyle={students.length === 0 ? { flex: 1 } : { padding: 16, gap: 10 }}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={12}
        refreshControl={
          <RefreshControl refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchStudents(); }}
            tintColor={C.primary} />
        }
        ListEmptyComponent={
          <EmptyState icon="people-outline" title="No students yet"
            subtitle={search ? 'Try a different search' : 'Tap + to add your first student'} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBg: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 165,
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
  },
  headerTitle: { fontSize: 26, fontWeight: '900', color: '#fff' },
  headerSubRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  countBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  countBadgeText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  addBtn: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
  },
  searchCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 16, marginHorizontal: 16, marginBottom: 10,
    paddingHorizontal: 14, paddingVertical: 4,
    shadowOpacity: 0.1, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  searchInput: { flex: 1, height: 46, fontSize: 15 },
  card: {
    borderRadius: 20, flexDirection: 'row', alignItems: 'center',
    padding: 14, borderLeftWidth: 4, overflow: 'hidden',
    shadowOpacity: 0.07, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  cardAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  avatar: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontWeight: '900', fontSize: 16 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '800' },
  cardTags: { flexDirection: 'row', gap: 6, marginTop: 5 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  tagText: { fontSize: 10, fontWeight: '600' },
  cardRight: { alignItems: 'flex-end', gap: 8 },
  feeChip: { flexDirection: 'row', alignItems: 'baseline', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  feeText: { fontSize: 14, fontWeight: '900' },
  feePer: { fontSize: 10, marginLeft: 2 },
  cardActions: { flexDirection: 'row', gap: 6 },
  actionBtn: { width: 30, height: 30, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
});
