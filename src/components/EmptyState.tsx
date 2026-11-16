import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../ThemeProvider';
import { typography, spacing, radii } from '../theme';

interface EmptyStateProps {
  iconName: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export function EmptyState({
  iconName,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}: EmptyStateProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: colors.secondaryBackground },
        ]}
      >
        <Ionicons name={iconName} size={48} color={colors.secondaryLabel} />
      </View>

      <Text style={[styles.title, { color: colors.label }]}>{title}</Text>
      <Text style={[styles.description, { color: colors.secondaryLabel }]}>
        {description}
      </Text>

      {actionLabel && onAction && (
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: colors.tint, opacity: pressed ? 0.8 : 1 },
          ]}
          onPress={onAction}
        >
          <Text style={styles.primaryButtonText}>{actionLabel}</Text>
        </Pressable>
      )}

      {secondaryActionLabel && onSecondaryAction && (
        <Pressable
          style={({ pressed }) => [
            styles.secondaryButton,
            { opacity: pressed ? 0.6 : 1 },
          ]}
          onPress={onSecondaryAction}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.tint }]}>
            {secondaryActionLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.xxxxl,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.title2,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.subheadline,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xxl,
  },
  primaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
