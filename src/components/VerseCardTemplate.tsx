import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing } from '../theme';
import { Verse, VerseCardTemplate, VerseCardSize } from '../types';

interface VerseCardTemplateProps {
    verse: Verse;
    template: VerseCardTemplate;
    size: VerseCardSize;
    moodColor: string;
}

const SIZES = {
    story: { width: 1080, height: 1920 },
    post: { width: 1080, height: 1080 },
};

export const VerseCardTemplateComponent: React.FC<VerseCardTemplateProps> = ({
    verse,
    template,
    size,
    moodColor,
}) => {
    const dimensions = SIZES[size];

    switch (template) {
        case 'minimal':
            return <MinimalTemplate verse={verse} dimensions={dimensions} moodColor={moodColor} />;
        case 'vibrant':
            return <VibrantTemplate verse={verse} dimensions={dimensions} moodColor={moodColor} />;
        case 'classic':
            return <ClassicTemplate verse={verse} dimensions={dimensions} moodColor={moodColor} />;
        default:
            return <MinimalTemplate verse={verse} dimensions={dimensions} moodColor={moodColor} />;
    }
};

// Template 1: Minimal Design
const MinimalTemplate: React.FC<{
    verse: Verse;
    dimensions: { width: number; height: number };
    moodColor: string;
}> = ({ verse, dimensions, moodColor }) => {
    const scale = dimensions.width / 1080;

    return (
        <View style={[styles.container, { width: dimensions.width, height: dimensions.height, backgroundColor: colors.creamLight }]}>
            {/* Subtle pattern overlay */}
            <View style={styles.patternOverlay} />

            {/* Content */}
            <View style={styles.content}>
                {/* Arabic Text */}
                <Text style={[styles.minimalArabic, { fontSize: 56 * scale, color: colors.text }]}>
                    {verse.arabic}
                </Text>

                {/* English Translation */}
                <Text style={[styles.minimalEnglish, { fontSize: 32 * scale, color: colors.textSecondary, marginTop: 40 * scale }]}>
                    {verse.english}
                </Text>

                {/* Verse Reference */}
                <View style={[styles.minimalReference, { marginTop: 60 * scale }]}>
                    <View style={[styles.accentLine, { backgroundColor: moodColor, width: 80 * scale, height: 4 * scale }]} />
                    <Text style={[styles.minimalRefText, { fontSize: 24 * scale, color: colors.textTertiary, marginTop: 20 * scale }]}>
                        Surah {verse.surah} • Verse {verse.verseNumber}
                    </Text>
                </View>
            </View>

            {/* Watermark */}
            <Text style={[styles.watermark, { fontSize: 18 * scale, color: colors.textTertiary, bottom: 40 * scale }]}>
                Noor Daily
            </Text>
        </View>
    );
};

// Template 2: Vibrant Gradient
const VibrantTemplate: React.FC<{
    verse: Verse;
    dimensions: { width: number; height: number };
    moodColor: string;
}> = ({ verse, dimensions, moodColor }) => {
    const scale = dimensions.width / 1080;

    // Create gradient colors based on mood color
    const gradientColors = [moodColor, colors.purple, colors.teal];

    return (
        <View style={[styles.container, { width: dimensions.width, height: dimensions.height }]}>
            <LinearGradient
                colors={gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />

            {/* Semi-transparent overlay for readability */}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.3)' }]} />

            {/* Content */}
            <View style={styles.content}>
                {/* Arabic Text */}
                <Text style={[styles.vibrantArabic, { fontSize: 60 * scale, color: colors.white }]}>
                    {verse.arabic}
                </Text>

                {/* English Translation */}
                <Text style={[styles.vibrantEnglish, { fontSize: 36 * scale, color: colors.white, marginTop: 50 * scale, opacity: 0.95 }]}>
                    "{verse.english}"
                </Text>

                {/* Verse Reference */}
                <View style={[styles.vibrantReference, { marginTop: 70 * scale }]}>
                    <View style={[styles.vibrantRefBox, { paddingHorizontal: 30 * scale, paddingVertical: 15 * scale, borderRadius: 50 * scale }]}>
                        <Text style={[styles.vibrantRefText, { fontSize: 22 * scale, color: colors.white }]}>
                            {verse.surah} • {verse.verseNumber}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Watermark */}
            <Text style={[styles.watermark, { fontSize: 20 * scale, color: colors.white, bottom: 40 * scale, opacity: 0.8 }]}>
                Noor Daily
            </Text>
        </View>
    );
};

// Template 3: Classic Islamic Pattern
const ClassicTemplate: React.FC<{
    verse: Verse;
    dimensions: { width: number; height: number };
    moodColor: string;
}> = ({ verse, dimensions, moodColor }) => {
    const scale = dimensions.width / 1080;

    return (
        <View style={[styles.container, { width: dimensions.width, height: dimensions.height, backgroundColor: colors.cream }]}>
            {/* Decorative Border */}
            <View style={[styles.classicBorder, { borderColor: moodColor, borderWidth: 8 * scale, margin: 60 * scale }]}>
                {/* Inner Border */}
                <View style={[styles.classicInnerBorder, { borderColor: moodColor, borderWidth: 2 * scale, margin: 20 * scale }]}>
                    {/* Content */}
                    <View style={[styles.content, { padding: 40 * scale }]}>
                        {/* Top Ornament */}
                        <Text style={[styles.ornament, { fontSize: 40 * scale, color: moodColor }]}>❋</Text>

                        {/* Arabic Text */}
                        <Text style={[styles.classicArabic, { fontSize: 54 * scale, color: colors.text, marginTop: 30 * scale }]}>
                            {verse.arabic}
                        </Text>

                        {/* Middle Ornament */}
                        <Text style={[styles.ornament, { fontSize: 30 * scale, color: moodColor, marginVertical: 40 * scale }]}>
                            ✦
                        </Text>

                        {/* English Translation */}
                        <Text style={[styles.classicEnglish, { fontSize: 30 * scale, color: colors.textSecondary }]}>
                            {verse.english}
                        </Text>

                        {/* Verse Reference with ornaments */}
                        <View style={[styles.classicReference, { marginTop: 50 * scale }]}>
                            <Text style={[styles.ornament, { fontSize: 20 * scale, color: moodColor }]}>◆</Text>
                            <Text style={[styles.classicRefText, { fontSize: 24 * scale, color: colors.text, marginHorizontal: 20 * scale }]}>
                                Surah {verse.surah} • {verse.verseNumber}
                            </Text>
                            <Text style={[styles.ornament, { fontSize: 20 * scale, color: moodColor }]}>◆</Text>
                        </View>

                        {/* Bottom Ornament */}
                        <Text style={[styles.ornament, { fontSize: 40 * scale, color: moodColor, marginTop: 40 * scale }]}>
                            ❋
                        </Text>
                    </View>
                </View>
            </View>

            {/* Watermark */}
            <Text style={[styles.watermark, { fontSize: 18 * scale, color: colors.textTertiary, bottom: 30 * scale }]}>
                Noor Daily
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    patternOverlay: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.03,
        backgroundColor: colors.text,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 80,
    },

    // Minimal Template Styles
    minimalArabic: {
        fontWeight: '400',
        textAlign: 'center',
        lineHeight: 90,
    },
    minimalEnglish: {
        fontWeight: '400',
        textAlign: 'center',
        lineHeight: 46,
    },
    minimalReference: {
        alignItems: 'center',
    },
    minimalRefText: {
        fontWeight: '500',
    },
    accentLine: {
        borderRadius: 2,
    },

    // Vibrant Template Styles
    vibrantArabic: {
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: 95,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    vibrantEnglish: {
        fontWeight: '400',
        textAlign: 'center',
        lineHeight: 52,
        fontStyle: 'italic',
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    vibrantReference: {
        alignItems: 'center',
    },
    vibrantRefBox: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.5)',
    },
    vibrantRefText: {
        fontWeight: '600',
        letterSpacing: 1,
    },

    // Classic Template Styles
    classicBorder: {
        flex: 1,
        alignSelf: 'stretch',
        borderRadius: 20,
    },
    classicInnerBorder: {
        flex: 1,
        borderRadius: 12,
    },
    classicArabic: {
        fontWeight: '400',
        textAlign: 'center',
        lineHeight: 85,
    },
    classicEnglish: {
        fontWeight: '400',
        textAlign: 'center',
        lineHeight: 46,
    },
    classicReference: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    classicRefText: {
        fontWeight: '500',
    },
    ornament: {
        textAlign: 'center',
    },

    // Common Styles
    watermark: {
        position: 'absolute',
        fontWeight: '500',
        letterSpacing: 2,
    },
});
