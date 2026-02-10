# ProGuard rules for Noor Daily production builds

# React Native Reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Expo AV (Audio playback)
-keep class expo.modules.av.** { *; }
-keep class com.google.android.exoplayer2.** { *; }

# Expo Notifications
-keep class expo.modules.notifications.** { *; }
-keep class com.google.firebase.messaging.** { *; }

# React Native ViewShot
-keep class fr.greweb.reactnativeviewshot.** { *; }

# Hermes
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }

# Expo MediaLibrary
-keep class expo.modules.medialibrary.** { *; }

# Expo FileSystem
-keep class expo.modules.filesystem.** { *; }

# Expo Sharing
-keep class expo.modules.sharing.** { *; }

# AsyncStorage
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# Expo Font
-keep class expo.modules.font.** { *; }

# React Native Safe Area Context
-keep class com.th3rdwave.safeareacontext.** { *; }

# React Native Screens
-keep class com.swmansion.rnscreens.** { *; }

# Generic React Native
-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep,allowobfuscation @interface com.facebook.proguard.annotations.KeepGettersAndSetters
-keep,allowobfuscation @interface com.facebook.common.internal.DoNotStrip

-keep @com.facebook.proguard.annotations.DoNotStrip class *
-keep @com.facebook.common.internal.DoNotStrip class *
-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
    @com.facebook.common.internal.DoNotStrip *;
}

-keepclassmembers @com.facebook.proguard.annotations.KeepGettersAndSetters class * {
    void set*(***);
    *** get*();
}
