import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, RefreshControl, ActivityIndicator, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMonth } from '../../context/MonthContext';
import { useTheme } from '../../context/ThemeContext';
import { getMonthlyFees, updateFeeStatus } from '../../database/db';
import MonthPicker from '../../components/MonthPicker';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import LoadingScreen from '../../components/LoadingScreen';

const AVATAR_COLORS = ['#6C63FF','#FF6584','#00C896','#FFB830','#3B9EFF','#8B5CF6','#EC4899'];

const STATUS_OPTIONS = [
  { value: 'full',    label: 'Full Paid', icon: 'checkmark-circle', color: '#00C896', bg: '#D6F7EF' },
  { value: 'half',    label: 'Half Paid', icon: 'remove-circle',    color: '#FFB830', bg: '#FFF3D6' },
  { value: 'missing', label: 'Not Paid',  icon: 'close-circle',     color: '#FF4D6A', bg: '#FFE0E6' },
  { value: 'absent',  label: 'Absent',    icon: 'person-remove',    color: '#94A3B8', bg: '#F1F5F9' },
];

const FILTER_TABS = [
  { key: 'all', label: 'All' }, { key: 'full', label: '✓ Paid' },
  { key: 'half', label: '½ Half' }, { key: 'missing', label: '✗ Missing' },
  { key: 'absent', label: '– Absent' },
];

function FeeRow({ record, onStatusChange, updating, index, C }) {
  const [open, setOpen] = useState(false);
  const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];
  const initials = record.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <View style={[styles.row, { backgroundColor: C.surface, shadowColor: C.shadow },
      open && [styles.rowOpen, { borderColor: C.primary + '40' }]]}>
      <TouchableOpacity style={styles.rowMain} onPress={() => setOpen(!open)} activeOpacity={0.7}>
        <View style={[styles.rowAvatar, { backgroundColor: avatarColor + '20' }]}>
          <Text style={[styles.rowAvatarText, { color: avatarColor }]}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowName, { color: C.text }]}>{record.name}</Text>
          <Text style={[styles.rowMeta, { color: C.textSecondary }]}>
            Class {record.class}  •  ₹{record.amount_due.toLocaleString()}
          </Text>
        </View>
        {updating
          ? <ActivityIndicator size="small" color={C.primary} />
          : <View style={styles.rowRight}>
              <StatusBadge status={record.status} />
              <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={C.textMuted} style={{ marginTop: 2 }} />
            </View>
        }
      </TouchableOpacity>
      {open && (
        <View style={[styles.optionsPanel, { borderTopColor: C.border }]}>
          <Text style={[styles.optionsLabel, { color: C.textMuted }]}>Change status:</Text>
          <View style={styles.optionsRow}>
            {STATUS_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.optBtn, { backgroundColor: opt.bg },
                  record.status === opt.value && { borderWidth: 1.5, borderColor: C.primary }]}
                onPress={() => { setOpen(false); onStatusChange(record, opt.value); }}
              >
                <Ionicons name={opt.icon} size={16} color={opt.color} />
                <Text style={[styles.optBtnText, { color: opt.color }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

export default function FeesScreen() {
  const { month, setMonth } = useMonth();
  const { C } = useTheme();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [filter, setFilter] = useState('all');

  const fetchFees = useCallback(async () => {
    try {
      const data = await getMonthlyFees(month);
      setRecords(data);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally { setLoading(false); setRefreshing(false); }
  }, [month]);

  useEffect(() => { setLoading(true); fetchFees(); }, [fetchFees]);

  const handleStatusChange = async (record, newStatus) => {
    setUpdatingId(record.id);
    try { await updateFeeStatus(record.student_id, month, newStatus); await fetchFees(); }
    catch (err) { Alert.alert('Error', err.message); }
    finally { setUpdatingId(null); }
  };

  const filtered = useMemo(
    () => filter === 'all' ? records : records.filter((r) => r.status === filter),
    [records, filter]
  );
  const counts = useMemo(() => ({
    full:    records.filter(r => r.status === 'full').length,
    half:    records.filter(r => r.status === 'half').length,
    missing: records.filter(r => r.status === 'missing').length,
    absent:  records.filter(r => r.status === 'absent').length,
  }), [records]);
  const { totalCollected, totalDue } = useMemo(() => ({
    totalCollected: records.filter(r => r.status !== 'absent').reduce((s, r) => s + r.amount_paid, 0),
    totalDue:       records.filter(r => r.status !== 'absent').reduce((s, r) => s + r.amount_due,  0),
  }), [records]);

  if (loading) return <LoadingScreen message="Loading fees..." />;

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.headerBg, { backgroundColor: C.primary }]} />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Fee Tracking</Text>
          <Text style={styles.headerSub}>{records.length} students this month</Text>
        </View>
        <View style={styles.collectedPill}>
          <Ionicons name="wallet" size={13} color="#fff" />
          <Text style={styles.collectedText}>₹{totalCollected.toLocaleString()}</Text>
          <Text style={styles.collectedOf}> / ₹{totalDue.toLocaleString()}</Text>
        </View>
      </View>

      <MonthPicker value={month} onChange={setMonth} />

      <View style={styles.summaryRow}>
        {[
          { label: 'Paid',    count: counts.full,    color: '#00C896', bg: '#D6F7EF' },
          { label: 'Half',    count: counts.half,    color: '#FFB830', bg: '#FFF3D6' },
          { label: 'Missing', count: counts.missing, color: '#FF4D6A', bg: '#FFE0E6' },
          { label: 'Absent',  count: counts.absent,  color: '#94A3B8', bg: C.surfaceAlt },
        ].map((s) => (
          <View key={s.label} style={[styles.summaryChip, { backgroundColor: s.bg }]}>
            <Text style={[styles.summaryCount, { color: s.color }]}>{s.count}</Text>
            <Text style={[styles.summaryLabel, { color: s.color }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
        {FILTER_TABS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterTab, { backgroundColor: C.surface, shadowColor: C.shadow },
              filter === f.key && { backgroundColor: C.primary }]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterTabText, { color: filter === f.key ? '#fff' : C.textSecondary }]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item, index }) => (
          <FeeRow record={item} onStatusChange={handleStatusChange}
            updating={updatingId === item.id} index={index} C={C} />
        )}
        contentContainerStyle={filtered.length === 0 ? { flex: 1 } : { paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={12}
        refreshControl={
          <RefreshControl refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchFees(); }}
            tintColor={C.primary} />
        }
        ListEmptyComponent={<EmptyState icon="wallet-outline" title="No records" subtitle="Pull to refresh" />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBg: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 155,
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14,
  },
  headerTitle: { fontSize: 26, fontWeight: '900', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  collectedPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, marginTop: 4,
  },
  collectedText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  collectedOf: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  summaryRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  summaryChip: { flex: 1, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 4, alignItems: 'center' },
  summaryCount: { fontSize: 20, fontWeight: '900' },
  summaryLabel: { fontSize: 10, fontWeight: '700', marginTop: 1 },
  filterScroll: { gap: 6, paddingHorizontal: 16, paddingBottom: 10 },
  filterTab: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  filterTabText: { fontSize: 12, fontWeight: '700' },
  row: {
    marginHorizontal: 16, marginBottom: 8, borderRadius: 18,
    shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  rowOpen: { shadowOpacity: 0.14, shadowRadius: 14, elevation: 8, borderWidth: 1.5 },
  rowMain: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  rowAvatar: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  rowAvatarText: { fontSize: 14, fontWeight: '900' },
  rowName: { fontSize: 15, fontWeight: '700' },
  rowMeta: { fontSize: 11, marginTop: 2 },
  rowRight: { alignItems: 'flex-end', gap: 4 },
  optionsPanel: { paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: 1 },
  optionsLabel: { fontSize: 11, fontWeight: '700', marginTop: 10, marginBottom: 8 },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  optBtnText: { fontSize: 12, fontWeight: '700' },
});
