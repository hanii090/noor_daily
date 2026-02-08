import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');
const CONFETTI_COUNT = 30;
const COLORS = ['#FBB81B', '#4DB579', '#7A5BE6', '#FF6B6B', '#00D38C', '#FF9500', '#007AFF'];

interface ConfettiOverlayProps {
    visible: boolean;
    onComplete?: () => void;
}

// Each piece gets one Animated.Value that drives everything via interpolation
const createPiece = () => ({
    anim: new Animated.Value(0),
    startX: Math.random() * width,
    drift: (Math.random() - 0.5) * 100,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: 6 + Math.random() * 6,
    delay: Math.random() * 600,
    duration: 2200 + Math.random() * 1200,
});

export const ConfettiOverlay: React.FC<ConfettiOverlayProps> = ({ visible, onComplete }) => {
    const piecesRef = useRef(Array.from({ length: CONFETTI_COUNT }, createPiece));
    const pieces = piecesRef.current;

    useEffect(() => {
        if (!visible) return;

        // Reset all
        pieces.forEach((p) => p.anim.setValue(0));

        const animations = pieces.map((p) =>
            Animated.timing(p.anim, {
                toValue: 1,
                duration: p.duration,
                delay: p.delay,
                useNativeDriver: true,
            })
        );

        Animated.parallel(animations).start(() => {
            onComplete?.();
        });
    }, [visible]);

    if (!visible) return null;

    return (
        <View style={styles.container} pointerEvents="none">
            {pieces.map((p, i) => {
                const translateY = p.anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-30, height + 20],
                });
                const translateX = p.anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [p.startX, p.startX + p.drift],
                });
                const rotate = p.anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', `${720 + Math.random() * 720}deg`],
                });
                const opacity = p.anim.interpolate({
                    inputRange: [0, 0.7, 1],
                    outputRange: [1, 1, 0],
                });

                return (
                    <Animated.View
                        key={i}
                        style={[
                            styles.piece,
                            {
                                width: p.size,
                                height: p.size * 0.6,
                                backgroundColor: p.color,
                                borderRadius: p.size * 0.15,
                                opacity,
                                transform: [{ translateX }, { translateY }, { rotate }],
                            },
                        ]}
                    />
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 9999,
    },
    piece: {
        position: 'absolute',
    },
});
