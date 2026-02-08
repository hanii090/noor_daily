# App Preview Video Script — Noor Daily

> 30-second portrait video for App Store and Google Play.

---

## Technical Specifications

| Spec | Requirement |
| ---- | ----------- |
| Orientation | Portrait (9:16) |
| Resolution | 1080 x 1920 minimum (1440 x 3040 recommended) |
| Duration | 28-30 seconds |
| Frame rate | 30 fps or 60 fps |
| Audio | Optional (subtitles required regardless) |
| Format | H.264 MP4 (Apple), WebM or MP4 (Google) |
| Apple max size | 500 MB |
| Google max size | 100 MB |

---

## Script — Version A: Student-Focused Hook

### Scene 1: Hook (0-3s)

**Visual:** Dark background fades in. Text appears letter by letter:
"Exam stress keeping you up?"

**Subtitle overlay:** Same as visual text
**Transition:** Quick dissolve to app

---

### Scene 2: Exam Mode (3-7s)

**Visual:** Hand taps "Exam Mode" on HomeScreen floating bar. ExamModeScreen opens — user selects "Before Exam" timing, taps a subject, selects "Anxious" feeling. Beautiful verse result slides in with Arabic calligraphy.

**Subtitle overlay:** "Get the perfect verse for every moment"
**Transition:** Smooth upward swipe

---

### Scene 3: Mood Selection (7-11s)

**Visual:** HomeScreen mood selector. Finger taps through 2-3 mood cards quickly (grateful > peace > strength). Each tap shows a new verse appearing with smooth animation.

**Subtitle overlay:** "Guidance that matches how you feel"
**Transition:** Crossfade

---

### Scene 4: 30-Day Journey (11-16s)

**Visual:** JourneyScreen dashboard. Camera slowly zooms into the calendar grid showing completed days with checkmarks, streak counter animating from 0 to 14, progress bar filling up. Quick flash of a badge being earned.

**Subtitle overlay:** "Build lasting spiritual habits"
**Transition:** Slide left

---

### Scene 5: AI Tafsir (16-19s)

**Visual:** Verse display with AI insight expanding. Show the purple "AI Insight" badge, then the explanation text smoothly appearing below the verse.

**Subtitle overlay:** "AI-powered explanations you'll actually understand"
**Transition:** Crossfade

---

### Scene 6: Share Cards (19-23s)

**Visual:** Template selector opens. Finger swipes through 3 templates (minimal, vibrant, classic). Taps share — shows the beautiful card ready for Instagram.

**Subtitle overlay:** "Share beautiful Islamic content"
**Transition:** Zoom out

---

### Scene 7: CTA (23-28s)

**Visual:** App icon centered on branded cream background. Text animates in:

Line 1: "Noor Daily"
Line 2: "Your Daily Islamic Companion"
Line 3: "Download Free Today"

Small badges below: App Store + Google Play logos

**Subtitle overlay:** "Download Noor Daily — Free"
**Transition:** Fade to app icon

---

## Script — Version B: General Audience Hook

### Scene 1: Hook (0-3s)

**Visual:** Soft cream background. Arabic calligraphy of Bismillah fades in, then text:
"Start every day with divine guidance"

---

### Scene 2: Morning Routine (3-8s)

**Visual:** Notification banner slides down showing a verse preview. User taps it — app opens to a beautiful verse with Arabic text, translation, and audio waveform playing.

**Subtitle overlay:** "Beautiful daily verses & Hadith"

---

### Scene 3: Mood Match (8-12s)

**Visual:** Mood cards fan out. User taps "Seeking Peace" — verse appears with calming green accent. Swipe right — "Grateful" mood — warm gold verse appears.

**Subtitle overlay:** "Matched to your emotional state"

---

### Scene 4: Journey + Features (12-20s)

**Visual:** Quick montage (1.5s each):
1. 30-Day Journey calendar with streak
2. 99 Names card expanding
3. Exam Mode verse result
4. Share card being created
5. Dark mode toggle

**Subtitle overlay:** "Journey. Names. Exams. Share. Dark Mode."

---

### Scene 5: CTA (20-28s)

Same as Version A Scene 7.

---

## Production Notes

### Recording Method

**Option A: Screen Recording (Fastest)**

```bash
# iOS Simulator recording
xcrun simctl io booted recordVideo preview.mp4

# Or use QuickTime:
# File > New Movie Recording > Select simulator window
```

**Option B: Physical Device (Best Quality)**

1. Connect iPhone via Lightning/USB-C
2. Open QuickTime > File > New Movie Recording
3. Select iPhone as camera source
4. Record at native resolution

### Post-Production

- **Tool:** iMovie (free), CapCut (free), or After Effects
- **Add text overlays** matching brand fonts (Inter Bold for headlines)
- **Transitions:** Keep simple — dissolve, slide, crossfade. No flashy effects.
- **Pacing:** Each scene should feel snappy. Cut on action (finger tap = scene change)
- **Color grade:** Warm, slightly desaturated to match the cream/beige brand palette
- **Music (optional):** Soft, ambient nasheeed or no music. Apple requires in-app audio only.

### Apple-Specific Rules

1. Must show **actual app functionality** (no mockups, no pre-rendered animations)
2. No people or lifestyle shots — app screens only
3. No prices or "free" claims in the video itself (text overlays at end are OK)
4. Must use device-captured footage
5. Audio must come from the app itself (recitation audio is perfect)

### Google Play Specific

1. More flexible — can include lifestyle elements
2. Promo video appears as YouTube embed
3. Can be hosted on YouTube (unlisted)
4. Thumbnail is auto-generated from first frame — make it count

---

## Storyboard Quick Reference

| Time | Scene | Screen | Caption |
| ---- | ----- | ------ | ------- |
| 0-3s | Hook | Text overlay | "Exam stress keeping you up?" |
| 3-7s | Exam Mode | ExamModeScreen | "Perfect verse for every moment" |
| 7-11s | Moods | HomeScreen | "Guidance that matches how you feel" |
| 11-16s | Journey | JourneyScreen | "Build lasting spiritual habits" |
| 16-19s | AI Tafsir | UnifiedGuidanceDisplay | "AI explanations you'll understand" |
| 19-23s | Share | TemplateSelectorModal | "Share beautiful Islamic content" |
| 23-28s | CTA | Branded screen | "Download Noor Daily — Free" |
