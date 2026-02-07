# Fix Critical App Issues

## Issue 1: Notification Deep-Link Bug

**Problem**: [notificationHandler.ts](file:///Users/rehan/Desktop/Code/noor_dail/noor-daily/src/services/notificationHandler.ts#L48) sets `type` to `'verse'` or `'hadith'`, but [HomeScreen.tsx](file:///Users/rehan/Desktop/Code/noor_dail/noor-daily/src/screens/HomeScreen.tsx#L55) checks for `'daily_verse'` or `'daily_hadith'`. Also, the handler stores the specific ID but HomeScreen loads daily content instead of the specific content.

**Files to modify**:
- `src/services/notificationHandler.ts` (lines 47-51)
- `src/screens/HomeScreen.tsx` (lines 50-85)

**Changes**:
1. In notificationHandler.ts: Change line 48 `type: data.type` to use proper format: `type: data.type === 'verse' ? 'daily_verse' : 'daily_hadith'`
2. In HomeScreen.tsx: Update content loading logic (lines 64-69) to:
   - Load specific content by ID: `await verseService.getVerseById(pendingNotification.id)` 
   - Or for hadith: `await hadithService.getHadithById(pendingNotification.id)`
   - Remove the getDailyVerse/getDailyHadith calls

## Issue 2: AI API Key Exposure

**Problem**: API key in [.env](file:///Users/rehan/Desktop/Code/noor_dail/noor-daily/.env#L1) is exposed to client bundle. AI calls in [aiService.ts](file:///Users/rehan/Desktop/Code/noor_dail/noor-daily/src/services/aiService.ts) send API key from client.

**Solution**: Create Firebase Cloud Function proxy

**New files to create**:
- `functions/src/index.ts` - Cloud function with rate limiting
- `functions/package.json` - Dependencies
- `functions/tsconfig.json` - TypeScript config
- `firebase.json` - Firebase config
- `.firebaserc` - Project config

**Files to modify**:
- `src/services/aiService.ts` - Point to cloud function endpoint
- `.env` - Add cloud function URL, remove API key
- `app.json` - Add environment variables

**Cloud Function Implementation**:
```typescript
// Rate limiting: 10 requests per IP per minute
// Authentication: Check app signature/token
// Proxy to Together AI with server-side API key
```

## Issue 3: History Retention Not Enforced

**Problem**: [historyService.ts](file:///Users/rehan/Desktop/Code/noor_dail/noor-daily/src/services/historyService.ts#L17) defines `MAX_HISTORY_DAYS = 90` but never uses it for cleanup.

**Files to modify**:
- `src/services/historyService.ts`

**Changes**:
1. Add new method `pruneOldHistory()` (after line 104):
```typescript
async pruneOldHistory(): Promise<void> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - MAX_HISTORY_DAYS);
  const cutoffKey = this.formatDateKey(cutoffDate);
  
  const keys = await AsyncStorage.getAllKeys();
  const historyKeys = keys.filter(key => key.startsWith(HISTORY_PREFIX));
  const oldKeys = historyKeys.filter(key => {
    const date = key.replace(HISTORY_PREFIX, '');
    return date < cutoffKey;
  });
  
  if (oldKeys.length > 0) {
    await AsyncStorage.multiRemove(oldKeys);
  }
}
```

2. Call `pruneOldHistory()` in `saveToHistory()` method (line 23) - add after line 54:
```typescript
// Prune old history periodically (1% chance each save)
if (Math.random() < 0.01) {
  this.pruneOldHistory().catch(console.error);
}
```

## Issue 4: Language Setting Not Wired

**Problem**: [SettingsScreen.tsx](file:///Users/rehan/Desktop/Code/noor_dail/noor-daily/src/screens/SettingsScreen.tsx#L152-156) lets users select language, but [quranApiService.ts](file:///Users/rehan/Desktop/Code/noor_dail/noor-daily/src/services/quranApiService.ts#L120) always uses `'en.sahih'` translation. UI strings are hard-coded.

**Solution**: Implement react-i18next

**New files to create**:
- `src/i18n/config.ts` - i18next configuration
- `src/i18n/locales/en.json` - English translations
- `src/i18n/locales/ar.json` - Arabic translations
- `src/i18n/locales/ur.json` - Urdu translations
- `src/i18n/locales/tr.json` - Turkish translations

**Files to modify**:
- `package.json` - Add `react-i18next` and `i18next`
- `App.tsx` - Initialize i18next
- `src/services/quranApiService.ts` - Use language from settings
- `src/store/appStore.ts` - Sync language changes with i18next
- `src/screens/SettingsScreen.tsx` - Connect language to i18next
- `src/screens/HomeScreen.tsx` - Replace hard-coded strings with `t()` function
- `src/components/MoodSelector.tsx` - Translate mood labels
- All other screen files - Replace hard-coded strings

**Translation mapping for Quran API**:
```typescript
const translationEditions = {
  en: 'en.sahih',
  ar: 'ar.alafasy', 
  ur: 'ur.ahmedali',
  tr: 'tr.diyanet'
}
```

**Changes in quranApiService.ts**:
- Update `getVerseWithTranslation` (line 103) to accept language parameter
- Get language from app settings store
- Use mapped edition instead of hard-coded 'en.sahih'

## Issue 5: Dark Mode Toggle Doesn't Work

**Problem**: [SettingsScreen.tsx](file:///Users/rehan/Desktop/Code/noor_dail/noor-daily/src/screens/SettingsScreen.tsx#L147-150) saves dark mode setting, but [colors.ts](file:///Users/rehan/Desktop/Code/noor_dail/noor-daily/src/theme/colors.ts) is static - no dynamic theme switching.

**Solution**: Create dynamic theme system

**Files to modify**:
- `src/theme/colors.ts` - Convert to function that returns light/dark colors
- `src/theme/index.ts` - Export theme hook
- All component files - Replace `colors` with `useTheme()` hook

**Implementation**:
```typescript
// colors.ts
export const getLightColors = () => ({ /* existing colors */ });
export const getDarkColors = () => ({
  cream: '#1A1A1A',
  creamLight: '#0F0F0F',
  background: '#0F0F0F',
  text: '#E5E5E5',
  // ... dark variants
});

export const useTheme = () => {
  const { settings } = useAppStore();
  return settings.darkMode ? getDarkColors() : getLightColors();
};
```

**Alternative**: If dark mode is not a priority, **remove the toggle** from SettingsScreen to avoid user confusion.

## Issue 6: Notification Scheduling Performance

**Problem**: [notificationService.ts](file:///Users/rehan/Desktop/Code/noor_dail/noor-daily/src/services/notificationService.ts#L163) calls `getContentForNotification()` which fetches full verse/hadith content from API/JSON during scheduling. This runs for each notification (up to 28 notifications for 7 days × 4 times/day).

**Files to modify**:
- `src/services/notificationService.ts` (lines 196-249)

**Changes**:
1. Modify `scheduleRandomDailyNotifications` to pre-select IDs only:
   - Before loop (line 134), select 28 random verse/hadith IDs from local data
   - Pass ID to notification data without fetching content
   - Store only preview text (first 45 chars from local JSON, not API)

2. Simplify `getContentForNotification` method (line 199):
```typescript
private getContentIdForNotification(
  preferredType: 'verse' | 'hadith' | 'both',
  sentIds: string[]
): { id: string, type: ContentType, preview: string } | null {
  // Pick type
  let type: ContentType = preferredType === 'both' 
    ? (Math.random() > 0.5 ? 'verse' : 'hadith') 
    : preferredType;
  
  // Get ID from local data (no API call)
  if (type === 'verse') {
    const refs = verseService.getAllVerseReferences();
    // Filter out sent IDs and pick random
    const available = refs.filter(r => !sentIds.includes(`${r.surah}:${r.verse}`));
    if (available.length === 0) return null;
    const ref = available[Math.floor(Math.random() * available.length)];
    return {
      id: `${ref.surah}:${ref.verse}`,
      type: 'verse',
      preview: 'Quran guidance awaits' // Generic preview
    };
  } else {
    // Similar for hadith - read from local JSON only
  }
}
```

3. Remove `await verseService.getVerseById()` and `await hadithService.getHadithById()` calls from scheduling
4. Content is fetched only when notification is tapped (in HomeScreen or notification handler)

## Summary of Impact

**Security**: API key moved to secure cloud function with rate limiting  
**Reliability**: Notification deep-links load correct content  
**Performance**: Scheduling 28 notifications takes seconds instead of minutes  
**Storage**: History auto-prunes after 90 days  
**UX**: Real i18n with 4 languages, functional dark mode (or removed toggle)

## Implementation Order

1. **Notification deep-link** (highest priority - broken feature)
2. **Notification scheduling performance** (impacts all users daily)
3. **AI API security** (security risk, but requires cloud function setup)
4. **History retention** (quick win, prevents storage bloat)
5. **Internationalization** (large effort, new dependency)
6. **Dark mode** (decide: implement or remove toggle)