import { TextStyle } from 'react-native';

export const typography = {
    h1: {
        fontSize: 34,
        fontWeight: '700' as TextStyle['fontWeight'],
        fontFamily: 'Philosopher_700Bold',
        letterSpacing: -0.5,
    },
    h2: {
        fontSize: 28,
        fontWeight: '600' as TextStyle['fontWeight'],
        fontFamily: 'Philosopher_700Bold',
        letterSpacing: -0.3,
    },
    h3: {
        fontSize: 22,
        fontWeight: '600' as TextStyle['fontWeight'],
        fontFamily: 'Philosopher_700Bold',
    },
    title: {
        fontSize: 20,
        fontWeight: '600' as TextStyle['fontWeight'],
        fontFamily: 'Philosopher_700Bold',
    },
    body: {
        fontSize: 17,
        fontWeight: '400' as TextStyle['fontWeight'],
        fontFamily: 'Inter_400Regular',
        lineHeight: 24,
    },
    bodyLarge: {
        fontSize: 19,
        fontWeight: '400' as TextStyle['fontWeight'],
        fontFamily: 'Inter_400Regular',
    },
    caption: {
        fontSize: 15,
        fontWeight: '400' as TextStyle['fontWeight'],
        fontFamily: 'Inter_400Regular',
    },
    small: {
        fontSize: 13,
        fontWeight: '400' as TextStyle['fontWeight'],
        fontFamily: 'Inter_400Regular',
    },
    button: {
        fontSize: 17,
        fontWeight: '600' as TextStyle['fontWeight'],
        fontFamily: 'Philosopher_700Bold',
    },
    arabic: {
        fontSize: 26,
        fontWeight: '400' as TextStyle['fontWeight'],
        fontFamily: 'Amiri_400Regular',
        lineHeight: 42,
        textAlign: 'right' as TextStyle['textAlign'],
    },
    arabicLarge: {
        fontSize: 30,
        fontWeight: '400' as TextStyle['fontWeight'],
        fontFamily: 'Amiri_400Regular',
        lineHeight: 50,
        textAlign: 'right' as TextStyle['textAlign'],
    },
} as const;
