import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, RefreshControl,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getStudentById, getStudentFeeHistory, deleteStudent, getStudentAttendanceSummary } from '../../database/db';
import StatusBadge from '../../components/StatusBadge';
import LoadingScreen from '../../components/LoadingScreen';
import FloatingCard from '../../components/FloatingCard';
import { useTheme } from '../../context/ThemeContext';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ─── Info row helper ──────────────────────────────────────────────────────────
function InfoRow({ icon, label, value, C }) {
  if (!value) return null;
  return (
    <View style={[styles.infoRow, { borderBottomColor: C.border }]}>
      <View style={[styles.infoIcon, { backgroundColor: C.primaryGhost }]}>
        <Ionicons name={icon} size={14} color={C.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.infoLabel, { color: C.textMuted }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: C.text }]}>{value}</Text>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function StudentDetailScreen() {
  const { id } = useLocalSearchParams();
  const { C } = useTheme();
  const [student, setStudent] = useState(null);
  const [feeRecords, setFeeRecords] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [s, fees, attendance] = await Promise.all([
        getStudentById(id),
        getStudentFeeHistory(id),
        getStudentAttendanceSummary(id),
      ]);
      setStudent(s);
      setFeeRecords(fees);
      setAttendanceSummary(attendance);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = () => {
    Alert.alert(
      'Delete Student',
      `Delete ${student?.name}? All fee records will be removed. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            await deleteStudent(id);
            router.replace('/(tabs)/students');
          },
        },
      ]
    );
  };

  if (loading) return <LoadingScreen message="Loading profile..." />;

  const totalPaid = feeRecords.reduce((s, r) => s + r.amount_paid, 0);
  const totalDue  = feeRecords.reduce((s, r) => s + r.amount_due,  0);
  const initials = student?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <View style={[styles.header, { backgroundColor: C.primary }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Student Profile</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => router.push(`/student/edit/${id}`)}
            style={styles.headerBtn}
          >
            <Ionicons name="pencil-outline" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.headerBtn}>
            <Ionicons name="trash-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchData(); }}
            tintColor={C.primary}
          />
        }
      >
        {/* Profile card */}
        <View style={[styles.profileCard, { backgroundColor: C.primary }]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.profileName}>{student?.name}</Text>
          <View style={styles.classChip}>
            <Ionicons name="school-outline" size={13} color="#fff" />
            <Text style={styles.classChipText}>Class {student?.class}</Text>
          </View>
          <View style={styles.feeChip}>
            <Text style={styles.feeChipText}>
              Monthly Fee: ₹{student?.monthly_fee?.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Contact details */}
        <FloatingCard style={[styles.section, { backgroundColor: C.surface }]} level={1}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Contact Details</Text>
          <InfoRow icon="call-outline"   label="Phone"       value={student?.phone}       C={C} />
          <InfoRow icon="mail-outline"   label="Email"       value={student?.email}       C={C} />
          <InfoRow icon="person-outline" label="Parent Name" value={student?.parent_name} C={C} />
        </FloatingCard>

        <View style={[styles.statsRow, { backgroundColor: C.surface, shadowColor: C.shadow }]}>
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: C.success }]}>₹{totalPaid.toLocaleString()}</Text>
            <Text style={[styles.statLbl, { color: C.textSecondary }]}>Total Paid</Text>
          </View>
          <View style={[styles.statBox, styles.statBoxMid, { borderColor: C.border }]}>
            <Text style={[styles.statVal, { color: C.danger }]}>₹{Math.max(0, totalDue - totalPaid).toLocaleString()}</Text>
            <Text style={[styles.statLbl, { color: C.textSecondary }]}>Pending</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: C.primary }]}>{feeRecords.length}</Text>
            <Text style={[styles.statLbl, { color: C.textSecondary }]}>Months</Text>
          </View>
        </View>

        <FloatingCard style={[styles.section, { backgroundColor: C.surface, marginBottom: 12 }]} level={1}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Fee History</Text>
          {feeRecords.length === 0 ? (
            <Text style={[styles.emptyText, { color: C.textMuted }]}>No fee records yet.</Text>
          ) : (
            feeRecords.map((r, i) => {
              const [yr, mo] = r.month.split('-');
              return (
                <View key={r.id} style={[styles.feeRow, { borderBottomColor: C.border },
                  i === feeRecords.length - 1 && { borderBottomWidth: 0 }]}>
                  <View>
                    <Text style={[styles.feeMonth, { color: C.text }]}>{MONTHS[Number(mo)-1]} {yr}</Text>
                    <Text style={[styles.feeMeta, { color: C.textSecondary }]}>
                      Due: ₹{r.amount_due.toLocaleString()} • Paid: ₹{r.amount_paid.toLocaleString()}
                    </Text>
                  </View>
                  <StatusBadge status={r.status} size="sm" />
                </View>
              );
            })
          )}
        </FloatingCard>

        <FloatingCard style={[styles.section, { backgroundColor: C.surface, marginBottom: 32 }]} level={1}>
          <View style={styles.attendanceHeader}>
            <View style={[styles.sectionAccent, { backgroundColor: C.primary }]} />
            <Ionicons name="calendar-outline" size={15} color={C.primary} />
            <Text style={[styles.sectionTitle, { color: C.text }]}>Monthly Attendance</Text>
          </View>
          {attendanceSummary.every((m) => m.working === 0) ? (
            <Text style={[styles.emptyText, { color: C.textMuted }]}>No attendance records yet.</Text>
          ) : (
            attendanceSummary.map((m, i) => {
              const [yr, mo] = m.month.split('-');
              const label = `${MONTHS[Number(mo) - 1]} ${yr}`;
              const pct = m.percentage;
              const hasData = m.working > 0;
              const barColor = !hasData ? C.border : pct >= 80 ? C.success : pct >= 60 ? C.warning : C.danger;
              return (
                <View key={m.month} style={[styles.attendanceRow, { borderBottomColor: C.border },
                  i === attendanceSummary.length - 1 && { borderBottomWidth: 0 }]}>
                  <Text style={[styles.attMonth, { color: C.textSecondary }]}>{label}</Text>
                  <View style={{ flex: 1, marginHorizontal: 10 }}>
                    <View style={[styles.attBarBg, { backgroundColor: C.border }]}>
                      <View style={[styles.attBarFill, { width: hasData ? `${pct}%` : '0%', backgroundColor: barColor }]} />
                    </View>
                    {hasData && (
                      <Text style={[styles.attDetail, { color: C.textMuted }]}>
                        {m.present}P · {m.absent}A{m.holiday > 0 ? ` · ${m.holiday}H` : ''} · {m.working} working days
                      </Text>
                    )}
                  </View>
                  <View style={[styles.attPctBadge, { backgroundColor: hasData ? barColor + '20' : C.border + '40' }]}>
                    <Text style={[styles.attPctText, { color: hasData ? barColor : C.textMuted }]}>
                      {hasData ? `${pct}%` : '—'}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </FloatingCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: { padding: 4 },
  profileCard: {
    alignItems: 'center', paddingBottom: 28, paddingTop: 20,
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32, marginBottom: 16,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '900' },
  profileName: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 8 },
  classChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, marginBottom: 8,
  },
  classChipText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  feeChip: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  feeChipText: { color: 'rgba(255,255,255,0.95)', fontWeight: '700', fontSize: 14 },
  section: { marginHorizontal: 16, marginBottom: 12, padding: 18 },
  sectionTitle: { fontSize: 15, fontWeight: '800', marginBottom: 14 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#E8E6FF' },
  infoIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  infoLabel: { fontSize: 11, fontWeight: '600' },
  infoValue: { fontSize: 14, fontWeight: '600', marginTop: 1 },
  statsRow: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 12,
    borderRadius: 20, shadowOpacity: 0.06,
    shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4, overflow: 'hidden',
  },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statBoxMid: { borderLeftWidth: 1, borderRightWidth: 1 },
  statVal: { fontSize: 18, fontWeight: '900' },
  statLbl: { fontSize: 11, marginTop: 4, fontWeight: '600' },
  emptyText: { textAlign: 'center', paddingVertical: 12 },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1 },
  feeMonth: { fontSize: 15, fontWeight: '700' },
  feeMeta: { fontSize: 12, marginTop: 2 },
  attendanceHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionAccent: { width: 3, height: 16, borderRadius: 2 },
  attendanceRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  attMonth: { fontSize: 12, fontWeight: '700', width: 56 },
  attBarBg: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
  attBarFill: { height: 8, borderRadius: 4 },
  attDetail: { fontSize: 10, fontWeight: '600' },
  attPctBadge: { minWidth: 44, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, alignItems: 'center' },
  attPctText: { fontSize: 13, fontWeight: '900' },
});
