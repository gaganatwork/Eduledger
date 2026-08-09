import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Alert, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useMonth } from '../../context/MonthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  getDashboardData, getAttendanceForDate,
  isHolidayDate, getTodayDateStr,
} from '../../database/db';
import { clearLocalData } from '../../services/firebase';
import MonthPicker from '../../components/MonthPicker';
import StatusBadge from '../../components/StatusBadge';
import FloatingCard from '../../components/FloatingCard';
import LoadingScreen from '../../components/LoadingScreen';

const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatCard({ label, value, color, bg, icon }) {
  return (
    <View style={[styles.statCard, { backgroundColor: bg }]}>
      <View style={[styles.statIconBox, { backgroundColor: color + '28' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: color + 'AA' }]}>{label}</Text>
    </View>
  );
}

function SectionHeader({ title, icon, C }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionAccent, { backgroundColor: C.primary }]} />
      <Ionicons name={icon} size={15} color={C.primary} />
      <Text style={[styles.sectionTitle, { color: C.text }]}>{title}</Text>
    </View>
  );
}

// ─── Today's Attendance Card ──────────────────────────────────────────────────
const TodayAttendanceCard = React.memo(function TodayAttendanceCard({ C, onPress }) {
  const [summary, setSummary] = useState(null);
  const [holiday, setHoliday] = useState(false);
  const [loading, setLoading] = useState(true);
  const today = getTodayDateStr();
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return; // only load once per mount
    loaded.current = true;
    const load = async () => {
      try {
        const [rows, isHol] = await Promise.all([
          getAttendanceForDate(today),
          isHolidayDate(today),
        ]);
        setHoliday(isHol);
        const present  = rows.filter(r => r.status === 'present').length;
        const absent   = rows.filter(r => r.status === 'absent').length;
        const notTaken = rows.filter(r => r.status === 'present' && r.attendance_id === null).length;
        setSummary({ total: rows.length, present, absent, notTaken: isHol ? 0 : notTaken });
      } catch {}
      finally { setLoading(false); }
    };
    load();
  }, []);

  // Format date e.g. "Thu, Aug 7"
  const d = new Date(today + 'T00:00:00');
  const DAY_NAMES   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const dateLabel = `${DAY_NAMES[d.getDay()]}, ${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}`;

  return (
    <TouchableOpacity
      style={[styles.attendanceCard, { backgroundColor: C.surface, shadowColor: C.shadow }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Card header */}
      <View style={styles.attCardHeader}>
        <View style={[styles.attCardIconBox, { backgroundColor: C.primaryGhost }]}>
          <Ionicons name="calendar" size={18} color={C.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.attCardTitle, { color: C.text }]}>Today's Attendance</Text>
          <Text style={[styles.attCardDate, { color: C.textMuted }]}>{dateLabel}</Text>
        </View>
        <View style={[styles.attCardChevron, { backgroundColor: C.primaryGhost }]}>
          <Ionicons name="chevron-forward" size={14} color={C.primary} />
        </View>
      </View>

      {loading ? (
        <Text style={[styles.attLoading, { color: C.textMuted }]}>Loading...</Text>
      ) : holiday ? (
        <View style={[styles.holidayBanner, { backgroundColor: '#F5F3FF' }]}>
          <Ionicons name="sunny" size={16} color="#8B5CF6" />
          <Text style={styles.holidayBannerText}>Today is a Holiday</Text>
        </View>
      ) : (
        <View style={styles.attStatsRow}>
          {/* Present */}
          <View style={[styles.attStat, { backgroundColor: C.successLight }]}>
            <Ionicons name="checkmark-circle" size={18} color={C.success} />
            <Text style={[styles.attStatVal, { color: C.success }]}>{summary?.present ?? 0}</Text>
            <Text style={[styles.attStatLbl, { color: C.success }]}>Present</Text>
          </View>
          {/* Absent */}
          <View style={[styles.attStat, { backgroundColor: C.dangerLight }]}>
            <Ionicons name="close-circle" size={18} color={C.danger} />
            <Text style={[styles.attStatVal, { color: C.danger }]}>{summary?.absent ?? 0}</Text>
            <Text style={[styles.attStatLbl, { color: C.danger }]}>Absent</Text>
          </View>
          {/* Not taken */}
          <View style={[styles.attStat, { backgroundColor: C.warningLight }]}>
            <Ionicons name="time" size={18} color={C.warning} />
            <Text style={[styles.attStatVal, { color: C.warning }]}>{summary?.notTaken ?? 0}</Text>
            <Text style={[styles.attStatLbl, { color: C.warning }]}>Not Taken</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const { logout, profile } = useAuth();
  const { month, setMonth } = useMonth();
  const { C } = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.96)).current;

  const fetchData = useCallback(async () => {
    try {
      const d = await getDashboardData(month);
      setData(d);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, tension: 80, friction: 10, useNativeDriver: true }),
      ]).start();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [month]);

  useEffect(() => {
    setLoading(true);
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.96);
    fetchData();
  }, [fetchData]);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive',
        onPress: async () => { await clearLocalData(); await logout(); } },
    ]);
  };

  if (loading) return <LoadingScreen message="Loading dashboard..." />;

  const {
    totalStudents, totalDue, totalCollected, totalPending,
    collectionRate, statusBreakdown, pendingStudents,
    monthlyTrend, unreadNotifications,
  } = data || {};

  const rate = Math.min(collectionRate ?? 0, 100);
  const rateColor = rate >= 80 ? C.success : rate >= 50 ? C.warning : C.danger;

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.headerBg, { backgroundColor: C.primary }]} />
      <View style={[styles.headerBgCurve, { backgroundColor: C.primary }]} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchData(); }}
            tintColor="#fff" />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerGreeting}>
              Hello, {profile?.name?.split(' ')[0] ?? 'Admin'} 👋
            </Text>
            <Text style={styles.headerSub}>{profile?.institute ?? 'Fee Overview'}</Text>
          </View>
          <View style={styles.headerActions}>
            {(unreadNotifications ?? 0) > 0 && (
              <TouchableOpacity style={styles.notifBtn} onPress={() => router.push('/(tabs)/notifications')}>
                <Ionicons name="notifications" size={20} color="#fff" />
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>{unreadNotifications}</Text>
                </View>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero card */}
        <Animated.View style={{
          opacity: fadeAnim, transform: [{ scale: scaleAnim }], paddingHorizontal: 16,
        }}>
          <View style={[styles.heroCard, { backgroundColor: C.surface, shadowColor: C.shadow }]}>
            <View style={styles.heroLeft}>
              <Text style={[styles.heroLabel, { color: C.textMuted }]}>Total Collected</Text>
              <Text style={[styles.heroValue, { color: C.text }]}>
                ₹{(totalCollected ?? 0).toLocaleString()}
              </Text>
              <View style={[styles.progressBarBg, { backgroundColor: C.border }]}>
                <View style={[styles.progressBarFill, { width: `${rate}%`, backgroundColor: C.primary }]} />
              </View>
              <View style={styles.heroFooter}>
                <Text style={[styles.heroRate, { color: C.textSecondary }]}>{rate}% collection rate</Text>
                <Text style={[styles.heroPending, { color: C.danger }]}>
                  ₹{(totalPending ?? 0).toLocaleString()} pending
                </Text>
              </View>
            </View>
            <View style={styles.heroRight}>
              <View style={[styles.heroCircle, { backgroundColor: C.background }]}>
                <View style={[styles.heroCircleInner, { borderColor: rateColor }]}>
                  <Text style={[styles.heroCircleVal, { color: rateColor }]}>{rate}%</Text>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>

        <MonthPicker value={month} onChange={setMonth} />

        {/* Stat grid */}
        <Animated.View style={[styles.statsGrid, { opacity: fadeAnim }]}>
          <StatCard label="Students"  value={totalStudents ?? 0}                          color={C.primary}      bg={C.primaryGhost} icon="people"           />
          <StatCard label="Pending"   value={`₹${(totalPending ?? 0).toLocaleString()}`} color={C.danger}       bg={C.dangerLight}  icon="alert-circle"     />
          <StatCard label="Full Paid" value={statusBreakdown?.fullPaid ?? 0}              color={C.success}      bg={C.successLight} icon="checkmark-circle" />
          <StatCard label="Absent"    value={statusBreakdown?.absent ?? 0}                color={C.statusAbsent} bg={C.surfaceAlt}   icon="person-remove"    />
        </Animated.View>

        {/* Today's attendance */}
        <Animated.View style={{ opacity: fadeAnim, marginHorizontal: 16, marginTop: 4 }}>
          <TodayAttendanceCard C={C} onPress={() => router.push('/(tabs)/attendance')} />
        </Animated.View>

        {/* Status breakdown */}
        <Animated.View style={{ opacity: fadeAnim, marginHorizontal: 16, marginTop: 10 }}>
          <FloatingCard style={[styles.section, { backgroundColor: C.surface }]} level={2}>
            <SectionHeader title="Fee Status Breakdown" icon="pie-chart-outline" C={C} />
            <View style={styles.breakdownRow}>
              {[
                { label: 'Paid',    count: statusBreakdown?.fullPaid, status: 'full'    },
                { label: 'Half',    count: statusBreakdown?.halfPaid, status: 'half'    },
                { label: 'Missing', count: statusBreakdown?.missing,  status: 'missing' },
                { label: 'Absent',  count: statusBreakdown?.absent,   status: 'absent'  },
              ].map((item) => (
                <View key={item.status} style={styles.breakdownItem}>
                  <Text style={[styles.breakdownCount, { color: C.text }]}>{item.count ?? 0}</Text>
                  <StatusBadge status={item.status} size="sm" />
                </View>
              ))}
            </View>
          </FloatingCard>
        </Animated.View>

        {/* Pending students */}
        {(pendingStudents?.length ?? 0) > 0 && (
          <Animated.View style={{ opacity: fadeAnim, marginHorizontal: 16, marginTop: 12 }}>
            <FloatingCard style={[styles.section, { backgroundColor: C.surface }]} level={2}>
              <SectionHeader title={`Pending Fees (${pendingStudents.length})`} icon="warning-outline" C={C} />
              {pendingStudents.map((s, i) => (
                <TouchableOpacity
                  key={s.studentId}
                  style={[styles.pendingRow, { borderBottomColor: C.border },
                    i === pendingStudents.length - 1 && { borderBottomWidth: 0 }]}
                  onPress={() => router.push(`/student/${s.studentId}`)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.pendingAvatar, { backgroundColor: C.primaryGhost }]}>
                    <Text style={[styles.pendingAvatarText, { color: C.primary }]}>
                      {s.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.pendingName, { color: C.text }]}>{s.name}</Text>
                    <Text style={[styles.pendingMeta, { color: C.textSecondary }]}>{s.class} • {s.phone}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={[styles.pendingAmt, { color: C.danger }]}>
                      ₹{s.amountPending.toLocaleString()}
                    </Text>
                    <StatusBadge status={s.status} size="sm" />
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={C.textMuted} />
                </TouchableOpacity>
              ))}
            </FloatingCard>
          </Animated.View>
        )}

        {/* Monthly trend */}
        {(monthlyTrend?.length ?? 0) > 0 && (
          <Animated.View style={{ opacity: fadeAnim, marginHorizontal: 16, marginTop: 12 }}>
            <FloatingCard style={[styles.section, { backgroundColor: C.surface }]} level={2}>
              <SectionHeader title="Monthly Collections" icon="trending-up-outline" C={C} />
              {monthlyTrend.map((m) => {
                const pct = m.due > 0 ? Math.min(100, (m.collected / m.due) * 100) : 0;
                const [yr, mo] = m.month.split('-');
                const label = `${SHORT_MONTHS[Number(mo) - 1]} ${yr.slice(2)}`;
                const barColor = pct >= 80 ? C.success : pct >= 50 ? C.warning : C.primary;
                return (
                  <View key={m.month} style={styles.trendRow}>
                    <Text style={[styles.trendMonth, { color: C.textSecondary }]}>{label}</Text>
                    <View style={[styles.trendBarBg, { backgroundColor: C.border }]}>
                      <View style={[styles.trendBarFill, { width: `${pct}%`, backgroundColor: barColor }]} />
                    </View>
                    <Text style={[styles.trendAmt, { color: C.text }]}>
                      ₹{Math.round((m.collected ?? 0) / 1000)}k
                    </Text>
                  </View>
                );
              })}
            </FloatingCard>
          </Animated.View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBg: { position: 'absolute', top: 0, left: 0, right: 0, height: 210 },
  headerBgCurve: {
    position: 'absolute', top: 170, left: -20, right: -20, height: 60,
    borderBottomLeftRadius: 40, borderBottomRightRadius: 40,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
  },
  headerGreeting: { fontSize: 21, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.72)', marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 10 },
  notifBtn: {
    position: 'relative', width: 42, height: 42, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center',
  },
  notifBadge: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: '#FF6584', minWidth: 16, height: 16, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3,
  },
  notifBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  logoutBtn: {
    width: 42, height: 42, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center',
  },
  heroCard: {
    borderRadius: 26, padding: 22, flexDirection: 'row', alignItems: 'center',
    marginBottom: 6, shadowOpacity: 0.2, shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 }, elevation: 14,
  },
  heroLeft: { flex: 1 },
  heroLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  heroValue: { fontSize: 32, fontWeight: '900', marginVertical: 4 },
  progressBarBg: { height: 7, borderRadius: 4, marginVertical: 8, overflow: 'hidden' },
  progressBarFill: { height: 7, borderRadius: 4 },
  heroFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroRate: { fontSize: 12, fontWeight: '600' },
  heroPending: { fontSize: 11, fontWeight: '700' },
  heroRight: { marginLeft: 18 },
  heroCircle: {
    width: 76, height: 76, borderRadius: 38,
    justifyContent: 'center', alignItems: 'center',
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  heroCircleInner: {
    width: 64, height: 64, borderRadius: 32, borderWidth: 3.5,
    justifyContent: 'center', alignItems: 'center',
  },
  heroCircleVal: { fontSize: 15, fontWeight: '900' },
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    paddingHorizontal: 16, marginTop: 6,
  },
  statCard: {
    width: '47%', borderRadius: 20, padding: 16,
    shadowOpacity: 0.07, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  statIconBox: {
    width: 38, height: 38, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  statValue: { fontSize: 22, fontWeight: '900' },
  statLabel: { fontSize: 11, marginTop: 2, fontWeight: '600' },

  // Today's attendance card
  attendanceCard: {
    borderRadius: 22, padding: 16, marginBottom: 4,
    shadowOpacity: 0.1, shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 }, elevation: 7,
  },
  attCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  attCardIconBox: {
    width: 40, height: 40, borderRadius: 13,
    justifyContent: 'center', alignItems: 'center',
  },
  attCardTitle: { fontSize: 14, fontWeight: '800' },
  attCardDate: { fontSize: 11, marginTop: 1 },
  attCardChevron: {
    width: 28, height: 28, borderRadius: 9,
    justifyContent: 'center', alignItems: 'center',
  },
  attLoading: { fontSize: 13, textAlign: 'center', paddingVertical: 8 },
  holidayBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 12, padding: 12,
  },
  holidayBannerText: { fontSize: 14, fontWeight: '700', color: '#8B5CF6' },
  attStatsRow: { flexDirection: 'row', gap: 8 },
  attStat: {
    flex: 1, alignItems: 'center', gap: 4,
    borderRadius: 14, paddingVertical: 12,
  },
  attStatVal: { fontSize: 22, fontWeight: '900' },
  attStatLbl: { fontSize: 10, fontWeight: '700' },

  section: { padding: 18 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionAccent: { width: 3, height: 16, borderRadius: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '800', flex: 1 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between' },
  breakdownItem: { alignItems: 'center', gap: 6 },
  breakdownCount: { fontSize: 24, fontWeight: '900' },
  pendingRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 13,
    borderBottomWidth: 1, gap: 10,
  },
  pendingAvatar: {
    width: 42, height: 42, borderRadius: 13,
    justifyContent: 'center', alignItems: 'center',
  },
  pendingAvatarText: { fontSize: 13, fontWeight: '800' },
  pendingName: { fontSize: 14, fontWeight: '700' },
  pendingMeta: { fontSize: 11, marginTop: 1 },
  pendingAmt: { fontSize: 14, fontWeight: '800' },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  trendMonth: { fontSize: 11, width: 48, fontWeight: '700' },
  trendBarBg: { flex: 1, height: 9, borderRadius: 5, overflow: 'hidden' },
  trendBarFill: { height: 9, borderRadius: 5 },
  trendAmt: { fontSize: 11, fontWeight: '700', width: 38, textAlign: 'right' },
});
