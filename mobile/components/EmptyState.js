import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function EmptyState({ icon = 'document-outline', title, subtitle }) {
  const { C } = useTheme();
  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: C.primaryGhost }]}>
        <Ionicons name={icon} size={52} color={C.primaryLight} />
      </View>
      <Text style={[styles.title, { color: C.textSecondary }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: C.textMuted }]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  iconWrap: { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  subtitle: { marginTop: 8, fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
