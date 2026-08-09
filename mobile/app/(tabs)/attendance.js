import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getAttendanceForDate,
  saveAttendance,
  isHolidayDate,
  getTodayDateStr,
  ATTENDANCE_MIN_DATE,
  ATTENDANCE_MAX_DATE,
} from '../../database/db';
import LoadingScreen from '../../components/LoadingScreen';
import EmptyState from '../../components/EmptyState';
import { useTheme } from '../../context/ThemeContext';

// ─── Constants (hardcoded — not theme-dependent for status colors) ─────────────
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const STATUS_CONFIG = {
  present: { color: '#00C896', bg: '#D6F7EF', icon: 'checkmark-circle', label: 'Present' },
  absent:  { color: '#FF4D6A', bg: '#FFE0E6', icon: 'close-circle',     label: 'Absent'  },
  holiday: { color: '#8B5CF6', bg: '#F5F3FF', icon: 'sunny',            label: 'Holiday' },
};

const AVATAR_COLORS = ['#6C63FF', '#FF6584', '#00C896', '#FFB830', '#3B9EFF', '#8B5CF6', '#EC4899'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const addDays = (dateStr, days) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const formatDisplayDate = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
};

const clamp = (dateStr) => {
  if (dateStr < ATTENDANCE_MIN_DATE) return ATTENDANCE_MIN_DATE;
  if (dateStr > ATTENDANCE_MAX_DATE) return ATTENDANCE_MAX_DATE;
  return dateStr;
};

// ─── Student row ──────────────────────────────────────────────────────────────
const StudentRow = React.memo(function StudentRow({ item, index, onToggle, isHoliday, C }) {
  const config = STATUS_CONFIG[item.status] || STATUS_CONFIG.present;
  const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];
  const initials = item.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    if (isHoliday) return;
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.93, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 200, friction: 8, useNativeDriver: true }),
    ]).start();
    onToggle(item.student_id);
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          styles.row,
          { borderLeftColor: config.color, backgroundColor: C.surface, shadowColor: C.shadow },
          isHoliday && styles.rowDimmed,
        ]}
        onPress={handlePress}
        activeOpacity={0.75}
      >
        <View style={[styles.avatar, { backgroundColor: avatarColor + '20' }]}>
          <Text style={[styles.avatarText, { color: avatarColor }]}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowName, { color: C.text }]}>{item.name}</Text>
          <Text style={[styles.rowClass, { color: C.textSecondary }]}>Class {item.class}</Text>
        </View>
        <View style={[styles.statusChip, { backgroundColor: config.bg }]}>
          <Ionicons name={config.icon} size={14} color={config.color} />
          <Text style={[styles.statusChipText, { color: config.color }]}>{config.label}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AttendanceScreen() {
  const today = getTodayDateStr();
  const { C } = useTheme();
  const [date, setDate] = useState(clamp(today));
  const [rows, setRows] = useState([]);
  const [isHoliday, setIsHoliday] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadDate = useCallback(async (d) => {
    setLoading(true);
    setSaved(false);
    fadeAnim.setValue(0);
    try {
      const [data, holiday] = await Promise.all([
        getAttendanceForDate(d),
        isHolidayDate(d),
      ]);
      const finalRows = holiday ? data.map((r) => ({ ...r, status: 'holiday' })) : data;
      setRows(finalRows);
      setIsHoliday(holiday);
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDate(date); }, [date]);

  const handleToggle = (studentId) => {
    setRows((prev) =>
      prev.map((r) =>
        r.student_id === studentId
          ? { ...r, status: r.status === 'absent' ? 'present' : 'absent' }
          : r
      )
    );
    setSaved(false);
  };

  const handleHolidayToggle = () => {
    const next = !isHoliday;
    setIsHoliday(next);
    setSaved(false);
    setRows((prev) => prev.map((r) => ({ ...r, status: next ? 'holiday' : 'present' })));
  };

  const handleSave = async () => {
    if (rows.length === 0) return;
    setSaving(true);
    try {
      await saveAttendance(date, rows, isHoliday);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      Alert.alert('Error saving attendance', err.message);
    } finally {
      setSaving(false);
    }
  };

  const goBack    = () => setDate((d) => clamp(addDays(d, -1)));
  const goForward = () => setDate((d) => clamp(addDays(d, +1)));
  const goToToday = () => setDate(clamp(today));

  const canGoBack    = date > ATTENDANCE_MIN_DATE;
  const canGoForward = date < ATTENDANCE_MAX_DATE;
  const isToday      = date === today;

  const presentCount = rows.filter((r) => r.status === 'present').length;
  const absentCount  = rows.filter((r) => r.status === 'absent').length;

  if (loading) return <LoadingScreen message="Loading attendance..." />;

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.headerBg, { backgroundColor: C.primary }]} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Attendance</Text>
          <Text style={styles.headerSub}>
            {isHoliday ? '🎉 Holiday' : `${presentCount} present · ${absentCount} absent`}
          </Text>
        </View>
        {!isToday && (
          <TouchableOpacity style={styles.todayBtn} onPress={goToToday}>
            <Ionicons name="today-outline" size={14} color="#fff" />
            <Text style={styles.todayBtnText}>Today</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Date navigator */}
      <View style={[styles.dateBar, { backgroundColor: C.surface, shadowColor: C.shadow, borderColor: C.border }]}>
        <TouchableOpacity
          onPress={goBack}
          style={[styles.arrowBtn, { backgroundColor: C.primaryGhost }, !canGoBack && { backgroundColor: C.surfaceAlt }]}
          disabled={!canGoBack}
        >
          <Ionicons name="chevron-back" size={18} color={canGoBack ? C.primary : C.textMuted} />
        </TouchableOpacity>
        <View style={styles.dateCenter}>
          <Text style={[styles.dateText, { color: C.text }]}>{formatDisplayDate(date)}</Text>
          {isToday && (
            <View style={[styles.todayPill, { backgroundColor: C.primary }]}>
              <Text style={styles.todayPillText}>TODAY</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          onPress={goForward}
          style={[styles.arrowBtn, { backgroundColor: C.primaryGhost }, !canGoForward && { backgroundColor: C.surfaceAlt }]}
          disabled={!canGoForward}
        >
          <Ionicons name="chevron-forward" size={18} color={canGoForward ? C.primary : C.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Holiday toggle */}
      <TouchableOpacity
        style={[styles.holidayBtn, isHoliday && styles.holidayBtnActive]}
        onPress={handleHolidayToggle}
        activeOpacity={0.8}
      >
        <Ionicons name={isHoliday ? 'sunny' : 'sunny-outline'} size={17} color={isHoliday ? '#fff' : '#8B5CF6'} />
        <Text style={[styles.holidayBtnText, isHoliday && { color: '#fff' }]}>
          {isHoliday ? 'Holiday — Tap to unmark' : 'Mark as Holiday'}
        </Text>
        {isHoliday && <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.7)" />}
      </TouchableOpacity>

      {/* Tip strip */}
      {!isHoliday && rows.length > 0 && (
        <View style={[styles.tipStrip, { backgroundColor: C.surface }]}>
          <Ionicons name="information-circle-outline" size={13} color={C.textMuted} />
          <Text style={[styles.tipText, { color: C.textMuted }]}>Tap a student to mark absent · tap again to revert</Text>
        </View>
      )}

      {/* Student list */}
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <FlatList
          data={rows}
          keyExtractor={(item) => String(item.student_id)}
          renderItem={({ item, index }) => (
            <StudentRow item={item} index={index} onToggle={handleToggle} isHoliday={isHoliday} C={C} />
          )}
          contentContainerStyle={rows.length === 0 ? { flex: 1 } : { paddingHorizontal: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={12}
          ListEmptyComponent={
            <EmptyState icon="people-outline" title="No students" subtitle="Add students first to take attendance" />
          }
        />
      </Animated.View>

      {/* Save button */}
      {rows.length > 0 && (
        <View style={styles.saveWrap}>
          <TouchableOpacity
            style={[
              styles.saveBtn,
              { backgroundColor: saved ? '#00C896' : C.primary, shadowColor: saved ? '#00C896' : C.primary },
              saving && { opacity: 0.75 },
            ]}
            onPress={handleSave} disabled={saving} activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : saved ? (
              <><Ionicons name="checkmark-circle" size={20} color="#fff" /><Text style={styles.saveBtnText}>Attendance Saved!</Text></>
            ) : (
              <><Ionicons name="save-outline" size={20} color="#fff" /><Text style={styles.saveBtnText}>Save Attendance</Text></>
            )}
          </TouchableOpacity>
        </View>
      )}
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
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  todayBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  todayBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  dateBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 18, marginHorizontal: 16, marginBottom: 10,
    paddingVertical: 10, paddingHorizontal: 10,
    shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 5,
    borderWidth: 1.5,
  },
  arrowBtn: { width: 36, height: 36, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  dateCenter: { flex: 1, alignItems: 'center', gap: 4 },
  dateText: { fontSize: 15, fontWeight: '800' },
  todayPill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  todayPillText: { fontSize: 9, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  holidayBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: '#F5F3FF', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 11,
    borderWidth: 1.5, borderColor: '#DDD6FE',
  },
  holidayBtnActive: { backgroundColor: '#8B5CF6', borderColor: '#7C3AED' },
  holidayBtnText: { flex: 1, fontSize: 14, fontWeight: '700', color: '#8B5CF6' },
  tipStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 16, marginBottom: 6,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7,
  },
  tipText: { fontSize: 11, flex: 1 },
  row: {
    borderRadius: 18, flexDirection: 'row', alignItems: 'center',
    padding: 14, marginBottom: 8, borderLeftWidth: 4,
    shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  rowDimmed: { opacity: 0.55 },
  avatar: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontWeight: '900', fontSize: 15 },
  rowName: { fontSize: 15, fontWeight: '700' },
  rowClass: { fontSize: 11, marginTop: 2 },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  statusChipText: { fontSize: 11, fontWeight: '800' },
  saveWrap: { position: 'absolute', bottom: 20, left: 16, right: 16 },
  saveBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10,
    borderRadius: 18, paddingVertical: 16,
    shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 10,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
