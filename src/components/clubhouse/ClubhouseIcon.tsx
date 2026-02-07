import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ClubhouseIconProps {
    name: keyof typeof Ionicons.glyphMap;
    size?: number;
    color: string;
}

export const ClubhouseIcon: React.FC<ClubhouseIconProps> = ({
    name,
    size = 24,
    color,
}) => {
    return (
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={name} size={size} color={color} />
        </View>
    );
};
