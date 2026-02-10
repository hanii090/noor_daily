#!/bin/bash

# Production Build Test Script
# This script builds and tests the production APK to verify crash fixes

set -e

echo "🔨 Building production APK locally..."
echo "This will take several minutes..."

# Build the production APK using EAS
eas build --platform android --profile production --local

echo ""
echo "✅ Build complete!"
echo ""
echo "📱 To test the APK on a connected device:"
echo "1. Connect your Android device via USB"
echo "2. Enable USB debugging on the device"
echo "3. Run: adb install -r <path-to-apk>"
echo "4. Monitor logs: adb logcat | grep -E '(FATAL|AndroidRuntime|Noor)'"
echo ""
echo "🔍 Watch for crashes and check that:"
echo "  - App launches successfully"
echo "  - Fonts load correctly"
echo "  - AI features work"
echo "  - Notifications can be scheduled"
echo "  - Image sharing works"
echo "  - Audio playback works"
