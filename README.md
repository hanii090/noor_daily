# 🌙 Noor Daily

**Daily spiritual guidance from the Quran and Hadith, beautifully designed for modern life.**

<div align="center">
  
[![React Native](https://img.shields.io/badge/React%20Native-0.81-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-~54.0-000020.svg)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

[Features](#-features) • [Screenshots](#-screenshots) • [Installation](#-installation) • [Tech Stack](#-tech-stack) • [Architecture](#-architecture)

</div>

---

## ✨ Features

### 📿 Spiritual Content
- **Mood-Based Guidance**: Select your current mood and receive relevant verses or hadiths
- **Daily Verse/Hadith**: Automatically curated content that changes daily
- **Multi-Language Support**: English, Arabic, Urdu, and Turkish translations
- **Audio Recitations**: Listen to Quranic verses with authentic recitations
- **AI-Powered Insights**: Get contextual reflections and personalized guidance

### 🔔 Smart Notifications
- **Customizable Schedule**: 1-4 notifications per day at random times
- **Quiet Hours**: Set do-not-disturb periods
- **Weekend Mode**: Reduce notifications on weekends
- **Interactive Actions**: Bookmark directly from notifications
- **Deep Linking**: Tap notification to view specific content

### 💾 Personal Library
- **Favorites**: Save verses and hadiths for quick access
- **History Tracking**: Review previously viewed content
- **Streak Counter**: Track your daily engagement
- **Smart Cleanup**: Auto-prune history after 90 days

### 🎨 Beautiful Design
- **Clubhouse-Inspired UI**: Warm cream and beige color palette
- **Glass Morphism**: Modern glassmorphic card designs
- **Dark Mode**: Full dark theme support
- **Floating Tab Bar**: Minimalist navigation
- **Smooth Animations**: Polished transitions and interactions

### 🔐 Privacy & Security
- **Secure AI Proxy**: API keys protected via Firebase Cloud Functions
- **Rate Limiting**: 10 requests per IP per minute
- **No Analytics Tracking**: Your spiritual journey stays private
- **Offline First**: Core features work without internet

---

## 📱 Screenshots

<div align="center">

### Home & Mood Selection
<img src="./assets/docs/home-screen.png" width="250" alt="Home Screen"/> <img src="./assets/docs/mood-selector.png" width="250" alt="Mood Selector"/> <img src="./assets/docs/verse-display.png" width="250" alt="Verse Display"/>

### Content & Features
<img src="./assets/docs/hadith-view.png" width="250" alt="Hadith View"/> <img src="./assets/docs/favorites.png" width="250" alt="Favorites"/> <img src="./assets/docs/history.png" width="250" alt="History"/>

### Settings & Customization
<img src="./assets/docs/settings.png" width="250" alt="Settings"/> <img src="./assets/docs/notifications.png" width="250" alt="Notifications"/> <img src="./assets/docs/dark-mode.png" width="250" alt="Dark Mode"/>

</div>

---

## 🚀 Installation

### Prerequisites
- Node.js 20+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Studio

### Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/noor-daily.git
cd noor-daily

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Start the development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

### Firebase Setup (Optional - for AI features)

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy Cloud Functions
cd functions
npm install
cd ..
firebase deploy --only functions
```

See [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) for detailed instructions.

---

## 🛠 Tech Stack

### Core
- **React Native** 0.81 - Cross-platform mobile framework
- **Expo** ~54.0 - Development and build tooling
- **TypeScript** 5.9 - Type-safe development
- **Zustand** - Lightweight state management

### UI/UX
- **React Navigation** 7.x - Navigation and routing
- **Expo Linear Gradient** - Beautiful gradients
- **Expo Blur** - Glassmorphic effects
- **React Native Reanimated** - Smooth animations
- **Custom Fonts** - Amiri, Inter, Philosopher

### Features
- **Expo Notifications** - Local push notifications
- **AsyncStorage** - Persistent local storage
- **Expo AV** - Audio playback for recitations
- **Expo Sharing** - Share verses as images or text
- **React Native View Shot** - Capture verse cards

### Backend & APIs
- **Firebase Cloud Functions** - Secure AI proxy
- **Together AI** - AI-powered spiritual insights
- **Quran API** - Verse data and translations
- **Axios** - HTTP client with retry logic

### Internationalization
- **react-i18next** - Multi-language support
- **i18next** - Translation framework

### Development
- **ESLint** - Code quality
- **TypeScript ESLint** - Type-aware linting
- **Firebase Tools** - Cloud function deployment

---

## 🏗 Architecture

### Project Structure
```
noor-daily/
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── clubhouse/     # Clubhouse-style components
│   │   ├── common/        # Shared components
│   │   └── glass/         # Glassmorphic components
│   ├── screens/           # Main app screens
│   ├── navigation/        # Navigation configuration
│   ├── services/          # Business logic & API clients
│   │   ├── aiService.ts
│   │   ├── quranApiService.ts
│   │   ├── notificationService.ts
│   │   └── ...
│   ├── store/             # Zustand state management
│   ├── theme/             # Design tokens & theming
│   ├── i18n/              # Translations
│   ├── types/             # TypeScript definitions
│   └── utils/             # Helper functions
├── functions/             # Firebase Cloud Functions
│   └── src/
│       └── index.ts       # AI proxy endpoint
├── assets/                # Images, fonts, patterns
└── legal/                 # Privacy policy & terms
```

### Key Services

**Verse Service** ([verseService.ts](./src/services/verseService.ts))
- Mood-based verse selection
- Daily verse rotation
- Verse preloading for offline use

**Notification Service** ([notificationService.ts](./src/services/notificationService.ts))
- Smart scheduling (28 notifications for 7 days)
- Quiet hours and weekend mode
- No API calls during scheduling (60-150x faster)

**History Service** ([historyService.ts](./src/services/historyService.ts))
- Daily entry tracking
- Streak calculation
- Auto-cleanup after 90 days

**AI Service** ([aiService.ts](./src/services/aiService.ts))
- Secure proxy to Together AI
- Personalized spiritual guidance
- Daily reflections

### State Management

Using **Zustand** for simple, performant state:
- Settings (notifications, language, dark mode)
- Favorites (verses and hadiths)
- History tracking
- Daily inspiration cache

### Caching Strategy

**Multi-layer caching**:
1. **Memory cache** - Fast access to recently viewed content
2. **AsyncStorage** - Persistent cache for offline use
3. **API cache** - HTTP cache headers respected
4. **Preloading** - Popular verses loaded at startup

---

## 🔧 Configuration

### Environment Variables

```bash
# .env
EXPO_PUBLIC_AI_PROXY_URL=https://us-central1-YOUR_PROJECT.cloudfunctions.net/aiProxy

# For local development only (never commit)
TOGETHER_AI_API_KEY=your_key_here
```

### Notification Settings

Configure in [app.json](./app.json):
```json
{
  "notification": {
    "icon": "./assets/icon.png",
    "color": "#8B5CF6",
    "androidMode": "default"
  }
}
```

### Translation Editions

Quran API editions by language (in [quranApiService.ts](./src/services/quranApiService.ts)):
```typescript
en: 'en.sahih'       // Sahih International
ar: 'ar.alafasy'     // Arabic - Alafasy
ur: 'ur.ahmedali'    // Urdu - Ahmed Ali
tr: 'tr.diyanet'     // Turkish - Diyanet
```

---

## 🎯 Key Features Implementation

### Notification Deep Linking
Tapping a notification loads the specific verse/hadith mentioned in the notification, not just daily content.

### Performance Optimization
- **Notification scheduling**: 60-150x faster by removing API calls
- **Lazy loading**: Components load on demand
- **Image optimization**: Compressed assets
- **Memoization**: React.memo for expensive renders

### Security
- **API Key Protection**: Cloud Functions proxy
- **Rate Limiting**: 10 req/min per IP
- **Input Validation**: Sanitized user inputs
- **No PII Collection**: Privacy-first design

---

## 📊 Performance Metrics

| Metric | Value |
|--------|-------|
| App Size | ~45 MB (iOS) / ~35 MB (Android) |
| Cold Start | < 2 seconds |
| Notification Scheduling | 2-5 seconds (28 notifications) |
| Verse Load Time | < 500ms (cached) / < 2s (API) |
| Memory Usage | ~80 MB average |

---

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Type checking
npx tsc --noEmit

# Linting
npm run lint

# Format code
npm run format
```

---

## 📦 Building for Production

### iOS
```bash
# Build with EAS
eas build --platform ios

# Or local build
expo prebuild
cd ios && pod install && cd ..
npx react-native run-ios --configuration Release
```

### Android
```bash
# Build with EAS
eas build --platform android

# Or local build
expo prebuild
npx react-native run-android --variant=release
```

---

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style
- TypeScript strict mode
- ESLint + Prettier
- Meaningful variable names
- Document complex logic

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Quran API** - Verse data and translations
- **Together AI** - AI-powered insights
- **Expo Team** - Amazing development tools
- **Islamic Scholars** - Hadith collections and interpretations

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/noor-daily/issues)
- **Email**: support@noordaily.app
- **Docs**: [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)

---

## 🗺 Roadmap

- [ ] Widget support (iOS 14+, Android 12+)
- [ ] Apple Watch companion app
- [ ] Community sharing features
- [ ] Advanced search and filtering
- [ ] Tafsir (commentary) integration
- [ ] Prayer time reminders
- [ ] Qibla direction finder

---

<div align="center">

**Made with ❤️ for the Muslim community**

⭐ Star this repo if Noor Daily brings peace to your day

</div>
