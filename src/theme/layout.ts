import { Platform } from 'react-native';
import { spacing } from './spacing';

export const TAB_BAR_HEIGHT = 68;
export const TAB_BAR_BOTTOM = Platform.OS === 'ios' ? spacing.xl : spacing.lg;

// Use this as paddingBottom on scrollable content to clear the floating tab bar
export const TAB_BAR_SAFE_PADDING = TAB_BAR_HEIGHT + TAB_BAR_BOTTOM + spacing.lg;
