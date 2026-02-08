import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';

interface ClubhouseBackgroundProps {
    children: React.ReactNode;
    color?: 'cream' | 'creamLight';
}

export const ClubhouseBackground: React.FC<ClubhouseBackgroundProps> = ({
    children,
    color = 'creamLight',
}) => {
    const { colors } = useTheme();
    const backgroundColor = color === 'cream' ? colors.cream : colors.creamLight;

    return (
        <View style={[styles.container, { backgroundColor }]}>
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
