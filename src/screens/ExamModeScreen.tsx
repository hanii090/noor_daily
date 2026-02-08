import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Animated,
    ActivityIndicator,
    Dimensions,
    FlatList,
    Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import { colors, useTheme, typography, spacing, shadows } from '../theme';
import { ExamTiming, ExamSubject, ExamFeeling, Verse, ExamVerse, ExamSession, VerseCardTemplate, VerseCardSize } from '../types';
import { ClubhouseBackground, ClubhouseButton, ClubhouseCard } from '../components/clubhouse';
import { TemplateSelectorModal } from '../components/TemplateSelectorModal';
import { VerseCardTemplateComponent } from '../components/VerseCardTemplate';
import { StudyBreakTimer } from '../components/exam/StudyBreakTimer';
import { PostExamReflection } from '../components/exam/PostExamReflection';
import examService from '../services/examService';
import shareService from '../services/shareService';
import analyticsService from '../services/analyticsService';
import { ShareBottomSheet } from '../components/common/ShareBottomSheet';
import type { ShareOption } from '../components/common/ShareBottomSheet';
import { useTranslation } from 'react-i18next';

type Step = 'timing' | 'details' | 'result' | 'study_timer' | 'post_exam' | 'history';

const TIMING_OPTIONS: { value: ExamTiming; labelKey: string; icon: string; descKey: string }[] = [
    { value: 'today', labelKey: 'exam.today', icon: '⚡', descKey: 'exam.today_desc' },
    { value: 'tomorrow', labelKey: 'exam.tomorrow', icon: '🌅', descKey: 'exam.tomorrow_desc' },
    { value: 'this_week', labelKey: 'exam.this_week', icon: '📅', descKey: 'exam.this_week_desc' },
];

const SUBJECT_OPTIONS: { value: ExamSubject; labelKey: string; icon: string }[] = [
    { value: 'math', labelKey: 'exam.math', icon: '🔢' },
    { value: 'science', labelKey: 'exam.science', icon: '🔬' },
    { value: 'language', labelKey: 'exam.language', icon: '📝' },
    { value: 'history', labelKey: 'exam.history', icon: '📜' },
    { value: 'islamic_studies', labelKey: 'exam.islamic_studies', icon: '🕌' },
    { value: 'other', labelKey: 'exam.other', icon: '📚' },
];

const FEELING_OPTIONS: { value: ExamFeeling; labelKey: string; icon: string; colorKey: string }[] = [
    { value: 'stressed', labelKey: 'exam.stressed', icon: '😰', colorKey: 'coral' },
    { value: 'anxious', labelKey: 'exam.anxious', icon: '😟', colorKey: 'orange' },
    { value: 'tired', labelKey: 'exam.tired', icon: '😴', colorKey: 'purple' },
    { value: 'confident', labelKey: 'exam.confident', icon: '💪', colorKey: 'green' },
    { value: 'hopeful', labelKey: 'exam.hopeful', icon: '🤲', colorKey: 'teal' },
];

interface ExamModeScreenProps {
    onClose: () => void;
}

const ExamModeScreen: React.FC<ExamModeScreenProps> = ({ onClose }) => {
    const { colors: tc } = useTheme();
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const [step, setStep] = useState<Step>('timing');
    const [timing, setTiming] = useState<ExamTiming | null>(null);
    const [subject, setSubject] = useState<ExamSubject | null>(null);
    const [feeling, setFeeling] = useState<ExamFeeling | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [resultVerse, setResultVerse] = useState<Verse | null>(null);
    const [resultExamVerse, setResultExamVerse] = useState<ExamVerse | null>(null);

    const [showShareOptions, setShowShareOptions] = useState(false);
    const [showTemplateSelector, setShowTemplateSelector] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaveMode, setIsSaveMode] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<VerseCardTemplate>('minimal');
    const [selectedSize, setSelectedSize] = useState<VerseCardSize>('post');
    const cardRef = useRef<ViewShot>(null);

    const [examHistory, setExamHistory] = useState<ExamSession[]>([]);

    const fadeAnim = useRef(new Animated.Value(1)).current;

    const loadHistory = async () => {
        const history = await examService.getExamHistory();
        setExamHistory(history);
    };

    const animateTransition = (callback: () => void) => {
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
        }).start(() => {
            callback();
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 250,
                useNativeDriver: true,
            }).start();
        });
    };

    const handleTimingSelect = (selected: ExamTiming) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setTiming(selected);
        animateTransition(() => setStep('details'));
        analyticsService.logEvent('exam_mode_opened');
    };

    const handleGetVerse = async () => {
        if (!timing || !subject || !feeling) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsLoading(true);
        analyticsService.logEvent('exam_subject_selected', { subject });

        try {
            const { verse, examVerse } = await examService.getVerseForExam({
                timing,
                subject,
                feeling,
            });
            setResultVerse(verse);
            setResultExamVerse(examVerse);

            // Save session
            await examService.saveExamSession({
                id: `exam_${Date.now()}`,
                subject,
                timing,
                feeling,
                verseId: verse.id,
                createdAt: new Date().toISOString(),
            });

            analyticsService.logEvent('exam_verse_generated', { feeling, timing });
            animateTransition(() => setStep('result'));
        } catch (_e) {
            // Verse fetch failed — user can retry
        } finally {
            setIsLoading(false);
        }
    };

    const handleSharePress = () => {
        if (!resultVerse) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowShareOptions(true);
    };

    const handleShareAsImage = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setShowShareOptions(false);
        setIsSaveMode(false);
        setShowTemplateSelector(true);
    };

    const handleShareAsText = async () => {
        setShowShareOptions(false);
        if (!resultVerse) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await shareService.shareAsText(resultVerse);
        analyticsService.logEvent('exam_verse_shared', { method: 'text' });
    };

    const handleSaveToPhotos = () => {
        setShowShareOptions(false);
        setIsSaveMode(true);
        setShowTemplateSelector(true);
    };

    const shareOptions: ShareOption[] = [
        { id: 'image', icon: 'image-outline', label: t('guidance.share_as_image'), subtitle: t('guidance.share_as_image_desc'), color: tc.purple, onPress: handleShareAsImage },
        { id: 'text', icon: 'text-outline', label: t('guidance.share_as_text'), subtitle: t('guidance.share_as_text_desc'), color: tc.purple, onPress: handleShareAsText },
        { id: 'save', icon: 'download-outline', label: t('guidance.save_to_photos'), subtitle: t('guidance.save_to_photos_desc'), color: tc.green, onPress: handleSaveToPhotos },
    ];

    const handleTemplateSelect = async (template: VerseCardTemplate, size: VerseCardSize) => {
        setSelectedTemplate(template);
        setSelectedSize(size);
        setShowTemplateSelector(false);
        setIsGenerating(true);

        try {
            await new Promise((resolve) => setTimeout(resolve, 500));
            const imageUri = await shareService.captureCard(cardRef.current);

            if (imageUri) {
                if (isSaveMode) {
                    const saved = await shareService.saveToGallery(imageUri);
                    if (saved) {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    }
                } else {
                    await shareService.shareImage(imageUri, 'Share Exam Verse');
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
                await shareService.cleanupTempFile(imageUri);
            }
            analyticsService.logEvent('exam_verse_shared', { method: isSaveMode ? 'save' : 'image' });
        } catch (_e) {
            // Card generation or share cancelled
        } finally {
            setIsGenerating(false);
            setIsSaveMode(false);
        }
    };

    const handleBack = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (step === 'details') {
            animateTransition(() => setStep('timing'));
        } else if (step === 'result' || step === 'study_timer' || step === 'post_exam') {
            animateTransition(() => setStep('details'));
        } else if (step === 'history') {
            animateTransition(() => setStep('timing'));
        }
    };

    const handleShowHistory = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await loadHistory();
        animateTransition(() => setStep('history'));
    };

    const handleNewVerse = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        animateTransition(() => {
            setStep('details');
            setResultVerse(null);
            setResultExamVerse(null);
        });
    };

    const subjectLabel = subject ? t(SUBJECT_OPTIONS.find((s) => s.value === subject)?.labelKey ?? 'exam.other') : '';
    const dua = examService.getDuaForExam();

    return (
        <ClubhouseBackground>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top || spacing.lg, borderBottomColor: tc.border }]}>
                <TouchableOpacity onPress={step === 'timing' ? onClose : handleBack} style={styles.headerBtn}>
                    <Ionicons
                        name={step === 'timing' ? 'close' : 'chevron-back'}
                        size={24}
                        color={tc.text}
                    />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: tc.text }]}>
                    {step === 'timing' ? t('exam.title') : step === 'result' ? t('exam.your_verse') : step === 'study_timer' ? t('exam.study_timer') : step === 'post_exam' ? t('exam.post_exam') : step === 'history' ? t('exam.exam_history') : t('exam.title')}
                </Text>
                <View style={styles.headerBtn} />
            </View>

            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                <ScrollView
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* ── Step 1: Timing ── */}
                    {step === 'timing' && (
                        <>
                            <View style={styles.stepHeader}>
                                <Text style={styles.stepEmoji}>📚</Text>
                                <Text style={[styles.stepTitle, { color: tc.text }]}>{t('exam.when_exam')}</Text>
                                <Text style={[styles.stepDesc, { color: tc.textSecondary }]}>
                                    {t('exam.when_exam_desc', { defaultValue: "We'll find the perfect verse to help you prepare" })}
                                </Text>
                            </View>

                            <View style={styles.optionsList}>
                                {TIMING_OPTIONS.map((opt) => (
                                    <TouchableOpacity
                                        key={opt.value}
                                        style={[styles.timingCard, { backgroundColor: tc.cream, borderColor: tc.border }]}
                                        onPress={() => handleTimingSelect(opt.value)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.timingIcon}>{opt.icon}</Text>
                                        <View style={styles.timingText}>
                                            <Text style={[styles.timingLabel, { color: tc.text }]}>{t(opt.labelKey)}</Text>
                                            <Text style={[styles.timingDesc, { color: tc.textSecondary }]}>{t(opt.descKey)}</Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={20} color={tc.textTertiary} />
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Dua Section */}
                            <ClubhouseCard style={styles.duaCard} accentColor={tc.teal}>
                                <Text style={[styles.duaSectionTitle, { color: tc.teal }]}>{t('exam.pre_exam_dua')}</Text>
                                <Text style={[styles.duaArabic, { color: tc.text }]}>{dua.arabic}</Text>
                                <Text style={[styles.duaTransliteration, { color: tc.textSecondary }]}>{dua.transliteration}</Text>
                                <Text style={[styles.duaEnglish, { color: tc.textSecondary }]}>{dua.english}</Text>
                            </ClubhouseCard>

                            {/* Quick Actions */}
                            <View style={styles.quickActions}>
                                <TouchableOpacity
                                    style={[styles.quickAction, { backgroundColor: tc.cream, borderColor: tc.border }]}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        animateTransition(() => setStep('study_timer'));
                                    }}
                                >
                                    <Ionicons name="timer-outline" size={22} color={tc.purple} />
                                    <Text style={[styles.quickActionText, { color: tc.text }]}>{t('exam.study_timer')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.quickAction, { backgroundColor: tc.cream, borderColor: tc.border }]}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        animateTransition(() => setStep('post_exam'));
                                    }}
                                >
                                    <Ionicons name="chatbubble-ellipses-outline" size={22} color={tc.green} />
                                    <Text style={[styles.quickActionText, { color: tc.text }]}>{t('exam.post_exam')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.quickAction, { backgroundColor: tc.cream, borderColor: tc.border }]}
                                    onPress={handleShowHistory}
                                >
                                    <Ionicons name="time-outline" size={22} color={tc.orange} />
                                    <Text style={[styles.quickActionText, { color: tc.text }]}>{t('exam.exam_history')}</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    )}

                    {/* ── Step 2: Subject + Feeling ── */}
                    {step === 'details' && (
                        <>
                            <View style={styles.stepHeader}>
                                <Text style={[styles.stepTitle, { color: tc.text }]}>{t('exam.tell_us_more', { defaultValue: 'Tell us more' })}</Text>
                            </View>

                            <Text style={[styles.sectionLabel, { color: tc.textSecondary }]}>{t('exam.what_subject', { defaultValue: 'What subject?' })}</Text>
                            <View style={styles.chipGrid}>
                                {SUBJECT_OPTIONS.map((opt) => (
                                    <TouchableOpacity
                                        key={opt.value}
                                        style={[
                                            styles.chip,
                                            { backgroundColor: tc.cream, borderColor: tc.border },
                                            subject === opt.value && styles.chipSelected,
                                        ]}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setSubject(opt.value);
                                        }}
                                    >
                                        <Text style={styles.chipIcon}>{opt.icon}</Text>
                                        <Text
                                            style={[
                                                styles.chipLabel,
                                                { color: tc.text },
                                                subject === opt.value && styles.chipLabelSelected,
                                            ]}
                                        >
                                            {t(opt.labelKey)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={[styles.sectionLabel, { color: tc.textSecondary }]}>{t('exam.feeling')}</Text>
                            <View style={styles.chipGrid}>
                                {FEELING_OPTIONS.map((opt) => (
                                    <TouchableOpacity
                                        key={opt.value}
                                        style={[
                                            styles.chip,
                                            { backgroundColor: tc.cream, borderColor: tc.border },
                                            feeling === opt.value && [
                                                styles.chipSelected,
                                                { borderColor: (tc as any)[opt.colorKey] || tc.purple, backgroundColor: ((tc as any)[opt.colorKey] || tc.purple) + '15' },
                                            ],
                                        ]}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setFeeling(opt.value);
                                        }}
                                    >
                                        <Text style={styles.chipIcon}>{opt.icon}</Text>
                                        <Text
                                            style={[
                                                styles.chipLabel,
                                                { color: tc.text },
                                                feeling === opt.value && { color: (tc as any)[opt.colorKey] || tc.purple, fontWeight: '700' },
                                            ]}
                                        >
                                            {t(opt.labelKey)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <ClubhouseButton
                                title={t('exam.get_verse', { defaultValue: 'Get My Verse' })}
                                onPress={handleGetVerse}
                                variant="primary"
                                disabled={!subject || !feeling}
                                loading={isLoading}
                                style={styles.getVerseButton}
                            />
                        </>
                    )}

                    {/* ── Step 3: Result ── */}
                    {step === 'result' && resultVerse && resultExamVerse && (
                        <>
                            <View style={styles.resultHeader}>
                                <Text style={styles.resultEmoji}>🌟</Text>
                                <Text style={[styles.resultTitle, { color: tc.text }]}>
                                    {t('exam.for_your_exam', { subject: subjectLabel })}
                                </Text>
                            </View>

                            {/* Main verse card — matches UnifiedGuidanceDisplay */}
                            <ClubhouseCard
                                backgroundColor={tc.cream}
                                style={styles.mainCard}
                            >
                                {/* Card Header */}
                                <View style={styles.cardHeader}>
                                    <View style={[styles.typeBadge, { backgroundColor: tc.purple + '15' }]}>
                                        <Ionicons name="book" size={12} color={tc.purple} />
                                        <Text style={[styles.typeBadgeText, { color: tc.purple }]}>{t('guidance.quranic_verse')}</Text>
                                    </View>
                                    <Text style={[styles.referenceBadge, { color: tc.textTertiary, backgroundColor: tc.backgroundSecondary }]}>
                                        {resultVerse.surah} {resultVerse.verseNumber}
                                    </Text>
                                </View>

                                {/* Arabic */}
                                <View style={styles.arabicContainer}>
                                    <Text style={[styles.arabic, { color: tc.text }]}>{resultVerse.arabic}</Text>
                                    <View style={[styles.arabicDecoration, { backgroundColor: tc.purple + '10' }]} />
                                </View>

                                {/* English */}
                                <Text style={[styles.english, { color: tc.text }]}>"{resultVerse.english}"</Text>

                                {/* Footer */}
                                <Text style={[styles.footerText, { color: tc.textTertiary }]}>VERSE {resultVerse.verseNumber}</Text>

                                {/* Action Bar */}
                                <View style={[styles.actions, { borderTopColor: tc.border }]}>
                                    <View style={styles.actionsLeft}>
                                        <TouchableOpacity
                                            style={[styles.circleAction, { backgroundColor: tc.backgroundSecondary }]}
                                            onPress={() => {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                animateTransition(() => setStep('study_timer'));
                                            }}
                                        >
                                            <Ionicons name="timer-outline" size={22} color={tc.textSecondary} />
                                        </TouchableOpacity>
                                    </View>
                                    <View style={styles.actionsRight}>
                                        <TouchableOpacity onPress={handleSharePress} style={[styles.circleAction, { backgroundColor: tc.backgroundSecondary }]}>
                                            <Ionicons name="share-social-outline" size={22} color={tc.textSecondary} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </ClubhouseCard>

                            {/* Motivation note */}
                            <View style={[styles.motivationCard, { backgroundColor: tc.orange + '10', borderColor: tc.orange + '20' }]}>
                                <Ionicons name="bulb-outline" size={20} color={tc.orange} />
                                <Text style={[styles.motivationText, { color: tc.text }]}>
                                    {resultExamVerse.motivationalNote}
                                </Text>
                            </View>

                            <ClubhouseButton
                                title={t('exam.get_another', { defaultValue: 'Get Another Verse' })}
                                onPress={handleNewVerse}
                                variant="teal"
                                style={styles.anotherButton}
                            />
                        </>
                    )}

                    {/* ── Study Timer ── */}
                    {step === 'study_timer' && <StudyBreakTimer />}

                    {/* ── Post Exam ── */}
                    {step === 'post_exam' && <PostExamReflection />}

                    {/* ── History — Task 20 ── */}
                    {step === 'history' && (
                        <>
                            {examHistory.length === 0 ? (
                                <View style={styles.stepHeader}>
                                    <Ionicons name="time-outline" size={48} color={tc.textTertiary} />
                                    <Text style={[styles.stepTitle, { color: tc.text }]}>{t('exam.no_sessions', { defaultValue: 'No sessions yet' })}</Text>
                                    <Text style={[styles.stepDesc, { color: tc.textSecondary }]}>{t('exam.no_sessions_desc', { defaultValue: 'Your exam sessions will appear here after you use Exam Mode.' })}</Text>
                                </View>
                            ) : (
                                <View style={{ gap: spacing.md }}>
                                    {examHistory.slice(0, 20).map((session) => {
                                        const subjectInfo = SUBJECT_OPTIONS.find(s => s.value === session.subject);
                                        const feelingInfo = FEELING_OPTIONS.find(f => f.value === session.feeling);
                                        const date = new Date(session.createdAt);
                                        const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                                        const timeStr = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

                                        return (
                                            <View key={session.id} style={[styles.historyCard, { backgroundColor: tc.cream, borderColor: tc.border }]}>
                                                <View style={styles.historyCardHeader}>
                                                    <Text style={styles.historyEmoji}>{subjectInfo?.icon ?? '📚'}</Text>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={[styles.historySubject, { color: tc.text }]}>{subjectInfo ? t(subjectInfo.labelKey) : session.subject}</Text>
                                                        <Text style={[styles.historyMeta, { color: tc.textTertiary }]}>{dateStr} · {timeStr}</Text>
                                                    </View>
                                                    <View style={[styles.historyFeelingBadge, { backgroundColor: ((feelingInfo ? (tc as any)[feelingInfo.colorKey] : tc.purple) || tc.purple) + '15' }]}>
                                                        <Text style={{ fontSize: 12 }}>{feelingInfo?.icon ?? ''}</Text>
                                                        <Text style={[styles.historyFeelingText, { color: (feelingInfo ? (tc as any)[feelingInfo.colorKey] : tc.purple) || tc.purple }]}>
                                                            {feelingInfo ? t(feelingInfo.labelKey) : session.feeling}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            )}
                        </>
                    )}
                </ScrollView>
            </Animated.View>

            {/* Hidden ViewShot for image capture */}
            {resultVerse && (
                <View style={styles.hiddenCard}>
                    <ViewShot ref={cardRef} options={{ format: 'png', quality: 1 }}>
                        <VerseCardTemplateComponent
                            verse={resultVerse}
                            template={selectedTemplate}
                            size={selectedSize}
                            moodColor={colors.purple}
                        />
                    </ViewShot>
                </View>
            )}

            {/* Share Options Bottom Sheet */}
            <ShareBottomSheet
                visible={showShareOptions}
                onClose={() => setShowShareOptions(false)}
                options={shareOptions}
                title={t('actions.share')}
            />

            {/* Template Selector Modal */}
            <TemplateSelectorModal
                visible={showTemplateSelector}
                onClose={() => setShowTemplateSelector(false)}
                onSelectTemplate={handleTemplateSelect}
                moodColor={tc.purple}
            />

            {/* Generating Indicator — Modal so it renders above the header */}
            <Modal visible={isGenerating} transparent animationType="fade">
                <View style={styles.generatingOverlay}>
                    <View style={[styles.generatingCard, { backgroundColor: tc.creamLight }]}>
                        <ActivityIndicator size="large" color={tc.purple} />
                        <Text style={[styles.generatingText, { color: tc.text }]}>{t('guidance.generating')}</Text>
                    </View>
                </View>
            </Modal>
        </ClubhouseBackground>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
    },
    headerBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        ...typography.title,
        color: colors.text,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: spacing.lg,
        gap: spacing.lg,
    },

    // Step Header
    stepHeader: {
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.md,
    },
    stepEmoji: {
        fontSize: 48,
    },
    stepTitle: {
        ...typography.h3,
        color: colors.text,
        textAlign: 'center',
    },
    stepDesc: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
    },

    // Timing Cards
    optionsList: {
        gap: spacing.md,
    },
    timingCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.cream,
        borderRadius: 20,
        padding: spacing.lg,
        gap: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    timingIcon: {
        fontSize: 28,
    },
    timingText: {
        flex: 1,
    },
    timingLabel: {
        ...typography.caption,
        fontWeight: '700',
        color: colors.text,
    },
    timingDesc: {
        ...typography.small,
        color: colors.textSecondary,
        marginTop: 2,
    },

    // Dua Card
    duaCard: {
        gap: spacing.md,
    },
    duaSectionTitle: {
        ...typography.caption,
        fontWeight: '700',
        color: colors.teal,
        letterSpacing: 1,
    },
    duaArabic: {
        ...typography.arabic,
        color: colors.text,
        fontSize: 22,
        lineHeight: 36,
    },
    duaTransliteration: {
        ...typography.small,
        color: colors.textSecondary,
        fontStyle: 'italic',
    },
    duaEnglish: {
        ...typography.body,
        color: colors.textSecondary,
        lineHeight: 24,
    },

    // Quick Actions
    quickActions: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    quickAction: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: colors.cream,
        borderRadius: 16,
        paddingVertical: spacing.base,
        paddingHorizontal: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
    },
    quickActionText: {
        ...typography.caption,
        fontSize: 11,
        fontWeight: '600',
        color: colors.text,
        textAlign: 'center',
    },

    // Chip Grid
    sectionLabel: {
        ...typography.caption,
        fontWeight: '700',
        color: colors.textSecondary,
        letterSpacing: 0.5,
    },
    chipGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.sm + 2,
        borderRadius: 20,
        backgroundColor: colors.cream,
        borderWidth: 1.5,
        borderColor: colors.border,
    },
    chipSelected: {
        borderColor: colors.purple,
        backgroundColor: colors.purple + '12',
    },
    chipIcon: {
        fontSize: 18,
    },
    chipLabel: {
        ...typography.caption,
        fontWeight: '500',
        color: colors.text,
    },
    chipLabelSelected: {
        color: colors.purple,
        fontWeight: '700',
    },
    getVerseButton: {
        marginTop: spacing.md,
    },

    // Result
    resultHeader: {
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.md,
    },
    resultEmoji: {
        fontSize: 48,
    },
    resultTitle: {
        ...typography.h3,
        color: colors.text,
        textAlign: 'center',
    },

    // Main card — matches UnifiedGuidanceDisplay
    mainCard: {
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.lg,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        marginBottom: spacing.xl,
    },
    typeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 6,
    },
    typeBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    referenceBadge: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textTertiary,
        backgroundColor: colors.backgroundSecondary,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        overflow: 'hidden',
    },
    arabicContainer: {
        width: '100%',
        alignItems: 'center',
        marginBottom: spacing.xl,
        position: 'relative',
    },
    arabic: {
        ...typography.arabicLarge,
        fontSize: 30,
        color: colors.black,
        textAlign: 'center',
        lineHeight: 56,
        zIndex: 2,
    },
    arabicDecoration: {
        position: 'absolute',
        top: '10%',
        bottom: '10%',
        left: '5%',
        right: '5%',
        borderRadius: 40,
        zIndex: 1,
    },
    english: {
        ...typography.bodyLarge,
        fontSize: 19,
        color: colors.text,
        textAlign: 'center',
        lineHeight: 30,
        marginBottom: spacing.xl,
        width: '100%',
        paddingHorizontal: spacing.sm,
        fontWeight: '500',
    },
    footerText: {
        ...typography.caption,
        fontSize: 11,
        fontWeight: '600',
        color: colors.textTertiary,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border + '10',
    },
    actionsLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    actionsRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    circleAction: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.backgroundSecondary,
        justifyContent: 'center',
        alignItems: 'center',
    },

    motivationCard: {
        flexDirection: 'row',
        gap: spacing.md,
        backgroundColor: colors.orange + '10',
        borderRadius: 16,
        padding: spacing.lg,
        alignItems: 'flex-start',
    },
    motivationText: {
        ...typography.body,
        color: colors.text,
        flex: 1,
        lineHeight: 24,
    },
    anotherButton: {
        marginTop: spacing.xs,
    },

    hiddenCard: {
        position: 'absolute',
        left: -10000,
        top: -10000,
    },
    generatingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2000,
    },
    generatingCard: {
        backgroundColor: colors.creamLight,
        borderRadius: 24,
        padding: spacing.xl,
        alignItems: 'center',
        gap: spacing.base,
    },
    generatingText: {
        ...typography.body,
        fontWeight: '600',
        color: colors.text,
    },

    // ── History ──
    historyCard: {
        backgroundColor: colors.cream,
        borderRadius: 16,
        padding: spacing.base,
    },
    historyCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    historyEmoji: {
        fontSize: 28,
    },
    historySubject: {
        ...typography.body,
        fontWeight: '600',
        color: colors.text,
    },
    historyMeta: {
        ...typography.small,
        color: colors.textTertiary,
        marginTop: 2,
    },
    historyFeelingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: 10,
    },
    historyFeelingText: {
        ...typography.small,
        fontSize: 11,
        fontWeight: '600',
    },
});

export default ExamModeScreen;
