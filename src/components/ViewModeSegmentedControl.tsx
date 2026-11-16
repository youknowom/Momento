import React, { memo } from 'react';
import { StyleSheet, View, Text, Pressable, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useThemeColors, useTheme } from '../ThemeProvider';
import { typography, radii, shadows } from '../theme';

export type ViewMode = 'years' | 'months' | 'days' | 'all';

interface ViewModeSegmentedControlProps {
  currentMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
}

const MODES: Array<{ id: ViewMode; label: string }> = [
  { id: 'years', label: 'Years' },
  { id: 'months', label: 'Months' },
  { id: 'days', label: 'Days' },
  { id: 'all', label: 'All Photos' },
];

export const ViewModeSegmentedControl = memo(
  function ViewModeSegmentedControl({
    currentMode,
    onModeChange,
  }: ViewModeSegmentedControlProps) {
    const colors = useThemeColors();
    const { isDark } = useTheme();

    const handlePress = (mode: ViewMode) => {
      if (mode !== currentMode) {
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
        onModeChange(mode);
      }
    };

    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: isDark
              ? 'rgba(40, 40, 42, 0.85)'
              : 'rgba(240, 240, 243, 0.85)',
            borderColor: isDark
              ? 'rgba(255, 255, 255, 0.1)'
              : 'rgba(0, 0, 0, 0.08)',
          },
        ]}
      >
        {MODES.map((item) => {
          const isActive = item.id === currentMode;
          return (
            <Pressable
              key={item.id}
              style={[
                styles.segment,
                isActive && [
                  styles.activeSegment,
                  {
                    backgroundColor: isDark ? '#3A3A3C' : '#FFFFFF',
                  },
                ],
              ]}
              onPress={() => handlePress(item.id)}
            >
              <Text
                style={[
                  styles.label,
                  {
                    color: isActive
                      ? colors.label
                      : colors.secondaryLabel,
                    fontWeight: isActive ? '600' : '500',
                  },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignSelf: 'center',
    borderRadius: 22,
    padding: 3,
    borderWidth: 0.5,
    ...shadows.sm,
  },
  segment: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeSegment: {
    ...shadows.sm,
  },
  label: {
    ...typography.subheadline,
    fontSize: 13,
  },
});
