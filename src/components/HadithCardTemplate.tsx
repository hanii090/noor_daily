import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing } from '../theme';
import { Hadith, VerseCardTemplate, VerseCardSize } from '../types';

interface HadithCardTemplateProps {
    hadith: Hadith;
    template: VerseCardTemplate;
    size: VerseCardSize;
    moodColor: string;
}

const SIZES = {
    story: { width: 1080, height: 1920 },
    post: { width: 1080, height: 1080 },
};

export const HadithCardTemplate: React.FC<HadithCardTemplateProps> = ({
    hadith,
    template,
    size,
    moodColor,
}) => {
    const dimensions = SIZES[size];

    switch (template) {
        case 'minimal':
            return <MinimalTemplate hadith={hadith} dimensions={dimensions} moodColor={moodColor} />;
        case 'vibrant':
            return <VibrantTemplate hadith={hadith} dimensions={dimensions} moodColor={moodColor} />;
        case 'classic':
            return <ClassicTemplate hadith={hadith} dimensions={dimensions} moodColor={moodColor} />;
        default:
            return <MinimalTemplate hadith={hadith} dimensions={dimensions} moodColor={moodColor} />;
    }
};

// Template 1: Minimal Design
const MinimalTemplate: React.FC<{
    hadith: Hadith;
    dimensions: { width: number; height: number };
    moodColor: string;
}> = ({ hadith, dimensions, moodColor }) => {
    const scale = dimensions.width / 1080;

    return (
        <View style={[styles.container, { width: dimensions.width, height: dimensions.height, backgroundColor: colors.creamLight }]}>
            <View style={styles.patternOverlay} />

            <View style={styles.content}>
                <Text style={[styles.headerLabel, { fontSize: 24 * scale, color: moodColor, marginBottom: 40 * scale }]}>
                    Prophet Muhammad ﷺ said:
                </Text>

                <Text style={[styles.minimalArabic, { fontSize: 50 * scale, color: colors.text }]}>
                    {hadith.arabic}
                </Text>

                <Text style={[styles.minimalEnglish, { fontSize: 32 * scale, color: colors.textSecondary, marginTop: 40 * scale }]}>
                    {hadith.english}
                </Text>

                <View style={[styles.minimalReference, { marginTop: 60 * scale }]}>
                    <View style={[styles.accentLine, { backgroundColor: moodColor, width: 80 * scale, height: 4 * scale }]} />
                    <Text style={[styles.narratorLabel, { fontSize: 26 * scale, color: colors.text, marginTop: 20 * scale }]}>
                        Narrated by {hadith.narrator}
                    </Text>
                    <Text style={[styles.minimalRefText, { fontSize: 22 * scale, color: colors.textTertiary, marginTop: 10 * scale }]}>
                        {hadith.reference}
                    </Text>
                </View>
            </View>

            <Text style={[styles.watermark, { fontSize: 18 * scale, color: colors.textTertiary, bottom: 40 * scale }]}>
                Noor Daily
            </Text>
        </View>
    );
};

// Template 2: Vibrant Gradient
const VibrantTemplate: React.FC<{
    hadith: Hadith;
    dimensions: { width: number; height: number };
    moodColor: string;
}> = ({ hadith, dimensions, moodColor }) => {
    const scale = dimensions.width / 1080;
    const gradientColors = [moodColor, colors.purple, colors.teal] as const;

    return (
        <View style={[styles.container, { width: dimensions.width, height: dimensions.height }]}>
            <LinearGradient
                colors={gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.3)' }]} />

            <View style={styles.content}>
                <Text style={[styles.headerLabel, { fontSize: 26 * scale, color: colors.white, marginBottom: 50 * scale, opacity: 0.9 }]}>
                    The Prophet ﷺ said:
                </Text>

                <Text style={[styles.vibrantArabic, { fontSize: 54 * scale, color: colors.white }]}>
                    {hadith.arabic}
                </Text>

                <Text style={[styles.vibrantEnglish, { fontSize: 36 * scale, color: colors.white, marginTop: 50 * scale, opacity: 0.95 }]}>
                    "{hadith.english}"
                </Text>

                <View style={[styles.vibrantReference, { marginTop: 70 * scale }]}>
                    <View style={[styles.vibrantRefBox, { paddingHorizontal: 30 * scale, paddingVertical: 15 * scale, borderRadius: 12 * scale }]}>
                        <Text style={[styles.vibrantNarratorText, { fontSize: 24 * scale, color: colors.white }]}>
                            {hadith.narrator}
                        </Text>
                        <Text style={[styles.vibrantRefText, { fontSize: 20 * scale, color: colors.white, opacity: 0.8 }]}>
                            {hadith.reference}
                        </Text>
                    </View>
                </View>
            </View>

            <Text style={[styles.watermark, { fontSize: 20 * scale, color: colors.white, bottom: 40 * scale, opacity: 0.8 }]}>
                Noor Daily
            </Text>
        </View>
    );
};

// Template 3: Classic Design
const ClassicTemplate: React.FC<{
    hadith: Hadith;
    dimensions: { width: number; height: number };
    moodColor: string;
}> = ({ hadith, dimensions, moodColor }) => {
    const scale = dimensions.width / 1080;

    return (
        <View style={[styles.container, { width: dimensions.width, height: dimensions.height, backgroundColor: colors.cream }]}>
            <View style={[styles.classicBorder, { borderColor: moodColor, borderWidth: 8 * scale, margin: 60 * scale }]}>
                <View style={[styles.classicInnerBorder, { borderColor: moodColor, borderWidth: 2 * scale, margin: 20 * scale }]}>
                    <View style={[styles.content, { padding: 40 * scale }]}>
                        <Text style={[styles.headerLabel, { fontSize: 24 * scale, color: moodColor, marginBottom: 30 * scale, fontStyle: 'italic' }]}>
                            Prophet Muhammad ﷺ said
                        </Text>
                        <Text style={[styles.ornament, { fontSize: 40 * scale, color: moodColor }]}>❋</Text>

                        <Text style={[styles.classicArabic, { fontSize: 48 * scale, color: colors.text, marginTop: 30 * scale }]}>
                            {hadith.arabic}
                        </Text>

                        <Text style={[styles.ornament, { fontSize: 30 * scale, color: moodColor, marginVertical: 40 * scale }]}>
                            ✦
                        </Text>

                        <Text style={[styles.classicEnglish, { fontSize: 30 * scale, color: colors.textSecondary }]}>
                            {hadith.english}
                        </Text>

                        <View style={[styles.classicReference, { marginTop: 50 * scale }]}>
                            <Text style={[styles.classicNarratorText, { fontSize: 26 * scale, color: colors.text, fontWeight: '700' }]}>
                                — {hadith.narrator}
                            </Text>
                            <Text style={[styles.classicRefText, { fontSize: 22 * scale, color: colors.textTertiary, marginTop: 5 * scale }]}>
                                {hadith.reference}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>

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
    headerLabel: {
        fontWeight: '700',
        letterSpacing: 1,
        textAlign: 'center',
    },
    minimalArabic: {
        fontWeight: '400',
        textAlign: 'center',
        lineHeight: 80,
    },
    minimalEnglish: {
        fontWeight: '400',
        textAlign: 'center',
        lineHeight: 46,
    },
    minimalReference: {
        alignItems: 'center',
    },
    narratorLabel: {
        fontWeight: '700',
    },
    minimalRefText: {
        fontWeight: '500',
    },
    accentLine: {
        borderRadius: 2,
    },
    vibrantArabic: {
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: 85,
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
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        alignItems: 'center',
    },
    vibrantNarratorText: {
        fontWeight: '700',
    },
    vibrantRefText: {
        fontWeight: '500',
    },
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
        lineHeight: 75,
    },
    classicEnglish: {
        fontWeight: '400',
        textAlign: 'center',
        lineHeight: 46,
    },
    classicReference: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    classicNarratorText: {
        textAlign: 'center',
    },
    classicRefText: {
        fontWeight: '500',
        textAlign: 'center',
    },
    ornament: {
        textAlign: 'center',
    },
    watermark: {
        position: 'absolute',
        fontWeight: '500',
        letterSpacing: 2,
    },
});
