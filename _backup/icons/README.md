# PWA Icons

This directory should contain PWA icons in various sizes.

## Required Icon Sizes

- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

## How to Generate Icons

### Option 1: Use PWA Asset Generator

```bash
npx @vite-pwa/assets-generator --preset minimal public/icon-source.png
```

### Option 2: Use Online Tool

1. Visit https://realfavicongenerator.net/
2. Upload your source icon (at least 512x512px)
3. Download the generated package
4. Extract icons to this directory

### Option 3: Manual Creation with ImageMagick

```bash
# Install ImageMagick first
# brew install imagemagick (macOS)
# apt-get install imagemagick (Ubuntu)

# Then run:
convert icon-source.png -resize 72x72 icon-72x72.png
convert icon-source.png -resize 96x96 icon-96x96.png
convert icon-source.png -resize 128x128 icon-128x128.png
convert icon-source.png -resize 144x144 icon-144x144.png
convert icon-source.png -resize 152x152 icon-152x152.png
convert icon-source.png -resize 192x192 icon-192x192.png
convert icon-source.png -resize 384x384 icon-384x384.png
convert icon-source.png -resize 512x512 icon-512x512.png
```

## Temporary Solution

For now, create a simple SVG icon and convert it to PNG, or use the barcode scanner icon from Material Icons.

The app will work without icons, but won't be installable as a PWA until icons are added.
