export { colors, lightColors, darkColors } from './colors';
export { typography } from './typography';
export { spacing } from './spacing';
export { shadows } from './shadows';

// Theme hook
import { useAppStore } from '../store/appStore';
import { lightColors, darkColors } from './colors';

export const useTheme = () => {
    const { settings } = useAppStore();
    return settings.darkMode ? darkColors : lightColors;
};
