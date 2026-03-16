# Whozin Logo Spec

## Current Logo Direction

The current product implies a brand mark with two parts:

- a rounded-square gradient tile
- a bold white `W` glyph

This appears in the welcome flow and PWA assets and is the current implementation reference in the codebase today.

## Recommended System

### 1. Primary Logo

Use:

- gradient rounded-square icon
- white `W` glyph
- optional wordmark `Whozin`

Best for:

- marketing hero
- app store and social assets
- splash contexts
- pitch deck title slides

### 2. Icon-Only Mark

Use:

- gradient tile plus white glyph only
- specifically the white `W` mark

Best for:

- favicon
- app icon exploration
- social avatar
- compact navigation placements

### 3. Wordmark

Use:

- `Whozin` in bold sans-serif
- clean title case
- high contrast on dark backgrounds

Best for:

- deck headers
- website nav
- lockups with the icon

## Construction

### Icon Tile

- shape: rounded square
- preferred radius: `24px`
- background: pink to purple gradient
- foreground glyph: white
- feel: sharp, energetic, premium

Recommended gradient:

```css
linear-gradient(135deg, #ec4899, #9333ea)
```

Alternate production-safe gradient:

```css
linear-gradient(135deg, #db2777, #9333ea)
```

### Glyph

Recommended behavior:

- centered
- large enough to read at small sizes
- simple silhouette
- no outline treatment

The glyph should feel direct, confident, and easy to recognize in compact app-icon contexts. It should read as Whozin first, not as a generic nightlife symbol.

## Clear Space

Minimum clear space:

- use at least `0.5x` the tile width on all sides

For icon-plus-wordmark lockups:

- keep at least one glyph width between icon and wordmark

## Minimum Sizes

- icon only digital minimum: `20px`
- icon plus wordmark minimum: `96px` total width
- preferred favicon/app-icon design source: start from `1024px`

## Color Versions

### Preferred

- gradient tile
- white `W` glyph

### One-Color Dark

- white `W` glyph on black or near-black tile

### One-Color Light

- black `W` glyph on white tile

Use one-color versions only when gradients are impractical.

## Background Rules

Best backgrounds:

- black
- zinc 900
- subtle gradient atmospheres
- low-noise photography

Avoid:

- busy poster artwork directly behind the mark
- low-contrast midtone backgrounds
- warm beige or pastel contexts

## Do And Don't

Do:

- keep the mark bold and simple
- preserve generous corner radius
- use white `W` glyph over saturated tile
- pair with strong sans typography

Don't:

- add bevels, chrome, or 3D effects
- stretch the icon
- use more than one accent gradient in the same mark
- add thin outlines around the glyph

## Interim Implementation Note

Current implementation references:

- reusable in-app mark: [`/C:/Users/jvinc/Desktop/Whozin/src/app/components/WhozinLogo.tsx`](C:\Users\jvinc\Desktop\Whozin\src\app\components\WhozinLogo.tsx)
- welcome surface usage: [`/C:/Users/jvinc/Desktop/Whozin/src/app/pages/Welcome.tsx`](C:\Users\jvinc\Desktop\Whozin\src\app\pages\Welcome.tsx)
- PWA/app icon assets: [`/C:/Users/jvinc/Desktop/Whozin/public/icon-192.svg`](C:\Users\jvinc\Desktop\Whozin\public\icon-192.svg), [`/C:/Users/jvinc/Desktop/Whozin/public/icon-512.svg`](C:\Users\jvinc\Desktop\Whozin\public\icon-512.svg), and [`/C:/Users/jvinc/Desktop/Whozin/public/apple-touch-icon.png`](C:\Users\jvinc\Desktop\Whozin\public\apple-touch-icon.png)
