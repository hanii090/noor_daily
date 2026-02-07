import { ViewStyle } from 'react-native';

export const shadows = {
    small: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 1,
    } as ViewStyle,
    medium: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
        elevation: 3,
    } as ViewStyle,
    large: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.08,
        shadowRadius: 32,
        elevation: 6,
    } as ViewStyle,
} as const;
