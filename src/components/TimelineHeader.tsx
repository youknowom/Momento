import React, { memo } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { useThemeColors } from '../ThemeProvider';
import { typography, spacing } from '../theme';

interface TimelineHeaderProps {
  title: string;
  subtitle?: string;
  count?: number;
  onSelectPress?: () => void;
  isSelecting?: boolean;
}

export const TimelineHeader = memo(function TimelineHeader({
  title,
  subtitle,
  count,
  onSelectPress,
  isSelecting = false,
}: TimelineHeaderProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderBottomColor: colors.separator,
        },
      ]}
    >
      <View style={styles.textContainer}>
        <Text
          style={[
            styles.title,
            { color: colors.label },
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={[
              styles.subtitle,
              { color: colors.secondaryLabel },
            ]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        )}
      </View>

      {onSelectPress && (
        <Pressable
          onPress={onSelectPress}
          hitSlop={10}
          style={({ pressed }) => [
            styles.selectButton,
            { opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Text style={[styles.selectText, { color: colors.tint }]}>
            {isSelecting ? 'Cancel' : 'Select'}
          </Text>
        </Pressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  title: {
    ...typography.title3,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  subtitle: {
    ...typography.footnote,
    marginTop: 2,
  },
  selectButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  selectText: {
    ...typography.body,
    fontWeight: '600',
    fontSize: 15,
  },
});
