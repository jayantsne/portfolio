# PWA Icon Generator Guide

To generate all required PWA icons, you can use one of these methods:

## Method 1: Online Tools (Easiest)
1. Visit https://realfavicongenerator.net/ or https://www.pwabuilder.com/
2. Upload your logo (at least 512x512 px recommended)
3. Download the generated icons
4. Place them in `src/assets/icons/` folder

## Method 2: Using ImageMagick (Command Line)
If you have ImageMagick installed, run these commands:

```bash
# From your project root, with your source icon (logo.png)
convert logo.png -resize 72x72 src/assets/icons/icon-72x72.png
convert logo.png -resize 96x96 src/assets/icons/icon-96x96.png
convert logo.png -resize 128x128 src/assets/icons/icon-128x128.png
convert logo.png -resize 144x144 src/assets/icons/icon-144x144.png
convert logo.png -resize 152x152 src/assets/icons/icon-152x152.png
convert logo.png -resize 192x192 src/assets/icons/icon-192x192.png
convert logo.png -resize 384x384 src/assets/icons/icon-384x384.png
convert logo.png -resize 512x512 src/assets/icons/icon-512x512.png
```

## Method 3: Node.js Script
Install the package: `npm install sharp --save-dev`

Then create and run a script to generate all sizes from your source image.

## Required Icon Sizes:
- 72x72 (iOS)
- 96x96 (Android)
- 128x128 (Chrome)
- 144x144 (Windows)
- 152x152 (iOS)
- 192x192 (Android, Chrome)
- 384x384 (Android)
- 512x512 (Android, Chrome, iOS)

## Temporary Placeholder
For now, you can use placeholder icons. The app will work without them, but you should replace them with your actual logo.
