const fs = require('fs');
const path = require('path');

// Icon sizes needed for PWA
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Create placeholder icons using SVG
const createSVGIcon = (size) => {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" fill="#4a90e2"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.4}" font-weight="bold" 
        text-anchor="middle" dominant-baseline="middle" fill="white">JB</text>
</svg>`;
};

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, 'src', 'assets', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate placeholder icons
sizes.forEach(size => {
  const svgContent = createSVGIcon(size);
  const filename = `icon-${size}x${size}.svg`;
  const filepath = path.join(iconsDir, filename);
  
  fs.writeFileSync(filepath, svgContent);
  console.log(`✅ Created ${filename}`);
});

// Create placeholder screenshots
const createScreenshot = (width, height, name) => {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect width="${width}" height="${height}" fill="#f5f5f5"/>
  <rect x="0" y="0" width="${width}" height="60" fill="#4a90e2"/>
  <text x="20" y="38" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="white">Jayant Bhardwaj</text>
  <text x="${width/2}" y="${height/2}" font-family="Arial, sans-serif" font-size="36" text-anchor="middle" fill="#666">Portfolio Screenshot</text>
  <text x="${width/2}" y="${height/2 + 50}" font-family="Arial, sans-serif" font-size="18" text-anchor="middle" fill="#999">${name}</text>
</svg>`;
};

// Create screenshot placeholders
const screenshots = [
  { width: 540, height: 720, name: 'Mobile View' },
  { width: 1280, height: 720, name: 'Desktop View' }
];

screenshots.forEach(({ width, height, name }) => {
  const svgContent = createScreenshot(width, height, name);
  const filename = `screenshot-${name.toLowerCase().replace(' ', '-')}.svg`;
  const filepath = path.join(iconsDir, filename);
  
  fs.writeFileSync(filepath, svgContent);
  console.log(`✅ Created ${filename}`);
});

console.log('\n🎉 All placeholder icons created successfully!');
console.log('📝 Note: These are SVG placeholders. For production, replace with actual PNG images.');
console.log('💡 Tip: Use https://realfavicongenerator.net/ to generate production-ready icons.');
