import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const MIN_MONTH = '2026-07';
const MAX_MONTH = '2027-07';

export default function MonthPicker({ value, onChange }) {
  const { C } = useTheme();
  const [year, month] = value.split('-').map(Number);

  const handlePrev = () => {
    const d = new Date(year, month - 2);
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (next >= MIN_MONTH) onChange(next);
  };

  const handleNext = () => {
    const d = new Date(year, month);
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (next <= MAX_MONTH) onChange(next);
  };

  const canGoPrev = value > MIN_MONTH;
  const canGoNext = value < MAX_MONTH;

  return (
    <View style={[styles.container, { backgroundColor: C.surface, shadowColor: C.shadow, borderColor: C.border }]}>
      <TouchableOpacity
        onPress={handlePrev}
        style={[styles.arrowBtn, { backgroundColor: C.primaryGhost }, !canGoPrev && { backgroundColor: C.surfaceAlt }]}
        disabled={!canGoPrev}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="chevron-back" size={18} color={canGoPrev ? C.primary : C.textMuted} />
      </TouchableOpacity>
      <View style={styles.labelWrap}>
        <Ionicons name="calendar-outline" size={14} color={C.primaryLight} style={{ marginRight: 6 }} />
        <Text style={[styles.label, { color: C.text }]}>{MONTHS[month - 1]} {year}</Text>
      </View>
      <TouchableOpacity
        onPress={handleNext}
        style={[styles.arrowBtn, { backgroundColor: C.primaryGhost }, !canGoNext && { backgroundColor: C.surfaceAlt }]}
        disabled={!canGoNext}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="chevron-forward" size={18} color={canGoNext ? C.primary : C.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 16, marginHorizontal: 16, marginVertical: 8,
    paddingVertical: 10, paddingHorizontal: 8,
    shadowOpacity: 0.1, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 5,
    borderWidth: 1.5,
  },
  arrowBtn: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  labelWrap: { flexDirection: 'row', alignItems: 'center' },
  label: { fontSize: 16, fontWeight: '800' },
});
