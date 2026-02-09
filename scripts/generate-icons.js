const sharp = require('sharp');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '..', 'assets');

// Brand colors
const CREAM = '#F3F2E3';
const PURPLE = '#8B5CF6';
const PURPLE_DARK = '#6D28D9';
const GOLD = '#D4A853';
const GOLD_LIGHT = '#E8C97A';
const TEAL = '#2DD4BF';
const WHITE = '#FFFFFF';
const DARK_BG = '#1A1A2E';

function createIconSVG(size, isAdaptive = false) {
  // For adaptive icon, content should be centered in the safe zone (66% of total)
  // The outer 17% on each side may be cropped
  const padding = isAdaptive ? size * 0.2 : size * 0.05;
  const centerX = size / 2;
  const centerY = size / 2;
  const contentSize = size - (padding * 2);
  
  // Background gradient circle (for non-adaptive) or full bg (for adaptive)
  const bgRadius = size / 2;
  
  // Crescent moon parameters
  const moonRadius = contentSize * 0.30;
  const moonOffsetX = contentSize * 0.08;
  const moonCenterX = centerX - contentSize * 0.02;
  const moonCenterY = centerY - contentSize * 0.05;
  
  // Star parameters
  const starCenterX = moonCenterX + moonRadius * 0.7;
  const starCenterY = moonCenterY - moonRadius * 0.3;
  const starSize = contentSize * 0.08;
  
  // Generate 8-point star path
  const starPoints = [];
  for (let i = 0; i < 16; i++) {
    const angle = (i * Math.PI * 2) / 16 - Math.PI / 2;
    const r = i % 2 === 0 ? starSize : starSize * 0.45;
    starPoints.push(`${starCenterX + r * Math.cos(angle)},${starCenterY + r * Math.sin(angle)}`);
  }
  const starPath = `M ${starPoints.join(' L ')} Z`;
  
  // Decorative dots around the crescent
  const dots = [];
  for (let i = 0; i < 5; i++) {
    const angle = (-Math.PI * 0.3) + (i * Math.PI * 0.25);
    const dist = moonRadius * 1.5 + (i % 2) * contentSize * 0.04;
    const dx = moonCenterX + dist * Math.cos(angle);
    const dy = moonCenterY + dist * Math.sin(angle);
    const dotR = contentSize * (0.008 + (i % 3) * 0.004);
    dots.push(`<circle cx="${dx}" cy="${dy}" r="${dotR}" fill="${GOLD_LIGHT}" opacity="0.7"/>`);
  }
  
  // "Noor" text at bottom
  const textY = centerY + contentSize * 0.35;
  const fontSize = contentSize * 0.13;
  const subtitleFontSize = contentSize * 0.055;
  
  // Outer decorative ring
  const ringRadius = contentSize * 0.44;
  const ringStroke = contentSize * 0.006;
  
  // Inner glow circle
  const glowRadius = contentSize * 0.46;

  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Main gradient -->
    <radialGradient id="bgGrad" cx="40%" cy="35%" r="70%">
      <stop offset="0%" stop-color="#7C3AED"/>
      <stop offset="45%" stop-color="${PURPLE_DARK}"/>
      <stop offset="100%" stop-color="#4C1D95"/>
    </radialGradient>
    
    <!-- Gold gradient for crescent -->
    <linearGradient id="moonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${GOLD_LIGHT}"/>
      <stop offset="50%" stop-color="${GOLD}"/>
      <stop offset="100%" stop-color="#C4943D"/>
    </linearGradient>
    
    <!-- Subtle inner shadow -->
    <radialGradient id="innerGlow" cx="40%" cy="35%" r="60%">
      <stop offset="0%" stop-color="${WHITE}" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="${WHITE}" stop-opacity="0"/>
    </radialGradient>
    
    <!-- Moon shadow -->
    <filter id="moonShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000000" flood-opacity="0.3"/>
    </filter>
    
    <!-- Text shadow -->
    <filter id="textShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="#000000" flood-opacity="0.4"/>
    </filter>
    
    <!-- Star glow -->
    <filter id="starGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    
    <!-- Clip for rounded square (iOS style) -->
    ${!isAdaptive ? `<clipPath id="roundedSquare">
      <rect x="0" y="0" width="${size}" height="${size}" rx="${size * 0.22}" ry="${size * 0.22}"/>
    </clipPath>` : ''}
  </defs>
  
  <!-- Background -->
  ${isAdaptive 
    ? `<rect width="${size}" height="${size}" fill="url(#bgGrad)"/>`
    : `<rect width="${size}" height="${size}" fill="url(#bgGrad)" clip-path="url(#roundedSquare)"/>`
  }
  
  <!-- Inner glow overlay -->
  ${isAdaptive
    ? `<rect width="${size}" height="${size}" fill="url(#innerGlow)"/>`
    : `<rect width="${size}" height="${size}" fill="url(#innerGlow)" clip-path="url(#roundedSquare)"/>`
  }
  
  <!-- Subtle geometric pattern (Islamic-inspired) -->
  <g opacity="0.06">
    ${Array.from({length: 6}, (_, i) => {
      const angle = (i * Math.PI * 2) / 6;
      const r = contentSize * 0.48;
      const x1 = centerX + r * Math.cos(angle);
      const y1 = centerY + r * Math.sin(angle);
      const x2 = centerX + r * Math.cos(angle + Math.PI / 3);
      const y2 = centerY + r * Math.sin(angle + Math.PI / 3);
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${WHITE}" stroke-width="1"/>`;
    }).join('\n    ')}
  </g>
  
  <!-- Decorative ring -->
  <circle cx="${centerX}" cy="${centerY}" r="${ringRadius}" fill="none" stroke="${GOLD}" stroke-width="${ringStroke}" opacity="0.2"/>
  <circle cx="${centerX}" cy="${centerY}" r="${ringRadius * 0.97}" fill="none" stroke="${GOLD_LIGHT}" stroke-width="${ringStroke * 0.5}" opacity="0.1"/>
  
  <!-- Crescent Moon -->
  <g filter="url(#moonShadow)">
    <!-- Outer circle of crescent -->
    <circle cx="${moonCenterX}" cy="${moonCenterY}" r="${moonRadius}" fill="url(#moonGrad)"/>
    <!-- Inner circle cutout to create crescent shape -->
    <circle cx="${moonCenterX + moonOffsetX}" cy="${moonCenterY - moonOffsetX * 0.3}" r="${moonRadius * 0.78}" fill="url(#bgGrad)"/>
    <!-- Re-apply inner glow on cutout -->
    <circle cx="${moonCenterX + moonOffsetX}" cy="${moonCenterY - moonOffsetX * 0.3}" r="${moonRadius * 0.78}" fill="url(#innerGlow)"/>
  </g>
  
  <!-- Star -->
  <g filter="url(#starGlow)">
    <path d="${starPath}" fill="${GOLD_LIGHT}"/>
  </g>
  
  <!-- Small decorative dots -->
  ${dots.join('\n  ')}
  
  <!-- App name "نور" (Noor in Arabic) -->
  <text x="${centerX}" y="${textY}" 
    font-family="serif" 
    font-size="${fontSize}" 
    font-weight="bold" 
    fill="${WHITE}" 
    text-anchor="middle" 
    filter="url(#textShadow)"
    letter-spacing="2">NOOR</text>
  
  <!-- Subtitle -->
  <text x="${centerX}" y="${textY + subtitleFontSize * 1.6}" 
    font-family="sans-serif" 
    font-size="${subtitleFontSize}" 
    fill="${GOLD_LIGHT}" 
    text-anchor="middle"
    opacity="0.9"
    letter-spacing="4">DAILY</text>
</svg>`;

  return svg;
}

function createSplashSVG(size) {
  const centerX = size / 2;
  const centerY = size / 2;
  const moonRadius = size * 0.25;
  const moonOffsetX = size * 0.06;
  const moonCenterX = centerX - size * 0.01;
  const moonCenterY = centerY - size * 0.08;
  
  const starCenterX = moonCenterX + moonRadius * 0.7;
  const starCenterY = moonCenterY - moonRadius * 0.3;
  const starSize = size * 0.06;
  
  const starPoints = [];
  for (let i = 0; i < 16; i++) {
    const angle = (i * Math.PI * 2) / 16 - Math.PI / 2;
    const r = i % 2 === 0 ? starSize : starSize * 0.45;
    starPoints.push(`${starCenterX + r * Math.cos(angle)},${starCenterY + r * Math.sin(angle)}`);
  }
  const starPath = `M ${starPoints.join(' L ')} Z`;

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="moonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${GOLD_LIGHT}"/>
      <stop offset="50%" stop-color="${GOLD}"/>
      <stop offset="100%" stop-color="#C4943D"/>
    </linearGradient>
    <filter id="moonShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#6D28D9" flood-opacity="0.3"/>
    </filter>
    <filter id="starGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  
  <!-- Transparent background -->
  <rect width="${size}" height="${size}" fill="none"/>
  
  <!-- Crescent -->
  <g filter="url(#moonShadow)">
    <circle cx="${moonCenterX}" cy="${moonCenterY}" r="${moonRadius}" fill="url(#moonGrad)"/>
    <circle cx="${moonCenterX + moonOffsetX}" cy="${moonCenterY - moonOffsetX * 0.3}" r="${moonRadius * 0.78}" fill="${CREAM}"/>
  </g>
  
  <!-- Star -->
  <g filter="url(#starGlow)">
    <path d="${starPath}" fill="${GOLD}"/>
  </g>
  
  <!-- Text -->
  <text x="${centerX}" y="${centerY + size * 0.28}" 
    font-family="serif" font-size="${size * 0.1}" font-weight="bold" 
    fill="${PURPLE_DARK}" text-anchor="middle" letter-spacing="3">NOOR</text>
  <text x="${centerX}" y="${centerY + size * 0.35}" 
    font-family="sans-serif" font-size="${size * 0.04}" 
    fill="${GOLD}" text-anchor="middle" letter-spacing="5" opacity="0.8">DAILY</text>
</svg>`;
}

async function generateIcons() {
  console.log('🎨 Generating Noor Daily app icons...\n');

  // 1. Main icon (1024x1024) - iOS App Store
  const iconSVG = createIconSVG(1024, false);
  await sharp(Buffer.from(iconSVG))
    .resize(1024, 1024)
    .png({ quality: 100 })
    .toFile(path.join(ASSETS_DIR, 'icon.png'));
  console.log('✅ icon.png (1024x1024) — iOS App Store icon');

  // 2. Adaptive icon foreground (1024x1024) - Android
  const adaptiveSVG = createIconSVG(1024, true);
  await sharp(Buffer.from(adaptiveSVG))
    .resize(1024, 1024)
    .png({ quality: 100 })
    .toFile(path.join(ASSETS_DIR, 'adaptive-icon.png'));
  console.log('✅ adaptive-icon.png (1024x1024) — Android adaptive icon foreground');

  // 3. Splash icon (400x400)
  const splashSVG = createSplashSVG(400);
  await sharp(Buffer.from(splashSVG))
    .resize(400, 400)
    .png({ quality: 100 })
    .toFile(path.join(ASSETS_DIR, 'splash-icon.png'));
  console.log('✅ splash-icon.png (400x400) — Splash screen icon');

  // 4. Favicon (48x48)
  const faviconSVG = createIconSVG(512, false);
  await sharp(Buffer.from(faviconSVG))
    .resize(48, 48)
    .png({ quality: 100 })
    .toFile(path.join(ASSETS_DIR, 'favicon.png'));
  console.log('✅ favicon.png (48x48) — Web favicon');

  // 5. Notification icon (96x96, white on transparent for Android)
  const notifSize = 96;
  const notifSVG = `<svg width="${notifSize}" height="${notifSize}" viewBox="0 0 ${notifSize} ${notifSize}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${notifSize}" height="${notifSize}" fill="none"/>
    <circle cx="${notifSize/2 - 2}" cy="${notifSize/2 - 4}" r="${notifSize * 0.3}" fill="white"/>
    <circle cx="${notifSize/2 + 5}" cy="${notifSize/2 - 6}" r="${notifSize * 0.23}" fill="none"/>
    <circle cx="${notifSize/2 - 2}" cy="${notifSize/2 - 4}" r="${notifSize * 0.3}" fill="white"/>
    <circle cx="${notifSize/2 + 5}" cy="${notifSize/2 - 6}" r="${notifSize * 0.234}" fill="transparent"/>
    <rect x="${notifSize/2 + 5 - notifSize*0.234}" y="0" width="${notifSize*0.468}" height="${notifSize}" fill="transparent"/>
  </svg>`;
  
  // For notification, create a simple crescent
  const notifCrescent = `<svg width="96" height="96" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
    <rect width="96" height="96" fill="none"/>
    <circle cx="44" cy="42" r="28" fill="white"/>
    <circle cx="52" cy="40" r="22" fill="none" stroke="none"/>
    <text x="48" y="80" font-family="sans-serif" font-size="14" font-weight="bold" fill="white" text-anchor="middle" letter-spacing="1">NOOR</text>
  </svg>`;

  console.log('\n🎉 All icons generated successfully!');
  console.log('\nIcon specs:');
  console.log('  • icon.png: 1024×1024 (iOS App Store, no transparency)');
  console.log('  • adaptive-icon.png: 1024×1024 (Android foreground, purple bg)');
  console.log('  • splash-icon.png: 400×400 (splash screen, transparent bg)');
  console.log('  • favicon.png: 48×48 (web)');
  console.log('\nBackground color for Android adaptive icon: #F3F2E3 (set in app.json)');
}

generateIcons().catch(console.error);
