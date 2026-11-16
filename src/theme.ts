import { Platform, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Apple Photos-inspired design tokens ──────────────────────────────

// Spacing scale (4px base)
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 40,
} as const;

// Grid
const GRID_GAP = 1.5; // Pixel gap between thumbnails (Apple Photos uses ~1.5px)
const MIN_COLUMNS = 3;
const MAX_COLUMNS = 5;

export function getGridColumns(screenWidth: number = SCREEN_WIDTH): number {
  // Apple Photos uses 3 columns on phones, more on wider screens
  if (screenWidth >= 768) return MAX_COLUMNS; // iPad
  if (screenWidth >= 428) return 4; // Large phones
  return MIN_COLUMNS;
}

export function getGridItemSize(
  screenWidth: number = SCREEN_WIDTH,
  columns?: number,
): number {
  const cols = columns ?? getGridColumns(screenWidth);
  return (screenWidth - GRID_GAP * (cols - 1)) / cols;
}

export const grid = {
  gap: GRID_GAP,
  getColumns: getGridColumns,
  getItemSize: getGridItemSize,
} as const;

// Typography — uses system fonts
export const typography = {
  // Large title (navigation headers)
  largeTitle: {
    fontSize: 34,
    fontWeight: '700' as const,
    letterSpacing: 0.37,
    lineHeight: 41,
  },
  // Title 1
  title1: {
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: 0.36,
    lineHeight: 34,
  },
  // Title 2
  title2: {
    fontSize: 22,
    fontWeight: '700' as const,
    letterSpacing: 0.35,
    lineHeight: 28,
  },
  // Title 3
  title3: {
    fontSize: 20,
    fontWeight: '600' as const,
    letterSpacing: 0.38,
    lineHeight: 25,
  },
  // Headline
  headline: {
    fontSize: 17,
    fontWeight: '600' as const,
    letterSpacing: -0.41,
    lineHeight: 22,
  },
  // Body
  body: {
    fontSize: 17,
    fontWeight: '400' as const,
    letterSpacing: -0.41,
    lineHeight: 22,
  },
  // Callout
  callout: {
    fontSize: 16,
    fontWeight: '400' as const,
    letterSpacing: -0.32,
    lineHeight: 21,
  },
  // Subheadline
  subheadline: {
    fontSize: 15,
    fontWeight: '400' as const,
    letterSpacing: -0.24,
    lineHeight: 20,
  },
  // Footnote
  footnote: {
    fontSize: 13,
    fontWeight: '400' as const,
    letterSpacing: -0.08,
    lineHeight: 18,
  },
  // Caption 1
  caption1: {
    fontSize: 12,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 16,
  },
  // Caption 2
  caption2: {
    fontSize: 11,
    fontWeight: '400' as const,
    letterSpacing: 0.07,
    lineHeight: 13,
  },
} as const;

// Colors — matching Apple Photos neutral palette
export const colors = {
  light: {
    // Backgrounds
    background: '#FFFFFF',
    secondaryBackground: '#F2F2F7',
    tertiaryBackground: '#FFFFFF',
    groupedBackground: '#F2F2F7',
    secondaryGroupedBackground: '#FFFFFF',

    // Labels
    label: '#000000',
    secondaryLabel: 'rgba(60, 60, 67, 0.6)',
    tertiaryLabel: 'rgba(60, 60, 67, 0.3)',
    quaternaryLabel: 'rgba(60, 60, 67, 0.18)',

    // Fills
    fill: 'rgba(120, 120, 128, 0.2)',
    secondaryFill: 'rgba(120, 120, 128, 0.16)',
    tertiaryFill: 'rgba(118, 118, 128, 0.12)',
    quaternaryFill: 'rgba(116, 116, 128, 0.08)',

    // System
    tint: '#007AFF', // Apple blue
    red: '#FF3B30',
    green: '#34C759',
    yellow: '#FFCC00',

    // Separators
    separator: 'rgba(60, 60, 67, 0.29)',
    opaqueSeparator: '#C6C6C8',

    // Tab bar
    tabBar: 'rgba(249, 249, 249, 0.94)',
    tabBarBorder: 'rgba(0, 0, 0, 0.3)',
    tabBarInactive: '#999999',

    // Navigation bar
    navBar: 'rgba(249, 249, 249, 0.94)',
    navBarBorder: 'rgba(0, 0, 0, 0.3)',

    // Overlays
    overlay: 'rgba(0, 0, 0, 0.4)',

    // Grid
    gridPlaceholder: '#E5E5EA',

    // Viewer
    viewerBackground: '#000000',
    viewerChrome: '#FFFFFF',
  },
  dark: {
    // Backgrounds
    background: '#000000',
    secondaryBackground: '#1C1C1E',
    tertiaryBackground: '#2C2C2E',
    groupedBackground: '#000000',
    secondaryGroupedBackground: '#1C1C1E',

    // Labels
    label: '#FFFFFF',
    secondaryLabel: 'rgba(235, 235, 245, 0.6)',
    tertiaryLabel: 'rgba(235, 235, 245, 0.3)',
    quaternaryLabel: 'rgba(235, 235, 245, 0.18)',

    // Fills
    fill: 'rgba(120, 120, 128, 0.36)',
    secondaryFill: 'rgba(120, 120, 128, 0.32)',
    tertiaryFill: 'rgba(118, 118, 128, 0.24)',
    quaternaryFill: 'rgba(116, 116, 128, 0.18)',

    // System
    tint: '#0A84FF',
    red: '#FF453A',
    green: '#30D158',
    yellow: '#FFD60A',

    // Separators
    separator: 'rgba(84, 84, 88, 0.6)',
    opaqueSeparator: '#38383A',

    // Tab bar
    tabBar: 'rgba(30, 30, 30, 0.94)',
    tabBarBorder: 'rgba(255, 255, 255, 0.15)',
    tabBarInactive: '#666666',

    // Navigation bar
    navBar: 'rgba(30, 30, 30, 0.94)',
    navBarBorder: 'rgba(255, 255, 255, 0.15)',

    // Overlays
    overlay: 'rgba(0, 0, 0, 0.6)',

    // Grid
    gridPlaceholder: '#2C2C2E',

    // Viewer
    viewerBackground: '#000000',
    viewerChrome: '#FFFFFF',
  },
} as const;

export type ThemeColors = Record<keyof typeof colors.light, string>;

// Radii
export const radii = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  full: 9999,
} as const;

// Shadows
export const shadows = {
  sm: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    android: { elevation: 2 },
  }),
  md: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
    },
    android: { elevation: 4 },
  }),
  lg: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
    },
    android: { elevation: 8 },
  }),
} as const;

// Animation config
export const animation = {
  spring: {
    damping: 20,
    stiffness: 300,
    mass: 0.8,
  },
  timing: {
    fast: 150,
    normal: 250,
    slow: 350,
  },
} as const;

// Icon sizes
export const iconSize = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
  xxl: 32,
  tab: 28,
} as const;

// Tab bar
export const tabBar = {
  height: Platform.select({ ios: 49, android: 56 }) ?? 49,
  iconSize: iconSize.tab,
} as const;

// Navigation bar
export const navBar = {
  height: Platform.select({ ios: 44, android: 56 }) ?? 44,
} as const;
