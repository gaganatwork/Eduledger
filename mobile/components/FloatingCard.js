import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const SHADOW_LEVELS = {
  1: { shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  2: { shadowOpacity: 0.12, shadowRadius: 18, elevation: 8 },
  3: { shadowOpacity: 0.18, shadowRadius: 24, elevation: 14 },
};

export default function FloatingCard({ children, style, level = 1 }) {
  const { C } = useTheme();
  return (
    <View style={[
      styles.card,
      { backgroundColor: C.surface, shadowColor: C.shadow },
      SHADOW_LEVELS[level] || SHADOW_LEVELS[1],
      style,
    ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, shadowOffset: { width: 0, height: 6 } },
});
