export { colors, lightColors, darkColors } from './colors';
export type { MoodColor } from './colors';
export { typography } from './typography';
export { spacing } from './spacing';
export { shadows } from './shadows';
export { radius } from './radius';
export { TAB_BAR_HEIGHT, TAB_BAR_BOTTOM, TAB_BAR_SAFE_PADDING } from './layout';

// Theme hook
import { useAppStore } from '../store/appStore';
import { lightColors, darkColors } from './colors';

export type ThemeColors = typeof lightColors;

export const useTheme = () => {
    const isDark = useAppStore((s) => s.settings.darkMode);
    const colors = isDark ? darkColors : lightColors;
    return { colors, isDark };
};
