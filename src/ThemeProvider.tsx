import React, {
  createContext,
  useContext,
  useMemo,
} from 'react';
import { useColorScheme } from 'react-native';
import { colors, type ThemeColors } from './theme';

interface ThemeContextValue {
  isDark: boolean;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextValue>({
  isDark: false,
  colors: colors.light,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const value = useMemo<ThemeContextValue>(
    () => ({
      isDark,
      colors: isDark ? colors.dark : colors.light,
    }),
    [isDark],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

export function useThemeColors(): ThemeColors {
  return useContext(ThemeContext).colors;
}
