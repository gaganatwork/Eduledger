import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, RefreshControl, SectionList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import {
  getNotifications, markNotificationRead,
  markAllNotificationsRead, deleteNotification,
} from '../../database/db';
import EmptyState from '../../components/EmptyState';
import LoadingScreen from '../../components/LoadingScreen';

const NOTIF_CONFIG = {
  missing_fee: { icon: 'alert-circle',  color: '#FF4D6A', bg: '#FFE0E6', label: 'Missing Fee' },
  partial_fee: { icon: 'remove-circle', color: '#FFB830', bg: '#FFF3D6', label: 'Partial Fee' },
  absent:      { icon: 'person-remove', color: '#94A3B8', bg: '#F1F5F9', label: 'Absent'      },
};

function isToday(dateStr) {
  const d = new Date(dateStr), now = new Date();
  return d.getDate()===now.getDate() && d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
}

function NotifCard({ notif, onRead, onDelete, C }) {
  const config = NOTIF_CONFIG[notif.type] || NOTIF_CONFIG.missing_fee;
  const date = new Date(notif.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return (
    <View style={[styles.card, { backgroundColor: C.surface, shadowColor: C.shadow },
      !notif.is_read && [styles.cardUnread, { borderLeftColor: C.primary }]]}>
      <View style={[styles.iconBox, { backgroundColor: config.bg }]}>
        <Ionicons name={config.icon} size={22} color={config.color} />
      </View>
      <View style={styles.cardContent}>
        <View style={styles.cardTop}>
          <View style={[styles.typeBadge, { backgroundColor: config.bg }]}>
            <Text style={[styles.typeText, { color: config.color }]}>{config.label}</Text>
          </View>
          {!notif.is_read && <View style={[styles.unreadDot, { backgroundColor: C.primary }]} />}
        </View>
        <Text style={[styles.cardMsg, { color: C.text }]}>{notif.message}</Text>
        <Text style={[styles.cardDate, { color: C.textMuted }]}>{date} • {notif.month}</Text>
      </View>
      <View style={styles.cardActions}>
        {!notif.is_read && (
          <TouchableOpacity onPress={() => onRead(notif.id)}
            style={[styles.actionBtn, { backgroundColor: '#D6F7EF' }]}>
            <Ionicons name="checkmark-done" size={15} color="#00C896" />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => onDelete(notif.id)}
          style={[styles.actionBtn, { backgroundColor: '#FFE0E6' }]}>
          <Ionicons name="trash" size={15} color="#FF4D6A" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SectionDivider({ title, count, C }) {
  return (
    <View style={styles.divider}>
      <View style={[styles.dividerLine, { backgroundColor: C.border }]} />
      <View style={[styles.dividerPill, { backgroundColor: C.surface, borderColor: C.border }]}>
        <Text style={[styles.dividerText, { color: C.textSecondary }]}>{title}</Text>
        {count > 0 && <View style={[styles.dividerBadge, { backgroundColor: C.primary }]}>
          <Text style={styles.dividerBadgeText}>{count}</Text>
        </View>}
      </View>
      <View style={[styles.dividerLine, { backgroundColor: C.border }]} />
    </View>
  );
}

export default function NotificationsScreen() {
  const { C } = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifs = useCallback(async () => {
    try { const data = await getNotifications(); setNotifications(data); }
    catch (err) { Alert.alert('Error', err.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchNotifs(); }, [fetchNotifs]);

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const handleRead = async (id) => { await markNotificationRead(id); setNotifications(p => p.map(n => n.id===id ? {...n,is_read:1} : n)); };
  const handleDelete = async (id) => { await deleteNotification(id); setNotifications(p => p.filter(n => n.id!==id)); };
  const handleMarkAll = async () => { await markAllNotificationsRead(); setNotifications(p => p.map(n => ({...n,is_read:1}))); };

  const todayNotifs   = notifications.filter(n => isToday(n.created_at));
  const earlierNotifs = notifications.filter(n => !isToday(n.created_at));
  const sections = [];
  if (todayNotifs.length)   sections.push({ key: 'today',   label: 'Today',   data: todayNotifs });
  if (earlierNotifs.length) sections.push({ key: 'earlier', label: 'Earlier', data: earlierNotifs });

  if (loading) return <LoadingScreen message="Loading alerts..." />;

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.headerBg, { backgroundColor: C.primary }]} />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Alerts</Text>
          <Text style={styles.headerSub}>{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}</Text>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAll}>
            <Ionicons name="checkmark-done-outline" size={15} color="#fff" />
            <Text style={styles.markAllText}>Read all</Text>
          </TouchableOpacity>
        )}
      </View>
      {unreadCount > 0 && (
        <View style={[styles.unreadBanner, { backgroundColor: C.accentLight }]}>
          <View style={[styles.unreadBannerIcon, { backgroundColor: C.accent + '22' }]}>
            <Ionicons name="notifications" size={15} color={C.accent} />
          </View>
          <Text style={[styles.unreadBannerText, { color: C.accent }]}>{unreadCount} alerts need your attention</Text>
          <View style={[styles.unreadBannerBadge, { backgroundColor: C.accent }]}>
            <Text style={styles.unreadBannerBadgeText}>{unreadCount}</Text>
          </View>
        </View>
      )}
      {notifications.length === 0
        ? <EmptyState icon="notifications-off-outline" title="No alerts" subtitle="All fees are up to date ✓" />
        : <SectionList
            sections={sections}
            keyExtractor={item => String(item.id)}
            renderItem={({ item }) => (
              <View style={styles.cardWrap}>
                <NotifCard notif={item} onRead={handleRead} onDelete={handleDelete} C={C} />
              </View>
            )}
            renderSectionHeader={({ section }) => (
              <SectionDivider title={section.label}
                count={section.data.filter(n => !n.is_read).length} C={C} />
            )}
            contentContainerStyle={{ paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchNotifs(); }} tintColor={C.primary} />}
          />
      }
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBg: { position: 'absolute', top: 0, left: 0, right: 0, height: 160, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 },
  headerTitle: { fontSize: 26, fontWeight: '900', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  markAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  markAllText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  unreadBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginBottom: 4, borderRadius: 16, padding: 12 },
  unreadBannerIcon: { width: 30, height: 30, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  unreadBannerText: { flex: 1, fontSize: 13, fontWeight: '700' },
  unreadBannerBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  unreadBannerBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  divider: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  dividerLine: { flex: 1, height: 1 },
  dividerPill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, marginHorizontal: 10, borderWidth: 1 },
  dividerText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  dividerBadge: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 },
  dividerBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  cardWrap: { paddingHorizontal: 16, marginBottom: 8 },
  card: { borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 12, shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  cardUnread: { borderLeftWidth: 3, shadowOpacity: 0.12, elevation: 6 },
  iconBox: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  cardContent: { flex: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  typeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  cardMsg: { fontSize: 13, fontWeight: '600', lineHeight: 19 },
  cardDate: { fontSize: 11, marginTop: 4 },
  cardActions: { flexDirection: 'column', gap: 6 },
  actionBtn: { width: 30, height: 30, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
});
