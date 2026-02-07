export const lightColors = {
  // Clubhouse cream/beige palette
  cream: '#F3F2E3',
  creamLight: '#FFFDF7',
  beige: '#EDE8D0',
  tan: '#E3D4AD',
  
  background: '#FFFDF7',
  backgroundSecondary: '#F3F2E3',
  
  // Text hierarchy
  text: '#2B2A27',
  textSecondary: '#6B6A65',
  textTertiary: '#9B9A95',
  
  // Vibrant accents
  green: '#4DB579',
  purple: '#7A5BE6',
  coral: '#FF6B6B',
  orange: '#FBB81B',
  teal: '#00D38C',
  
  // UI elements
  border: 'rgba(0, 0, 0, 0.08)',
  shadow: 'rgba(0, 0, 0, 0.1)',
  overlay: 'rgba(0, 0, 0, 0.4)',
  white: '#FFFFFF',
  black: '#000000',
  
  // Mood colors
  moods: {
    grateful: '#FBB81B',
    peace: '#4DB579',
    strength: '#7A5BE6',
    guidance: '#00D38C',
    celebrating: '#FF6B6B',
  },
} as const;

export const darkColors = {
  // Dark cream/beige palette - inverted
  cream: '#1A1A1A',
  creamLight: '#0F0F0F',
  beige: '#212121',
  tan: '#2C2C2C',
  
  background: '#0F0F0F',
  backgroundSecondary: '#1A1A1A',
  
  // Text hierarchy - light text on dark bg
  text: '#E5E5E5',
  textSecondary: '#A0A0A0',
  textTertiary: '#6B6B6B',
  
  // Vibrant accents - slightly muted for dark mode
  green: '#3DA466',
  purple: '#6A4BD6',
  coral: '#E55B5B',
  orange: '#EAA70B',
  teal: '#00C27C',
  
  // UI elements
  border: 'rgba(255, 255, 255, 0.1)',
  shadow: 'rgba(0, 0, 0, 0.3)',
  overlay: 'rgba(0, 0, 0, 0.6)',
  white: '#FFFFFF',
  black: '#000000',
  
  // Mood colors - same vibrant accents
  moods: {
    grateful: '#EAA70B',
    peace: '#3DA466',
    strength: '#6A4BD6',
    guidance: '#00C27C',
    celebrating: '#E55B5B',
  },
} as const;

// Legacy export for backwards compatibility
export const colors = lightColors;

export type MoodColor = keyof typeof lightColors.moods;
