import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Status config uses fixed colors (not theme-dependent — these are semantic status colors)
const STATUS_CONFIG = {
  full:    { label: 'Paid',    bg: '#D6F7EF', text: '#00C896', icon: 'checkmark-circle' },
  half:    { label: 'Half',    bg: '#FFF3D6', text: '#FFB830', icon: 'remove-circle'    },
  missing: { label: 'Missing', bg: '#FFE0E6', text: '#FF4D6A', icon: 'close-circle'     },
  absent:  { label: 'Absent',  bg: '#F1F5F9', text: '#94A3B8', icon: 'person-remove'    },
};

export default function StatusBadge({ status, size = 'md' }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.missing;
  const sm = size === 'sm';
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }, sm && styles.sm]}>
      <Ionicons name={config.icon} size={sm ? 10 : 12} color={config.text} />
      <Text style={[styles.label, { color: config.text, fontSize: sm ? 10 : 11 }]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, alignSelf: 'flex-start' },
  sm: { paddingHorizontal: 8, paddingVertical: 3 },
  label: { fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
});
