# Screenshot Strategy Guide — Noor Daily

> Specifications, layout, captions, and design system for all store screenshots.

---

## Required Sizes

### Apple App Store
| Device | Resolution | Required? |
|--------|-----------|-----------|
| iPhone 6.7" (15 Pro Max) | 1290 x 2796 | **Yes** (primary) |
| iPhone 6.5" (11 Pro Max) | 1242 x 2688 | **Yes** |
| iPhone 5.5" (8 Plus) | 1242 x 2208 | Recommended |
| iPad Pro 12.9" (6th gen) | 2048 x 2732 | **Yes** (if supporting iPad) |

### Google Play Store
| Device | Resolution | Required? |
|--------|-----------|-----------|
| Phone | 1080 x 1920 (min) | **Yes** |
| Phone (hi-res) | 1440 x 3040 | Recommended |
| Tablet 7" | 1200 x 1920 | If supporting tablets |
| Tablet 10" | 1600 x 2560 | If supporting tablets |

### Feature Graphic (Google Play only)
- **Size:** 1024 x 500
- **Usage:** Appears at top of store listing
- **Content:** App logo + tagline + key visual on branded background

---

## Design System for Screenshots

### Colors
| Element | Color | Hex |
|---------|-------|-----|
| Primary background | Warm cream | `#F3F2E3` |
| Secondary background | Soft white | `#FAFAF5` |
| Accent (primary) | Deep purple | `#8B5CF6` |
| Accent (secondary) | Warm gold | `#D4A574` |
| Text (primary) | Dark charcoal | `#2D2B2A` |
| Text (secondary) | Muted brown | `#8B8680` |

### Typography
| Element | Font | Size | Weight |
|---------|------|------|--------|
| Caption headline | Inter (or SF Pro) | 48-56px | Bold |
| Caption subtext | Inter (or SF Pro) | 28-32px | Regular |
| Arabic text | Amiri | 36-44px | Regular |

### Layout Rules
- **Device frame:** iPhone 15 Pro (titanium) or clean bezel-less mockup
- **Caption position:** Top 25% of image (above device)
- **Caption alignment:** Center-aligned
- **Device scale:** 70-75% of frame height
- **Background:** Subtle gradient or solid brand color
- **Padding:** Minimum 40px from edges
- **No more than 6-8 words per caption**

---

## Screenshot Sequence (8 Screenshots)

Each screenshot tells part of a story. The sequence is optimized for the "first 3 visible" rule — the first 3 screenshots must convey the full value proposition.

---

### Screenshot 1: HERO

**Caption:** "Guidance That Matches Your Heart"
**Subcaption:** "Quran & Hadith for every mood"
**Screen shown:** HomeScreen with mood selector visible (8 mood cards)
**Background:** Cream gradient (`#F3F2E3` → `#EDE8D0`)

**Why first:** Immediately communicates the unique value prop (mood-matching). Visually shows the beautiful UI. The mood cards are colorful and eye-catching in search results.

---

### Screenshot 2: 30-DAY JOURNEY

**Caption:** "Build Lasting Spiritual Habits"
**Subcaption:** "30 days. One verse at a time."
**Screen shown:** JourneyScreen in-progress state (calendar grid, streak counter, progress bar)
**Background:** Soft purple gradient (`#F0EBFF` → `#E8E0FF`)

**Why second:** The journey is the stickiest feature and the strongest differentiator. Shows progress/gamification which drives downloads.

---

### Screenshot 3: EXAM MODE

**Caption:** "Exam Stress? Allah Has Your Back"
**Subcaption:** "Built for Muslim students"
**Screen shown:** ExamModeScreen with a verse result displayed (Arabic + English + motivational note)
**Background:** Warm gold gradient (`#FFF8F0` → `#F5E6D0`)

**Why third:** Targets the student niche — a viewer who sees this knows the app is made for them. No competitor has this.

---

### Screenshot 4: VERSE DISPLAY

**Caption:** "Beautiful Verses, Deeper Meaning"
**Subcaption:** "AI-powered Tafsir included"
**Screen shown:** UnifiedGuidanceDisplay showing a verse with Arabic text, translation, and AI insight expanded
**Background:** Cream gradient (`#F3F2E3` → `#EDE8D0`)

**Why fourth:** Showcases the core content experience. Arabic calligraphy is visually striking. AI insight badge catches the eye.

---

### Screenshot 5: SHAREABLE CARDS

**Caption:** "Share Faith Beautifully"
**Subcaption:** "Instagram & WhatsApp ready"
**Screen shown:** TemplateSelectorModal or a completed share card in the "vibrant" template
**Background:** Soft teal gradient (`#F0FFF8` → `#E0F5EE`)

**Why fifth:** Social sharing drives viral growth. Shows the app creates beautiful content, not just displays it.

---

### Screenshot 6: AUDIO RECITATION

**Caption:** "Listen to the Words of Allah"
**Subcaption:** "3 world-renowned reciters"
**Screen shown:** Verse display with AudioPlayer expanded, showing reciter selection
**Background:** Deep navy gradient (`#1A1A2E` → `#16213E`) — dark mode showcase

**Why sixth:** Audio is a major feature users search for. Also showcases dark mode as a bonus.

---

### Screenshot 7: 99 NAMES OF ALLAH

**Caption:** "Discover His Beautiful Names"
**Subcaption:** "A new name every day"
**Screen shown:** HomeScreen showing the daily Name of Allah card expanded (Arabic, meaning, description)
**Background:** Teal gradient (`#E8FFF5` → `#D0F0E8`)

**Why seventh:** 99 Names is a high-search keyword. Shows content depth beyond verses.

---

### Screenshot 8: FEATURES OVERVIEW

**Caption:** "Everything You Need. Always Free."
**Subcaption:** "No ads. No subscriptions."
**Screen shown:** Composite/collage showing: notification example, settings screen, history calendar, onboarding
**Background:** White with subtle pattern (`#FAFAF5`)

**Why last:** Reinforces the free aspect and shows breadth. Catches anyone who scrolled this far with the "free" message.

---

## Screenshot Production Workflow

### Option A: Figma (Recommended)
1. Use [Figma App Store Screenshot Template](https://www.figma.com/community) — search "app store screenshots"
2. Import actual app screenshots via Expo (take screenshots on simulator)
3. Apply device frames, captions, backgrounds per spec above
4. Export at required resolutions

### Option B: screenshots.pro
1. Upload raw screenshots
2. Apply device frames and captions
3. Export all sizes automatically
4. ~$20/month, fastest option

### Option C: LaunchMatic / AppLaunchpad
1. Upload screenshots
2. Use their layout builder
3. AI-assisted caption placement
4. Exports all required sizes

### Taking Raw Screenshots
```bash
# iOS Simulator (from Xcode)
# 1. Run the app on iPhone 15 Pro Max simulator
# 2. Cmd+S to save screenshot
# 3. Screenshots save to Desktop

# Android Emulator
# 1. Run on Pixel 7 Pro emulator
# 2. Ctrl+S or use the camera icon in emulator toolbar
```

**Pro tips:**
- Use real data, not placeholder content
- Show actual Arabic text (Amiri font renders beautifully)
- Capture in both light and dark mode (use dark mode for 1-2 screenshots)
- Ensure the status bar shows full signal/wifi/battery
- Time should be 9:41 AM (Apple convention) or 10:08 (Google)

---

## Feature Graphic (Google Play)

**Size:** 1024 x 500
**Layout:**
- Left side: App icon (large) + "Noor Daily" wordmark
- Center: Tagline "Your Daily Islamic Companion"
- Right side: Subtle crescent moon + geometric pattern
- Background: Cream-to-gold gradient
- Include small text: "Quran | Hadith | Journey | Exam Mode"

---

## iPad Screenshots (If Supporting Tablet)

Same sequence as phone, but:
- Use iPad Air/Pro frames
- Layouts show more content (larger calendar grids, more cards visible)
- May combine 2 features per screenshot due to larger canvas
- Reduce to 5 screenshots (hero, journey, exam, verse, features)
